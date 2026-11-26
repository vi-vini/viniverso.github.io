// Bancada da versão de teste do jogo Quatro Momentos.
//
// Abre a página (lab/ por padrão) num Chromium sem tela, coloca a câmera em pontos fixos do percurso
// (sondas.json), espera a cena e os núcleos em alta terminarem de carregar, mede e captura a imagem.
//
//   node run.mjs                         # lab/, perfis celular e desktop, todas as sondas
//   node run.mjs --alvo lab --perfil celular --rapido
//   node run.mjs --alvo quatro-momentos  # mede o jogo publicado (sem gancho: só carga e erros)
//
// Saída: resultados/<alvo>/metricas.json e resultados/<alvo>/<perfil>/<sonda>.png
//
// Sem internet: three.js é servido de node_modules/three (mesma versão do importmap) e as fontes
// do Google são bloqueadas. Por isso a bancada roda igual no computador, no GitHub Actions e no Codex.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, "..");

const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf("--" + k);
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
};
const ALVO = opt("alvo", "lab");
const RAPIDO = !!opt("rapido", false);
const SAIDA = path.resolve(opt("saida", path.join(AQUI, "resultados", ALVO.replace(/[\/]/g, "_"))));
const RAIZ_SITE = path.resolve(opt("raiz", RAIZ));
const SONDAS = JSON.parse(fs.readFileSync(path.resolve(AQUI, opt("sondas", "sondas.json")), "utf8"));
const PERFIS_TODOS = SONDAS.perfis;
const PERFIS = String(opt("perfil", Object.keys(PERFIS_TODOS).join(",")))
  .split(",")
  .filter((p) => PERFIS_TODOS[p]);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".mp3": "audio/mpeg",
  ".wasm": "application/octet-stream",
  ".glb": "model/gltf-binary",
};

function servidor() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(RAIZ_SITE, p);
    if (!f.startsWith(RAIZ_SITE)) return res.writeHead(403).end();
    fs.stat(f, (e, st) => {
      if (e || !st.isFile()) return res.writeHead(404).end();
      res.writeHead(200, {
        "content-type": TIPOS[path.extname(f)] || "application/octet-stream",
        "content-length": st.size,
        "cache-control": "no-store",
      });
      fs.createReadStream(f).pipe(res);
    });
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv)));
}

// three.js local no lugar do CDN (mesma versão fixada no importmap do jogo)
const THREE_DIR = path.join(AQUI, "node_modules", "three");
async function rotas(ctx) {
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@[\d.]+\//, (route) => {
    const u = new URL(route.request().url());
    const rel = u.pathname.replace(/^\/npm\/three@[\d.]+\//, "");
    const f = path.join(THREE_DIR, rel);
    if (!f.startsWith(THREE_DIR) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: "" });
    route.fulfill({ status: 200, contentType: "text/javascript", body: fs.readFileSync(f) });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
}

// executado na página antes de qualquer script: sorteios com semente fixa e núcleos de CPU do perfil
const inicio = ({ nucleos, memoria }) => {
  let s = 0x9e3779b9;
  Math.random = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  try {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => nucleos });
    Object.defineProperty(navigator, "deviceMemory", { get: () => memoria });
  } catch (_) {}
  try {
    performance.setResourceTimingBufferSize(20000);
  } catch (_) {}
};

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function ate(page, expr, ms, rotulo) {
  const t0 = Date.now();
  let log = t0;
  while (Date.now() - t0 < ms) {
    if (await page.evaluate(expr).catch(() => false)) return Date.now() - t0;
    await espera(250);
    if (Date.now() - log > 15000) {
      log = Date.now();
      const e = await page.evaluate(() => window.__bench && window.__bench.estado).catch(() => null);
      console.log(`    esperando ${rotulo} há ${((log - t0) / 1000).toFixed(0)} s ${e ? JSON.stringify(e) : ""}`);
    }
  }
  throw new Error(`tempo esgotado (${ms / 1000}s) esperando ${rotulo}`);
}

async function rodaPerfil(browser, base, nome, P) {
  const ctx = await browser.newContext({
    viewport: { width: P.largura, height: P.altura },
    deviceScaleFactor: 1,
    userAgent: P.ua || undefined,
    hasTouch: !!P.toque,
    isMobile: false,
  });
  await rotas(ctx);
  await ctx.addInitScript(inicio, { nucleos: P.nucleos, memoria: P.memoria });
  const page = await ctx.newPage();
  const erros = [];
  page.on("console", (m) => {
    // "Failed to load resource" repete o que os eventos de rede abaixo já registram (e inclui as fontes bloqueadas)
    if (m.type() === "error" && !/^Failed to load resource/.test(m.text())) erros.push("console: " + m.text().slice(0, 300));
  });
  page.on("pageerror", (e) => erros.push("página: " + String(e.message).slice(0, 300)));
  page.on("response", (r) => {
    if (r.status() >= 400 && !/fonts\./.test(r.url())) erros.push(`HTTP ${r.status()}: ${r.url().replace(base, "")}`);
  });
  page.on("requestfailed", (r) => {
    // ERR_ABORTED = download cancelado pelo próprio jogo ou pelo fechamento da aba: não é erro
    const f = (r.failure() || {}).errorText || "";
    if (!/fonts\./.test(r.url()) && !/ERR_ABORTED/.test(f)) erros.push(`falhou (${(r.failure() || {}).errorText}): ${r.url().replace(base, "")}`);
  });

  const url = `${base}/${ALVO}/?bench=1&q=${P.qualidade}`;
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const temGancho = await ate(page, "!!window.__bench", 30000, "gancho __bench").then(
    () => true,
    () => false,
  );
  const out = { perfil: nome, url: url.replace(base, ""), qualidade: P.qualidade, tela: [P.largura, P.altura] };
  if (!temGancho) {
    // alvo sem gancho (ex.: jogo publicado): mede só carga e erros
    await ate(page, "!!window.__jogo && window.__jogo.rota[0] >= 0", 240000, "primeira cena").catch((e) =>
      erros.push(String(e.message)),
    );
    out.carga_ms = Date.now() - t0;
    out.sem_gancho = true;
  } else {
    await ate(page, "window.__bench.pronto", 240000, "primeira cena");
    out.carga_ms = Date.now() - t0;
    out.sondas = [];
    const lista = RAPIDO ? SONDAS.sondas.slice(0, 2) : SONDAS.sondas;
    fs.mkdirSync(path.join(SAIDA, nome), { recursive: true });
    for (const s of lista) {
      const ts = Date.now();
      await page.evaluate(([c, r, u]) => window.__bench.ir(c, r, u), [s.cena, s.rota, s.u]);
      await ate(page, "window.__bench.pronto", 240000, `cena ${s.cena + 1}`);
      const hd_ms = await ate(page, "window.__bench.hdOcioso", 360000, `núcleos em alta (${s.nome})`).catch((e) => {
        erros.push(String(e.message));
        return -1;
      });
      await page.evaluate(() => {
        window.__benchT = 12.5;
        window.__bench.zerar();
      });
      await espera(SONDAS.janela_ms);
      await ate(page, `window.__bench.estado.quadros >= ${SONDAS.quadros_min || 1}`, 120000, "quadros da medição").catch(() => {});
      const cap = await page.evaluate(() => window.__bench.capturar());
      const png = Buffer.from(cap.png.split(",")[1], "base64");
      fs.writeFileSync(path.join(SAIDA, nome, s.nome + ".png"), png);
      out.sondas.push({ nome: s.nome, espera_hd_ms: hd_ms, tempo_sonda_ms: Date.now() - ts, ...cap.dados, aparelho: undefined });
      await page.evaluate(() => {
        window.__benchT = undefined;
      });
      console.log(`  ${nome} ${s.nome}: ${(cap.dados.triangulos / 1e6).toFixed(2)} M tri, ${cap.dados.draw_calls} calls, ${cap.dados.quadro_ms_mediana} ms`);
    }
  }
  const rede = await page.evaluate(() => {
    const e = performance.getEntriesByType("resource");
    let bytes = 0;
    const porTipo = {};
    for (const r of e) {
      const b = r.transferSize || r.encodedBodySize || 0;
      bytes += b;
      const k = (r.name.match(/\.(glb\.wasm|ao\.wasm|nl\.wasm|glb|json|webp|png|mp3|js)(?:$|\?)/) || [, "outro"])[1];
      porTipo[k] = (porTipo[k] || 0) + b;
    }
    return { requisicoes: e.length, bytes, porTipo };
  });
  out.rede = rede;
  out.heap_mb = await page.evaluate(() => (performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null));
  out.erros = [...new Set(erros)];
  await ctx.close();
  return out;
}

const srv = await servidor();
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--enable-precise-memory-info"],
});
fs.mkdirSync(SAIDA, { recursive: true });
const res = { alvo: ALVO, data: new Date().toISOString(), rapido: RAPIDO, perfis: {} };
let falhou = false;
for (const p of PERFIS) {
  console.log(`perfil ${p}…`);
  try {
    res.perfis[p] = await rodaPerfil(browser, base, p, PERFIS_TODOS[p]);
  } catch (e) {
    falhou = true;
    res.perfis[p] = { perfil: p, falha: String(e.message) };
    console.error(`  falha: ${e.message}`);
  }
}
await browser.close();
srv.close();
fs.writeFileSync(path.join(SAIDA, "metricas.json"), JSON.stringify(res, null, 1));
console.log(`gravado em ${path.relative(process.cwd(), SAIDA)}/metricas.json`);
process.exit(falhou ? 1 : 0);

// Compara uma rodada da bancada com o orçamento (orcamento.json), com as imagens de referência (ref/)
// e, se houver, com uma rodada base (ex.: a main, medida na mesma máquina).
//
//   node compara.mjs                                   # resultados/lab contra ref/ e orcamento.json
//   node compara.mjs --cabeca resultados/lab --base resultados/base
//   node compara.mjs --gravar-ref                      # promove as imagens atuais a referência (só com aprovação humana)
//
// Escreve resultados/resumo.md e sai com código 1 se alguma regra obrigatória falhar.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => {
  const i = args.indexOf("--" + k);
  return i < 0 ? d : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
};
const CAB = path.resolve(AQUI, opt("cabeca", "resultados/lab"));
const BASE = opt("base", null) ? path.resolve(AQUI, opt("base")) : null;
const REF = path.join(AQUI, "ref");
const ORC = JSON.parse(fs.readFileSync(path.join(AQUI, "orcamento.json"), "utf8"));
const lerM = (d) => JSON.parse(fs.readFileSync(path.join(d, "metricas.json"), "utf8"));
const cab = lerM(CAB);
const base = BASE && fs.existsSync(path.join(BASE, "metricas.json")) ? lerM(BASE) : null;

if (opt("gravar-ref", false)) {
  for (const [p, r] of Object.entries(cab.perfis)) {
    if (!r.sondas) continue;
    fs.mkdirSync(path.join(REF, p), { recursive: true });
    for (const s of r.sondas) fs.copyFileSync(path.join(CAB, p, s.nome + ".png"), path.join(REF, p, s.nome + ".png"));
  }
  console.log("referências gravadas em bench/ref");
  process.exit(0);
}

function difImagem(a, b) {
  if (!fs.existsSync(a) || !fs.existsSync(b)) return null;
  const A = PNG.sync.read(fs.readFileSync(a)),
    B = PNG.sync.read(fs.readFileSync(b));
  if (A.width !== B.width || A.height !== B.height) return 100;
  const out = new PNG({ width: A.width, height: A.height });
  const n = pixelmatch(A.data, B.data, out.data, A.width, A.height, { threshold: ORC.imagem.limiar_pixel });
  fs.writeFileSync(b.replace(/\.png$/, ".dif.png"), PNG.sync.write(out));
  return +((n / (A.width * A.height)) * 100).toFixed(2);
}

const linhas = [];
const falhas = [];
const avisos = [];
const f1 = (v, k = 1) => (v == null ? "—" : (+v).toFixed(k));
const pct = (a, b) => (a == null || b == null || !b ? "" : ` (${a >= b ? "+" : ""}${(((a - b) / b) * 100).toFixed(0)}%)`);

linhas.push(`# Bancada · ${cab.alvo}${cab.rapido ? " (rápida)" : ""}`, "");
linhas.push(`Rodada: ${cab.data}${base ? ` · base: ${base.alvo} ${base.data}` : ""}`, "");

for (const [nome, P] of Object.entries(cab.perfis)) {
  const O = ORC.perfis[nome] || {};
  const B = base && base.perfis[nome];
  // rodada rápida contra completa (ou vice-versa): carga e download não são comparáveis
  const Bt = B && !!cab.rapido === !!base.rapido ? B : null;
  linhas.push(`## Perfil ${nome}`, "");
  if (P.falha) {
    falhas.push(`${nome}: a bancada falhou (${P.falha})`);
    linhas.push(`**Falhou:** ${P.falha}`, "");
    continue;
  }
  const mb = (P.rede.bytes / 1048576).toFixed(1);
  linhas.push(
    `Carga até a primeira cena: ${(P.carga_ms / 1000).toFixed(1)} s${Bt ? pct(P.carga_ms, Bt.carga_ms) : ""} · ` +
      `download total: ${mb} MB${Bt ? pct(P.rede.bytes, Bt.rede.bytes) : ""} · heap JS: ${f1(P.heap_mb)} MB`,
    "",
  );
  if (P.erros.length) {
    falhas.push(`${nome}: ${P.erros.length} erro(s) na página: ${P.erros.slice(0, 3).join(" | ")}`);
  }
  if (O.download_mb_max && P.rede.bytes / 1048576 > O.download_mb_max)
    falhas.push(`${nome}: download ${mb} MB > ${O.download_mb_max} MB`);
  if (O.heap_mb_max && P.heap_mb > O.heap_mb_max) falhas.push(`${nome}: heap ${P.heap_mb} MB > ${O.heap_mb_max} MB`);
  if (!P.sondas) continue;
  linhas.push(
    "| sonda | triângulos | draw calls | quadro ms (mediana) | dif. imagem vs ref | espera alta |",
    "|---|---:|---:|---:|---:|---:|",
  );
  for (const s of P.sondas) {
    const b = B && B.sondas ? B.sondas.find((x) => x.nome === s.nome) : null;
    const dif = difImagem(path.join(REF, nome, s.nome + ".png"), path.join(CAB, nome, s.nome + ".png"));
    s.dif_ref = dif;
    linhas.push(
      `| ${s.nome} | ${(s.triangulos / 1e6).toFixed(2)} M${b ? pct(s.triangulos, b.triangulos) : ""} | ${s.draw_calls}${b ? pct(s.draw_calls, b.draw_calls) : ""} | ` +
        `${f1(s.quadro_ms_mediana)}${b ? pct(s.quadro_ms_mediana, b.quadro_ms_mediana) : ""} | ${dif == null ? "sem ref" : dif + "%"} | ${s.espera_hd_ms < 0 ? "esgotou" : (s.espera_hd_ms / 1000).toFixed(1) + " s"} |`,
    );
    if (O.triangulos_max && s.triangulos > O.triangulos_max)
      falhas.push(`${nome}/${s.nome}: ${s.triangulos} triângulos > ${O.triangulos_max}`);
    if (O.draw_calls_max && s.draw_calls > O.draw_calls_max)
      falhas.push(`${nome}/${s.nome}: ${s.draw_calls} draw calls > ${O.draw_calls_max}`);
    if (dif != null && dif > ORC.imagem.dif_max_pct)
      falhas.push(`${nome}/${s.nome}: imagem ${dif}% diferente da referência (máx. ${ORC.imagem.dif_max_pct}%)`);
    else if (dif != null && dif > ORC.imagem.dif_aviso_pct)
      avisos.push(`${nome}/${s.nome}: imagem ${dif}% diferente da referência — confira o .dif.png`);
    if (s.espera_hd_ms < 0) falhas.push(`${nome}/${s.nome}: a alta qualidade não terminou de carregar`);
    if (b && b.quadro_ms_mediana && s.quadro_ms_mediana > b.quadro_ms_mediana * ORC.tempo_quadro.piora_max_vs_base)
      avisos.push(
        `${nome}/${s.nome}: quadro ${f1(s.quadro_ms_mediana)} ms vs base ${f1(b.quadro_ms_mediana)} ms (GPU por software; confirme no aparelho)`,
      );
  }
  linhas.push("");
}

linhas.push("## Resultado", "");
if (!falhas.length) linhas.push("**Dentro do orçamento.**", "");
for (const f of falhas) linhas.push(`- ❌ ${f}`);
for (const a of avisos) linhas.push(`- ⚠️ ${a}`);
linhas.push(
  "",
  "_Tempo de quadro medido com GPU por software (SwiftShader): vale para comparar duas versões na mesma máquina, não como fps real. O fps real vem do aparelho, com `?fps=1`._",
);
const md = linhas.join("\n");
fs.writeFileSync(path.join(CAB, "..", "resumo.md"), md);
fs.writeFileSync(path.join(CAB, "metricas.json"), JSON.stringify(cab, null, 1));
console.log(md);
process.exit(falhas.length ? 1 : 0);

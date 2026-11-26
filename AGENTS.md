# AGENTS.md — regras para agentes (Codex/ChatGPT e outros)

Este repositório é o site público **viniverso.github.io** (GitHub Pages, publicado a partir da `main`).
Tudo o que entra na `main` vai ao ar em minutos. Leia este arquivo inteiro antes de mudar qualquer coisa.

## O que existe aqui

| Pasta / arquivo | O que é | Agente pode mexer? |
|---|---|---|
| `index.html`, `img/`, `modelos/`, `video/`, `CONTINUACAO-LOJA.md` | Loja do Viniverso (página inicial, visualizador das esculturas) | **Não** |
| `quatro-momentos/` | Jogo publicado *Quatro momentos da vida de Felipe Camarão* e todos os assets (~670 MB) | **Não.** Só leitura. |
| `lab/` | **Versão de teste do jogo.** É aqui que você trabalha. | Sim |
| `bench/` | Bancada de medição (desempenho + imagem) | Sim, exceto `ref/`, `sondas.json` e `orcamento.json` (ver abaixo) |
| `tools/` | Scripts de build de assets que você criar (LOD, clusters, compressão…) | Sim |
| `.github/workflows/` | CI da bancada | Só com aprovação humana explícita no pedido |
| `AGENTS.md` | Este arquivo | Só com aprovação humana |

O `lab/` lê os assets do jogo publicado por caminho relativo (`../quatro-momentos/jogo/...`). Não copie esses
assets para dentro do `lab/`. Assets **novos** que você gerar (malhas em clusters, LODs, texturas comprimidas) vão em
`lab/assets/`, com cada arquivo abaixo de 50 MB e o total novo por PR abaixo de 150 MB. Prefira extensão `.bin`,
`.glb` ou `.json`; o GitHub Pages serve qualquer extensão.

## Objetivo do laboratório

Aumentar a capacidade de renderização do jogo no navegador — em especial no **iPhone (Safari)** — sem mudar o que
o jogador vê. A meta de longo prazo é geometria estática em escala de dezenas de milhões de triângulos (as cenas
completas em resolução original somam ~25 M na Cena 1) com algo no espírito do Nanite: hierarquia de clusters,
seleção de nível de detalhe por erro em pixels, streaming e culling. Ver a fila em `lab/TAREFAS.md`.

## Comandos

```bash
# preparação (uma vez por ambiente; precisa de internet)
cd bench && npm ci && npx playwright install --with-deps chromium

# medição rápida durante o desenvolvimento (2 sondas, perfil celular, ~30 s)
node bench/run.mjs --perfil celular --rapido && node bench/compara.mjs

# celular completo (~2 min) — use sempre que mexer em algo que afeta a qualidade leve
node bench/run.mjs --perfil celular && node bench/compara.mjs

# medição completa antes de abrir PR (celular + desktop em qualidade alta, ~20 min: a GPU é por software e a
# alta desenha até ~22 M triângulos por quadro)
node bench/run.mjs && node bench/compara.mjs
# resultado em bench/resultados/resumo.md; código de saída 1 = fora do orçamento
```

Cada sonda espera a cena e os núcleos em alta terminarem de carregar, mede por pelo menos `janela_ms` e
`quadros_min` quadros com o tempo das animações parado, e captura a imagem. Duas rodadas seguidas da mesma versão
diferem em menos de 0,05% dos pixels e ~10% no tempo de quadro; por isso a imagem é regra dura e o tempo de quadro é aviso.

A bancada não precisa de internet depois da preparação: ela sobe um servidor local na raiz do repositório,
serve o three.js de `bench/node_modules/three` no lugar do CDN e bloqueia as fontes do Google.

Para ver o jogo do laboratório no navegador: sirva a raiz do repositório (`npx http-server -p 8080 .` ou
`python3 -m http.server`) e abra `http://localhost:8080/lab/`. Parâmetros úteis:
`?q=alta` / `?q=leve` (qualidade), `?fps=1` (medidor na tela, com botão "Copiar medição"), `?bench=1` (gancho da bancada).

## Ciclo de trabalho (o "loop")

Cada iteração é **uma tarefa de `lab/TAREFAS.md` = um branch = um PR**.

1. Pegue a primeira tarefa com estado `[ ]` cujas dependências estejam `[x]`. Não pule tarefas sem dizer por quê.
2. Crie o branch `gpt/<número>-<nome-curto>` a partir da `main` atualizada.
3. Rode a bancada completa **antes** de mudar qualquer coisa e guarde os números (é a sua base).
4. Implemente em passos pequenos, rodando a bancada rápida a cada passo.
5. Rode a bancada completa no final. Se falhar o orçamento, conserte ou explique no PR por que não deu.
6. Atualize `lab/DIARIO.md` (no topo): data, tarefa, o que mudou, números antes/depois, o que aprendeu, o que ficou pendente.
7. Marque a tarefa como `[x]` (ou `[~]` se ficou parcial, explicando) em `lab/TAREFAS.md`.
8. Abra o PR com: objetivo, o que mudou, tabela do `bench/resultados/resumo.md`, riscos, e como testar no iPhone
   (link `https://viniverso.github.io/lab/?fps=1` depois do merge).
9. **Nunca faça merge.** Quem aprova é o dono do repositório. Não abra o PR seguinte em cima de um PR ainda não aprovado,
   a menos que a tarefa diga que pode.

## Regras que não se negociam

- Não altere nada fora de `lab/`, `bench/` (exceto os arquivos protegidos) e `tools/`.
- Não afrouxe `bench/orcamento.json`, não troque `bench/sondas.json` e não regrave `bench/ref/` para fazer a bancada
  passar. Se achar que uma regra está errada, explique no PR e deixe a decisão para o humano.
- A imagem tem que continuar a mesma: diferença acima de `dif_aviso_pct` precisa ser justificada e mostrada (anexe o
  `.dif.png`). Mudança visual intencional só com pedido explícito.
- Tem que funcionar no **Safari do iPhone** com WebGL2. Qualquer caminho WebGPU fica atrás de um parâmetro de URL e com
  volta automática para WebGL2. Sem `SharedArrayBuffer` (o GitHub Pages não envia COOP/COEP).
- three.js fica em `0.170.0` (importmap em `lab/index.html` e `bench/package.json`). Para mudar, as duas coisas juntas
  e com justificativa.
- Scripts externos só de `cdn.jsdelivr.net/npm/` com versão exata. Nada de servidores próprios, analytics ou rastreio.
- Não apague nem sobrescreva os assets de `quatro-momentos/`. As cenas originais do Unity não estão neste repositório e
  não devem ser recriadas aqui.
- Sem segredos, tokens ou chaves em nenhum arquivo.
- Escreva comentários, commits, PRs e o diário em **português do Brasil**.
- Se um número piorar, diga. Não esconda falha atrás de média ou de sonda trocada.

## Mapa rápido do código (`lab/src/jogo.js`)

O arquivo veio do jogo publicado, apenas formatado com Prettier. Pontos de entrada:

- `boot()` → lê `lab/dados/cenas.json` e chama `goScene(i, rota)`, que baixa `cena-*.glb.wasm` (GLB com meshopt,
  renomeado para `.wasm` por causa da hospedagem), aplica AO por vértice (`applyAO`, arquivo `.ao.wasm`), rótulos de
  núcleo por vértice (`applyNL`, `.nl.wasm`), organiza a cena (`tidy`), planta as árvores (`loadTrees`, instanciadas)
  e cria os elementos de cada cena (cajueiro, oca, aldeia, fauna…).
- `tick()` → laço de quadro: avança o percurso, anima, `applyCam()` (câmera no percurso da rota), `updateTrees()`,
  `updateOcc()` (oclusão/distância por célula, `CELL_FAR`), `hdsTick()` e renderiza céu (`bgScene`) + cena.
  Fora da bancada, quadros lentos desligam sombras e baixam a resolução (bloco `slow`).
- **Qualidade alta por núcleo (HDS)**: `hdsAlvo()` escolhe quais núcleos (grupos `hdn` em `cenas.json`) ficam em
  resolução original — o trecho atual, o próximo, o seguinte e o anterior, até `HDS.lim` triângulos;
  `hdsNext()` baixa, `hdsUpload()` envia à GPU fora da tela, e `hdsTick()` faz a troca por dissolução pontilhada
  (`patchHDF`) e devolve núcleos à versão leve pela distância (`HD_IN`/`HD_OUT`). É o sistema que o "Nanite" deve
  substituir.
- `QUAL` (`leve`/`alta`), `MOBILE`, `weak` decidem o perfil. `?q=` força a qualidade.
- Medidor e gancho da bancada: final do arquivo (`medidorDados`, `window.__bench`).

`lab/dados/cenas.json`: `cenas[]` com `glb`, `nl`, `sky`, `luz`, `rotas[]` (`nome`, `pts` do percurso, `comp`, `fechado`,
`yaw`/`pitch`) e `hdn[]` (núcleos em alta: `g` id, `r` rotas onde aparecem, `t` triângulos, `p[]` partes `{u: url, b: bytes}`).

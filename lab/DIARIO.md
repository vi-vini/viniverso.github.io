# Diário do laboratório

Entradas mais novas no topo. Cada entrada: data · tarefa · o que mudou · números antes/depois (do `bench/resultados/resumo.md`
e, quando houver, medições do iPhone com `?fps=1`) · o que aprendeu · pendências.

---

## 2026-11-26 · Montagem do laboratório (Claude)

- `lab/` criado como cópia do jogo publicado em `quatro-momentos/` (commit 026e629). O script principal saiu do HTML
  para `lab/src/jogo.js` e foi formatado com Prettier; os caminhos de assets apontam para `../quatro-momentos/`.
  `lab/dados/cenas.json` é cópia do original com os caminhos ajustados.
- Acréscimos em relação ao jogo publicado, todos inertes sem parâmetro na URL:
  `?fps=1` mostra o medidor (fps, ms, triângulos, draw calls, geometrias, texturas) com botão "Copiar medição";
  `?bench=1` liga o gancho `window.__bench` usado pela bancada, fixa o tempo das animações na captura e desliga
  a redução automática de qualidade para a medição ser comparável. Só na bancada, `dt` pode chegar a 1 s e o envio de
  malhas em alta à GPU não tem limite por quadro, para que as transições terminem em poucos quadros de GPU por software.
- Selo amarelo "LABORATÓRIO" no canto da tela para não confundir com o jogo publicado.
- Bancada (`bench/`), orçamento, imagens de referência e CI (`.github/workflows/bancada-lab.yml`) criados.
- Linha de base (bancada completa, GPU por software; o tempo de quadro só serve para comparar versões):

### Perfil celular

Carga até a primeira cena: 3.5 s · download total: 57.2 MB · heap JS: 95.8 MB

| sonda | triângulos | draw calls | quadro ms (mediana) | dif. imagem vs ref | espera alta |
|---|---:|---:|---:|---:|---:|
| c1-introducao | 2.32 M | 68 | 366.6 | 0% | 0.6 s |
| c1-mascagem | 3.06 M | 121 | 949.9 | 0% | 1.0 s |
| c1-servico-oca | 1.84 M | 82 | 316.6 | 0% | 0.3 s |
| c1-cauinagem | 2.14 M | 104 | 1166.6 | 0% | 1.3 s |
| c2-bote | 2.06 M | 19 | 333.3 | 0% | 0.0 s |
| c3-tercos-lusos | 0.85 M | 61 | 200.0 | 0% | 0.2 s |
| c4-fim | 2.01 M | 39 | 233.4 | 0% | 0.4 s |

### Perfil desktop

Carga até a primeira cena: 6.0 s · download total: 560.8 MB · heap JS: 293.5 MB

| sonda | triângulos | draw calls | quadro ms (mediana) | dif. imagem vs ref | espera alta |
|---|---:|---:|---:|---:|---:|
| c1-introducao | 4.66 M | 86 | 2616.5 | 0% | 103.5 s |
| c1-mascagem | 17.23 M | 275 | 5583.1 | 0% | 67.2 s |
| c1-servico-oca | 15.81 M | 222 | 4549.8 | 0% | 144.1 s |
| c1-cauinagem | 21.97 M | 273 | 7083.0 | 0% | 223.7 s |
| c2-bote | 4.76 M | 31 | 1133.3 | 0% | 42.7 s |
| c3-tercos-lusos | 8.17 M | 112 | 2399.9 | 0% | 70.7 s |
| c4-fim | 16.66 M | 101 | 3949.8 | 0% | 172.6 s |

  Repetir a mesma versão deu até 0,45% de pixels diferentes (c3-tercos-lusos, desktop) e ~10% no tempo de quadro.
  O heap JS varia muito entre rodadas (60–290 MB no desktop) por causa da coleta de lixo.
- Observação para T0: em várias rotas a câmera atravessa esculturas e folhagem (ex.: Colheita do caju, Chegada das
  caravelas). As sondas foram escolhidas fora desses trechos; isso é do conteúdo, não da renderização.

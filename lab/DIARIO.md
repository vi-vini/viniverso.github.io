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
- Linha de base: ver tabela abaixo.

# Laboratório · Quatro Momentos

Versão de teste do jogo, para um agente (Codex/ChatGPT) melhorar a renderização em ciclos, sem tocar no jogo publicado.

- Jogo publicado: `https://viniverso.github.io/quatro-momentos/`
- Laboratório: `https://viniverso.github.io/lab/`, com medidor em `https://viniverso.github.io/lab/?fps=1`
- Regras do agente: `../AGENTS.md` · fila: `TAREFAS.md` · histórico: `DIARIO.md`

## Como ligar o Codex (uma vez)

1. Em chatgpt.com/codex, conecte o GitHub e dê acesso ao repositório `vi-vini/viniverso.github.io`
   (ler e criar branches/PRs; o ChatGPT comum com o conector do GitHub só lê, então o ciclo precisa do Codex).
2. Crie um ambiente para o repositório com:
   - Node 22.
   - Script de preparação:
     ```bash
     cd bench && npm ci && npx playwright install --with-deps chromium
     ```
   - Internet do agente: "limitada" com o pacote de dependências comuns (npm) basta. A bancada em si roda sem internet.
3. No GitHub, em Settings → Branches, proteja a `main` exigindo PR (assim nada entra sem você aprovar).
   O CI "Bancada do laboratório" roda em cada PR e comenta os números.

## Cada iteração (o ciclo)

1. Abra uma tarefa nova no Codex com o texto de `PROMPT-CODEX.md`.
2. O Codex pega a próxima tarefa de `TAREFAS.md`, mede, implementa, mede de novo e abre um PR.
3. O CI comenta o resumo no PR (triângulos, draw calls, tempo de quadro contra a `main`, diferença de imagem).
4. Você revisa. Depois do merge, abra `https://viniverso.github.io/lab/?fps=1` no iPhone, toque em "Copiar medição"
   em dois ou três pontos e cole no próprio PR ou na próxima tarefa do Codex. É o único fps real do ciclo.
5. Repita.

Para várias iterações sem você no meio, peça na mesma tarefa "faça as tarefas T1 e T2, um PR para cada"; ele não
faz merge sozinho.

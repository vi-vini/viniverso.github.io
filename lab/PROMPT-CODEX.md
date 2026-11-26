# Texto para colar no Codex a cada iteração

```
Você trabalha no laboratório do jogo Quatro Momentos neste repositório.

1. Leia AGENTS.md inteiro e siga as regras. Depois leia lab/TAREFAS.md e o topo de lab/DIARIO.md.
2. Pegue a próxima tarefa aberta cujas dependências estejam feitas. Diga qual é antes de começar.
3. Rode a bancada completa antes de mudar qualquer coisa:
   node bench/run.mjs && node bench/compara.mjs
   e guarde os números como base.
4. Implemente a tarefa em passos pequenos, rodando a bancada rápida a cada passo:
   node bench/run.mjs --perfil celular --rapido && node bench/compara.mjs
5. No final rode a bancada completa. Se sair do orçamento, conserte; se não der, explique por quê.
   Nunca altere bench/orcamento.json, bench/sondas.json ou bench/ref/ para passar.
6. Atualize lab/DIARIO.md (entrada nova no topo com números antes/depois) e marque a tarefa em lab/TAREFAS.md.
7. Abra um PR no branch gpt/<número>-<nome> com objetivo, mudanças, a tabela do bench/resultados/resumo.md,
   riscos e o que eu devo testar no iPhone. Não faça merge.

Medições do iPhone desde a última iteração (cole aqui o que copiou com ?fps=1, ou escreva "nenhuma"):

```

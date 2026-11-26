# Fila de tarefas do laboratório

Estados: `[ ]` aberta · `[~]` parcial · `[x]` feita (PR aprovado) · `[-]` descartada (com motivo).
Uma tarefa por PR. Siga a ordem; as dependências estão entre parênteses. Regras e comandos: `AGENTS.md`.

Orçamento de referência do iPhone (meta, não regra da bancada): 30 fps estáveis em `?q=leve` e 30 fps em `?q=alta`
nos aparelhos de 2022 em diante, sem recarregar a página por falta de memória.

---

## Fase 0 — validar o ciclo

- [ ] **T0. Reconhecimento e linha de base.**
  Rode a bancada completa sem mudar nada e registre os números em `lab/DIARIO.md`. Escreva `lab/ARQUITETURA.md`
  explicando, com referências de linha, como a cena é carregada, desenhada e trocada entre leve e alta (HDS), onde
  estão os maiores custos (triângulos, draw calls, trocas de shader, uploads) e quais medições faltam.
  Não mude código do jogo. Objetivo: provar que o ciclo branch → bancada → PR funciona.

## Fase 1 — ganhos baratos no que já existe

- [ ] **T1. Diagnóstico de draw calls e materiais** (T0).
  Liste por sonda os objetos que mais custam (draw calls e triângulos por material/objeto). Proponha e implemente
  a fusão de malhas estáticas que compartilham material, sem mudar a imagem. Meta: −30% de draw calls no perfil celular.
- [ ] **T2. Compilação de shaders sem travadas** (T0).
  Meça trocas de programa e travadas ao entrar em cada cena. Use `renderer.compileAsync` (three 0.170) para
  pré-compilar durante a tela de carregamento. Meta: nenhum quadro acima de 100 ms depois que a cena aparece
  (registre o p95 antes/depois).

## Fase 2 — geometria virtualizada (o "Nanite" do navegador)

- [ ] **T3. Construtor de clusters offline** (T0).
  Em `tools/clusters/`, um script Node que lê as partes em alta de um núcleo (`hdn` em `cenas.json`, arquivos em
  `quatro-momentos/jogo/hdn/`) e gera: meshlets (~128 triângulos), agrupamento de clusters vizinhos, simplificação do
  grupo com bordas travadas, repetido até a raiz (hierarquia em DAG, como no Nanite), com o erro geométrico e a esfera
  de cada nível. Use o pacote npm `meshoptimizer` (confira na documentação dele se a versão escolhida já traz o
  clusterizador em JS; se não trouxer, compile o necessário para WASM e documente). Saída em `lab/assets/clusters/`
  num formato binário documentado em `tools/clusters/FORMATO.md`. Comece pelo núcleo do cajueiro da Cena 1.
  Entregue estatísticas por nível (triângulos, erro, bytes). Sem mudar o jogo.
- [ ] **T4. Visualizador isolado de clusters** (T3).
  Página `lab/clusters.html` que carrega um núcleo gerado em T3, escolhe o corte da hierarquia por erro projetado em
  pixels (limiar ajustável, padrão 1 px), desenha só os clusters selecionados com frustum culling por cluster e mostra
  triângulos desenhados × triângulos totais. Modo de cor por nível de LOD para depuração. Precisa funcionar no iPhone.
- [ ] **T5. Clusters dentro do jogo, atrás de uma chave** (T4).
  Com `?geo=clusters`, o núcleo do cajueiro da Cena 1 usa os clusters no lugar do HDS. Sem a chave, nada muda.
  Rode a bancada com e sem a chave (adicione um modo à bancada se precisar, sem mexer em `sondas.json`) e compare
  triângulos, memória e imagem.
- [ ] **T6. Streaming por página de clusters** (T5).
  Agrupe clusters em páginas (64–256 KB) e baixe sob demanda por prioridade (erro na tela × distância), com limite de
  memória na GPU e descarte LRU. Cena 1 inteira em `?geo=clusters`. Meta: a Cena 1 completa em resolução original
  (~25 M triângulos no total) navegável no perfil desktop dentro do orçamento de triângulos desenhados.
- [ ] **T7. Oclusão** (T6).
  Culling por oclusão usando a profundidade do quadro anterior (hierarquia Z reduzida na CPU ou consultas de oclusão
  WebGL2 com resultado atrasado). Meça quanto corta em cada sonda.

## Fase 3 — experimentos

- [ ] **T8. Relatório WebGPU** (T6).
  Protótipo atrás de `?gpu=webgpu` com `WebGPURenderer` do three, culling e seleção de LOD em compute e draw indireto,
  com volta para WebGL2. Entregue um relatório com o que funcionou, o suporte no Safari do iPhone na data, e os números.
  Não precisa ir para o jogo.

---

## Ideias ainda não priorizadas (o humano decide)

- Texturas em KTX2/Basis no lugar de PNG/WebP.
- Impostores (octaedrais) para árvores e esculturas distantes.
- AO e rótulos de núcleo embutidos nos clusters em vez de arquivos separados.

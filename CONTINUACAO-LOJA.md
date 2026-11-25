# Viniverso — atualização da loja (24/11/2026)

- Base: exportação ZIP do artefato original do Claude, preservando o catálogo e os recursos existentes.
- Produto individual Clara Camarão (`clara-print` / `clara-camarao`) adicionado. Preço sob consulta, sem inventar valor.
- Modelo web: 314.260 triângulos, derivado dos 10 STL do arquivo `clara-camarao-v2.zip` no Drive. Material uniforme PLA vermelho acetinado #A60935, metalness 0, roughness 0.32; clearcoat 0.15 no visualizador.
- Ajuste de montagem virtual: translação do conjunto superior de -3, -19, -11 mm em X/Y/Z do GLB para fechar o vão entre tronco e saia. Conferir encaixe/articulação visualmente em vários ângulos antes da publicação definitiva. STLs originais não foram modificados.
- Galeria: foto real fornecida pelo artista e três vistas renderizadas da malha, identificadas como digitais. Visualizador e imersivo reutilizam rotas existentes. Ray tracing opcional; Clara ainda não possui mapas baked próprios.
- URL dos QR codes atualizada para GitHub Pages. Link para o jogo existente na raiz.
- Publicação: extrair o ZIP na raiz do repositório, substituir somente index.html e adicionar img/, modelos/, video/ e este registro. Não apagar nem alterar quatro-momentos/ ou .nojekyll. O GLB web é público se publicado no GitHub; o ZIP STL original não deve ser enviado.

## Animação de montagem de Clara Camarão
- Reutiliza o sistema `montPrepara` / `montPose` do Leviathan, com os dez nomes de malhas do GLB, montagem sequencial a partir do pé/base, encaixes, saia, tronco e braços.
- Duração de 6,55 s (passo de 0,60 s; duração de cada peça de 1,15 s). Botões existentes Montar e Ver peças habilitados; animação automática respeita redução de movimento.
- Deslocamentos menores para Clara, para manter a composição mais próxima do enquadramento. O Leviathan conserva seus parâmetros anteriores.
- Nenhuma alteração no jogo. Revisar animação e alinhamento dos encaixes em navegador real antes de publicar.

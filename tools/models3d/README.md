# Modelos 3D (fonte)

Personagens chibi construídas com three.js a partir de formas simples, com sombreado cartoon e contorno.

- `kit.js`: peças base (cabeça, olhos, cabelo, corpo, braços, materiais)
- `models.js`: os 20 modelos (8 operadores, 12 inimigos)
- `anim.js`: animações (operadores: espera + ataque; inimigos: andar/correr/pairar/rolar + ataque)
- `render.html?id=<modelo>&yaw=<rotação>`: mostra um modelo; `window.frame(anim, t)` desenha um frame
- `gifs.mjs`: exporta os frames das animações (pasta `frames/`)
- `shoot2.mjs` + `boards.py`: geram as folhas de pré-visualização em `docs/art-preview/`

Para ver: na pasta `tools/models3d`, `npm install three@0.180.0`, `python3 -m http.server 8765` e abre
`http://localhost:8765/render.html?id=brasa`.

## Exportar para o jogo

```bash
cd tools/models3d
npm install three@0.180.0
python3 -m http.server 8765 &      # noutro terminal
node export.mjs                    # frames 192x192 em export/ (precisa de Playwright)
python3 build_sheets.py            # folhas em public/assets/units/ + manifest.json
```

`sheet.html` usa uma câmara ortográfica fixa, igual para todos, por isso os tamanhos ficam coerentes.
Cada folha tem 2 linhas de 8 frames: operadores `idle` + `attack`, inimigos `move` + `attack`.

Estado: **modelos e animações aprovados e no jogo**.

## Mapas 3D

Cada estágio tem um fundo 3D pré-renderizado (`public/assets/maps/<estágio>.jpg`).

- `map3d2.js`: constrói o mapa a partir da grelha do nível, com materiais iluminados, blocos biselados, sombras
  suaves, sombreado de contacto, espuma na margem da água e brilho nas luzes. Os arredores são lisos (sem
  edifícios nem adereços) para a área de jogo ocupar o ecrã. Os biomas e as cores estão em `BIOMES`.
- `mapshot2.html`: câmara ortográfica inclinada 46°, alinhada com a grelha de 32 px do jogo, a 128 px por casa.
  A imagem tem uma margem fina (2 casas aos lados) e esbate para a cor `MAP_HAZE`, que o jogo pinta por trás.
- `map3d.js` / `mapshot.html`: a geração anterior (estilo cartoon com contorno), guardada para referência.

```bash
cd tools/models3d
ln -s ../../node_modules node_modules   # three.js vem do package.json da raiz
npx tsx dump_levels.ts             # levels.json a partir de src/data/levels
python3 -m http.server 8765 &
node mapexport.mjs                 # todos; ou: node mapexport.mjs l1,l11
```

Se mudares `PITCH`, `H_HIGH`, `MARGIN` ou os px por casa, atualiza `MAP3D` em `src/game/scenes/BattleScene.ts`
(`lift` = `H_HIGH × cos(PITCH) × 32` px) e `MAP_PPU` / `MAP_LEFT` em `MenuScene.ts`. Se faltar a imagem de um
estágio, o jogo usa as casas 2D.

## Personagens: segunda geração (em aprovação)

`kit2.js` + `models2.js` redesenham os 20 modelos com proporções anime (cerca de 2,4 cabeças), rosto desenhado
numa textura, sombreado em dois tons com sombra colorida e luz de recorte, e contorno fino da cor de cada peça.
Usam os mesmos pontos de animação (`anim.js`). Para ver: `render.html?id=brasa&v=2`. As folhas do jogo
(`public/assets/units/`) ainda vêm de `models.js`; só mudam depois de os modelos novos serem aprovados
(`sheet.html?v=2`).

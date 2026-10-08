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

Cada estágio tem um fundo 3D pré-renderizado (`public/assets/maps/<estágio>.jpg`), no mesmo estilo cartoon.

- `map3d.js`: constrói o mapa a partir da grelha do nível (casas, plataformas, portais, base e adereços
  de cada bioma). Os biomas e as cores estão em `BIOMES`.
- `mapshot.html`: câmara ortográfica inclinada 46°, alinhada com a grelha de 32 px do jogo (64 px por casa
  na imagem, mostrada a 50%), com uma margem de casas à volta do mapa.

```bash
cd tools/models3d
npx tsx dump_levels.ts             # levels.json a partir de src/data/levels
python3 -m http.server 8765 &
node mapexport.mjs                 # todos; ou: node mapexport.mjs l1,l11
```

Se mudares `PITCH`, `H_HIGH` ou `MARGIN` em `map3d.js`, atualiza `MAP3D` em `src/game/scenes/BattleScene.ts`
(`lift` = `H_HIGH × cos(PITCH) × 32` px). Se faltar a imagem de um estágio, o jogo usa as casas 2D.

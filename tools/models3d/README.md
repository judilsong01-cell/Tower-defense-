# Arte 3D (fonte)

Personagens e mapas são modelos three.js construídos em código e pré-renderizados para imagens que o jogo usa.

## Preparar

```bash
cd tools/models3d
ln -s ../../node_modules node_modules   # three.js vem do package.json da raiz (npm install)
python3 -m http.server 8765 &           # as páginas de render são servidas daqui
```

Os scripts `.mjs` usam o Playwright para abrir as páginas e guardar as imagens.

## Personagens

- `kit2.js`: peças base. Proporções anime (cerca de 2,4 cabeças de altura), rosto desenhado numa textura,
  sombreado em dois tons com sombra colorida e luz de recorte, contorno fino da cor de cada peça.
- `models2.js`: os 20 modelos (8 operadores, 12 inimigos).
- `anim.js`: animações (operadores: espera + ataque; inimigos: andar/correr/pairar/rolar + ataque).
- `render.html?id=<modelo>&yaw=<rotação>`: mostra um modelo; `window.frame(anim, t)` desenha um frame.
- `sheet.html`: câmara ortográfica fixa, igual para todos, por isso os tamanhos ficam coerentes no jogo.

```bash
node export.mjs && python3 build_sheets.py          # folhas 288 px em public/assets/units/ + manifest.json
node portraits.mjs && python3 build_portraits.py    # retratos dos menus em public/assets/units/portrait/
```

Cada folha tem 2 linhas de 8 frames: operadores `idle` + `attack`, inimigos `move` + `attack`.

## Mapas

Cada estágio tem um fundo 3D pré-renderizado (`public/assets/maps/<estágio>.jpg`), ao estilo do Arknights:
vista em perspetiva, chão e plataformas de betão gasto, um cubo vermelho onde os inimigos entram e um azul no
ponto a defender. Os arredores são lisos (sem edifícios nem adereços) para a área de jogo ocupar o ecrã.

- `arkmap.js`: constrói o estágio a partir da grelha do nível. Os materiais de cada bioma estão em `STYLES`.
- `arkexport.html` / `arkexport.mjs`: renderizam a imagem e gravam a câmara de cada estágio em
  `src/data/mapViews.json`. O jogo usa esses números (`src/game/projection.ts`) para pôr as unidades no sítio
  certo da imagem e para saber que casa está debaixo do dedo.

```bash
npx tsx dump_levels.ts             # levels.json a partir de src/data/levels
node arkexport.mjs                 # todos; ou: node arkexport.mjs l1,l11
```

A inclinação da câmara (`PITCH`) e as alturas das casas (`SLAB`, `H_HIGH`) têm de ser iguais em `arkmap.js` /
`arkexport.html` e em `src/game/projection.ts`. Se faltar a imagem ou a câmara de um estágio, o jogo usa as
casas 2D vistas de cima.

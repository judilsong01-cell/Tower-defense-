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

Estado: **modelos aprovados**; animações em `docs/art-preview/animacoes_*.gif` para aprovação.

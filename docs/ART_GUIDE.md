# Guia de arte

Toda a arte atual é placeholder gerado por código (`src/game/art.ts`). Cada imagem tem uma **chave**.
Para trocar um placeholder pela tua arte basta pôr o PNG em `public/assets/sprites/` e registá-lo em
`public/assets/manifest.json` com a mesma chave. Não é preciso mexer em código. Se um ficheiro faltar,
o jogo usa o placeholder e escreve um aviso na consola.

## Regras gerais

- **PNG com transparência**, sem anti-aliasing (pixel art "dura"), sem margens desnecessárias.
- Grelha base: **32×32 px por casa**. O jogo corre a 640×360 e é ampliado com *nearest neighbour*.
- Personagens **viradas para a direita**. O jogo espelha-as quando olham ou andam para a esquerda.
- Os pés das personagens ficam na **linha de baixo** da frame, centrados.
- Paleta sugerida: regime em brancos e cinzentos frios (`#d9dbe0`, `#bfd7ff`) e Resistência em tons escuros
  com **vermelho** como cor da emoção (`#c8323a`).

## Chaves

### Casas do mapa (32×32)

| Chave | O que é |
| --- | --- |
| `tile_ground` | Chão onde se coloca corpo-a-corpo |
| `tile_ground_locked` | Chão onde não se pode colocar ninguém |
| `tile_high` | Plataforma para unidades à distância. Desenha a "face" de cima nos ~26 px de cima e a lateral em baixo |
| `tile_high_locked` | Plataforma bloqueada |
| `tile_wall` | Parede ou vazio |
| `tile_spawn` | Entrada dos inimigos |
| `tile_base` | Base da Resistência (o que tens de proteger) |

### Operadores (32×32 por frame)

`op_brasa`, `op_faisca`, `op_muralha`, `op_bastiao`, `op_lirio`, `op_corvo`, `op_falcao`, `op_trovao`

### Inimigos (32×32 por frame)

`en_peacekeeper`, `en_hound`, `en_riot`, `en_rifleman`, `en_drone`, `en_gunship`, `en_executor`, `en_cleric`
(o Clérigo é desenhado a 125% no jogo por ser boss).

### Interface

| Chave | Tamanho | O que é |
| --- | --- | --- |
| `icon_vanguard`, `icon_defender`, `icon_medic`, `icon_sniper` | 8×8 | Ícone de classe nas cartas |
| `ui_heart` | 8×8 | Vidas |
| `ui_dp` | 8×8 | Pontos de deployment |
| `ui_star`, `ui_star_empty` | 8×8 | Estrelas |
| `ui_arrow` | 8×8 | Seta de direção (a apontar para a direita) |
| `fx_slash` | 16×16 | Golpe corpo-a-corpo |
| `fx_shell` | 4×4 | Projétil de artilharia |
| `fx_heal` | 5×5 | Partícula de cura |
| `fx_spark` | 2×2 | Faísca (branca; o jogo pinta-a) |
| `fx_shadow` | 16×4 | Sombra das unidades aéreas |

## Animações

Para animar, usa uma **sprite sheet horizontal** (frames lado a lado, todas do mesmo tamanho) e declara as
animações no manifest. Nomes reconhecidos:

- Operadores: `idle` (em loop) e `attack` (uma vez, depois volta a `idle`)
- Inimigos: `move` (em loop)

Exemplo de `public/assets/manifest.json`:

```json
{
  "sprites": {
    "tile_ground": { "file": "sprites/tile_ground.png" },
    "op_brasa": {
      "file": "sprites/op_brasa.png",
      "frameWidth": 32,
      "frameHeight": 32,
      "anims": {
        "idle":   { "frames": [0, 1, 2, 3], "fps": 6 },
        "attack": { "frames": [4, 5, 6], "fps": 12 }
      }
    },
    "en_hound": {
      "file": "sprites/en_hound.png",
      "frameWidth": 32,
      "anims": { "move": { "frames": [0, 1, 2, 3], "fps": 10 } }
    }
  }
}
```

## Ícone da app e splash

O ícone e o ecrã de arranque Android ainda são os de origem do Capacitor. Quando tiveres o ícone
(1024×1024) e o splash (2732×2732, com o conteúdo no centro), gera todos os tamanhos com:

```bash
npx @capacitor/assets generate --android
```

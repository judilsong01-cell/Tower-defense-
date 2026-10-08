# Guia de arte e lista de assets

Toda a arte atual é **placeholder gerado por código**. Cada imagem do jogo tem uma **chave** (ex.: `op_brasa`).
Para pôr a tua arte não é preciso mexer no código:

1. Desenha o PNG com o tamanho indicado na lista abaixo.
2. Guarda-o em `public/assets/sprites/` (podes criar subpastas, ex.: `sprites/tiles/forest/ground.png`).
3. Regista-o em `public/assets/manifest.json` com a mesma chave (ver [o manifest](#manifest)).
4. Corre `npm run dev`: a tua imagem substitui o placeholder.

Se um ficheiro faltar ou tiver o nome errado, o jogo continua com o placeholder e escreve um aviso na consola
do browser. Assim podes ir substituindo aos poucos.

## Regras gerais

- **PNG com transparência**, pixel art "dura": sem anti-aliasing, sem sombras suaves, sem margens desnecessárias.
- **Grelha base de 32×32 px por casa.** O jogo corre a 640×360 e é ampliado sem suavização, por isso 1 px teu
  vira 3 ou 4 px no telemóvel.
- Personagens **viradas para a direita**: o jogo espelha-as quando olham ou andam para a esquerda.
- Os **pés** ficam na **linha de baixo** da frame, centrados na horizontal.
- **Animações** são *sprite sheets* horizontais: frames do mesmo tamanho lado a lado, da esquerda para a direita.
- A interface (botões, painéis, barras de vida, texto) é desenhada por código e **não precisa de assets**.

### Identidade visual

- **Resistência** (os teus operadores): roupa escura, com **vermelho `#c8323a`** como cor da emoção.
- **Regime** (inimigos): brancos e cinzentos frios, viseiras pretas, brilho **azul gelo `#bfd7ff`**.
- **Biomas**: cada estágio tem um ambiente (floresta, gelo, lava…), como nos teus mapas de referência.

---

## Lista completa

**Total: 97 imagens (20 delas são sprite sheets animadas) + ícone da app + splash.** Marca `[x]` à medida que fores fazendo.

### 1. Operadores: 8 sprite sheets de 32×32 por frame

Cada operador precisa de duas animações, na mesma sheet: `idle` (em loop) e `attack` (toca uma vez e volta a `idle`).
Sugestão: 4 frames de `idle` + 3 de `attack` = **sheet de 224×32 px**.

| ✓ | Chave | Nome | Classe | Onde fica | Como desenhar |
| --- | --- | --- | --- | --- | --- |
| [ ] | `op_brasa` | Brasa | Vanguard | Chão | Cabelo ruivo, casaco escuro, espada; ataque de corte |
| [ ] | `op_faisca` | Faísca | Vanguard | Chão | Cabelo loiro, detalhes laranja, lâmina curta; rápida |
| [ ] | `op_muralha` | Muralha | Defender | Chão | Armadura cinzenta pesada, escudo grande; golpe de escudo |
| [ ] | `op_bastiao` | Bastião | Defender | Chão | Armadura castanha, escudo e maça; mais ofensivo que a Muralha |
| [ ] | `op_lirio` | Lírio | Medic | Plataforma | Bata branca, cruz vermelha, mala médica; "ataque" = gesto de cura |
| [ ] | `op_corvo` | Corvo | Sniper | Plataforma | Todo de preto, cachecol vermelho, espingarda; disparo |
| [ ] | `op_falcao` | Falcão | Sniper anti-aéreo | Plataforma | Cabelo grisalho, espingarda apontada para cima |
| [ ] | `op_trovao` | Trovão | Sniper de artilharia | Plataforma | Casaco verde-oliva, lança-granadas ao ombro |

Os operadores também aparecem nas **cartas do deck**, onde se usa a primeira frame.

### 2. Inimigos: 12 sprite sheets de 32×32 por frame

Cada inimigo precisa de uma animação `move` (em loop). Sugestão: 4 frames = **sheet de 128×32 px**.

| ✓ | Chave | Nome | Como desenhar | Nota |
| --- | --- | --- | --- | --- |
| [ ] | `en_peacekeeper` | Pacificador | Uniforme cinzento claro, capacete com viseira, bastão | Soldado básico |
| [ ] | `en_hound` | Cão de Patrulha | Cão magro e escuro, olhos azul gelo, a correr | Rápido |
| [ ] | `en_riot` | Escudo de Choque | Armadura preta, escudo transparente grande à frente | Lento |
| [ ] | `en_rifleman` | Fuzileiro | Uniforme cinzento, espingarda | Dispara à distância |
| [ ] | `en_drone` | Drone de Vigilância | Drone branco com lente | **Aéreo**: desenha-o a "flutuar"; o jogo põe a sombra |
| [ ] | `en_gunship` | Drone de Assalto | Drone escuro e blindado, lente vermelha, armas | **Aéreo** |
| [ ] | `en_executor` | Executor | Armadura negra pesada, martelo enorme | Muito lento |
| [ ] | `en_incinerator` | Incinerador | Fato castanho, lança-chamas com chama laranja | Queima livros (e operadores) |
| [ ] | `en_infiltrator` | Infiltrado | Fato escuro justo, faca, contorno discreto | Camuflado |
| [ ] | `en_medic` | Enfermeiro do Regime | Uniforme branco, cruz azul gelo | Cura inimigos |
| [ ] | `en_armored` | Blindado | Veículo blindado com torre | Ocupa a casa toda, pode ir até à borda |
| [ ] | `en_cleric` | Clérigo | Casaco negro comprido, gola branca, duas pistolas | **Boss**: o jogo desenha-o a 125% |

### 3. Casas do mapa: 32×32, sem animação

Há **5 casas por bioma** (`ground`, `ground_locked`, `high`, `high_locked`, `wall`) e **3 comuns** a todos.

| Casa | O que é | Dica |
| --- | --- | --- |
| `tile_ground` | Caminho onde se põe corpo-a-corpo | Terra, pedra, madeira… conforme o bioma |
| `tile_ground_locked` | Caminho onde **não** se pode pôr ninguém (pontes, entradas da base) | Mesma base, com marcas: tábuas, riscas |
| `tile_high` | Plataforma para operadores à distância (os "pontos de torre" dos teus mapas) | Face de cima nos ~26 px de cima e a lateral em baixo, para parecer elevada |
| `tile_high_locked` | Plataforma bloqueada (decoração: estátua, árvore grande, altar) | |
| `tile_wall` | Vazio ou obstáculo: água, lava, floresta densa, céu, abismo | É o que mais aparece no ecrã |

**Comuns a todos os biomas:**

| ✓ | Chave | O que é |
| --- | --- | --- |
| [ ] | `tile_spawn` | Portal terrestre dos inimigos (portão, túnel) |
| [ ] | `tile_spawn_air` | Portal só de inimigos aéreos |
| [ ] | `tile_base` | Saída/base da Resistência (o que tens de proteger) |

**Por bioma.** O nome da chave é `<casa>@<bioma>`, por exemplo `tile_ground@forest` ou `tile_wall@lava`.
O bioma `city` usa as chaves sem sufixo (`tile_ground`, `tile_wall`…).

| ✓ | Bioma | Chaves | Estágios que o usam | Referência |
| --- | --- | --- | --- | --- |
| [ ] | `city` | `tile_ground`, `tile_ground_locked`, `tile_high`, `tile_high_locked`, `tile_wall` | 1-1 a 1-10, 2-7, 3-1 | Cidade cinzenta / Cidade Fortificada |
| [ ] | `forest` | `tile_*@forest` | 2-2, 3-2, 3-9 | Selva, Floresta Ancestral, Vale dos Moinhos |
| [ ] | `lava` | `tile_*@lava` | 2-1, 3-10 | Vulcão, Fortaleza do Caos |
| [ ] | `ice` | `tile_*@ice` | 2-8, 3-4 | Lago Gelado, Montanhas Geladas |
| [ ] | `desert` | `tile_*@desert` | 2-5, 3-3 | Garganta, Deserto das Ruínas |
| [ ] | `swamp` | `tile_*@swamp` | 2-6, 3-5 | Passarelas, Pântano Tóxico |
| [ ] | `ruins` | `tile_*@ruins` | 2-9, 3-8 | Ruínas Submersas, Templo Esquecido |
| [ ] | `sea` | `tile_*@sea` | 2-3 | Arquipélago |
| [ ] | `canyon` | `tile_*@canyon` | 2-4 | Desfiladeiro Vermelho |
| [ ] | `tech` | `tile_*@tech` | 2-10 | Estação Orbital |
| [ ] | `sky` | `tile_*@sky` | 3-6 | Ilhas Flutuantes |
| [ ] | `cave` | `tile_*@cave` | 3-7 | Caverna Abissal |

Total: 12 biomas × 5 casas = 60 casas + 3 comuns = **63 casas**.

Se só fizeres algumas casas de um bioma, as que faltam usam a versão sem sufixo (se a tiveres feito)
ou o placeholder colorido desse bioma.

### 4. Interface: ícones pequenos

| ✓ | Chave | Tamanho | O que é |
| --- | --- | --- | --- |
| [ ] | `icon_vanguard` | 8×8 | Ícone de classe na carta (espada/bandeira) |
| [ ] | `icon_defender` | 8×8 | Ícone de classe (escudo) |
| [ ] | `icon_medic` | 8×8 | Ícone de classe (cruz) |
| [ ] | `icon_sniper` | 8×8 | Ícone de classe (mira) |
| [ ] | `ui_heart` | 8×8 | Vidas |
| [ ] | `ui_dp` | 8×8 | Pontos de deployment |
| [ ] | `ui_star` | 8×8 | Estrela ganha |
| [ ] | `ui_star_empty` | 8×8 | Estrela por ganhar |
| [ ] | `ui_arrow` | 8×8 | Seta de direção, **a apontar para a direita** (o jogo roda-a) |

### 5. Efeitos

| ✓ | Chave | Tamanho | O que é |
| --- | --- | --- | --- |
| [ ] | `fx_slash` | 16×16 | Golpe corpo-a-corpo |
| [ ] | `fx_shell` | 4×4 | Granada do Trovão em voo |
| [ ] | `fx_heal` | 5×5 | Partícula de cura (verde) |
| [ ] | `fx_spark` | 2×2 | Faísca **branca** (o jogo pinta-a de outras cores) |
| [ ] | `fx_shadow` | 16×4 | Sombra das unidades aéreas (preto semi-transparente) |

### 6. App Android

| ✓ | Ficheiro | Tamanho | Notas |
| --- | --- | --- | --- |
| [ ] | `assets/icon.png` (na raiz do projeto) | 1024×1024 | Ícone da app; deixa uma margem, porque o Android corta-o em círculo |
| [ ] | `assets/splash.png` (na raiz do projeto) | 2732×2732 | Ecrã de arranque, com o conteúdo importante no centro |

Depois gera todos os tamanhos com `npx @capacitor/assets generate --android`.

### Ordem sugerida

Para veres diferença mais depressa:

1. **Os 8 operadores** e os **12 inimigos**: é o que mais se vê.
2. As **3 casas comuns** e as **5 casas de `city`**, usadas em 12 estágios.
3. Os biomas pela ordem dos estágios: `lava`, `forest`, `sea`, `canyon`, `desert`, `swamp`, `ice`, `ruins`, `tech`, `sky`, `cave`.
4. Ícones, efeitos, ícone da app e splash.

---

## Manifest

`public/assets/manifest.json` diz ao jogo que ficheiros existem. Cada entrada tem a **chave** (igual às tabelas)
e o caminho do ficheiro relativo a `public/assets/`.

- **Imagem simples** (casas, ícones, efeitos): só `file`.
- **Sprite sheet** (operadores, inimigos): `file`, `frameWidth`, `frameHeight` e `anims`. Os números em `frames`
  são as posições das frames na sheet, a começar em 0.

Exemplo com um operador, um inimigo, uma casa comum e uma casa de bioma:

```json
{
  "sprites": {
    "op_brasa": {
      "file": "sprites/operators/brasa.png",
      "frameWidth": 32,
      "frameHeight": 32,
      "anims": {
        "idle":   { "frames": [0, 1, 2, 3], "fps": 6 },
        "attack": { "frames": [4, 5, 6], "fps": 12 }
      }
    },
    "en_hound": {
      "file": "sprites/enemies/hound.png",
      "frameWidth": 32,
      "frameHeight": 32,
      "anims": { "move": { "frames": [0, 1, 2, 3], "fps": 10 } }
    },
    "tile_spawn": { "file": "sprites/tiles/spawn.png" },
    "tile_ground@forest": { "file": "sprites/tiles/forest/ground.png" }
  }
}
```

Estrutura de pastas sugerida:

```
public/assets/sprites/
  operators/   brasa.png, faisca.png, muralha.png, bastiao.png, lirio.png, corvo.png, falcao.png, trovao.png
  enemies/     peacekeeper.png, hound.png, riot.png, rifleman.png, drone.png, gunship.png, executor.png,
               incinerator.png, infiltrator.png, medic.png, armored.png, cleric.png
  tiles/       spawn.png, spawn_air.png, base.png
  tiles/city/  ground.png, ground_locked.png, high.png, high_locked.png, wall.png
  tiles/forest/ ... (as mesmas 5 em cada bioma)
  ui/          icon_vanguard.png, ..., ui_arrow.png
  fx/          slash.png, shell.png, heal.png, spark.png, shadow.png
```

Os nomes dos ficheiros e das pastas são livres; o que conta é a **chave** no manifest.

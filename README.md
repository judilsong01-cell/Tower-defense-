# Tower Defense (nome provisório)

Tower defense em pixel art inspirado nas mecânicas do Arknights, num mundo distópico ao estilo
*Equilibrium*: em Concórdia sentir é crime, e tu comandas a Resistência contra as forças do regime.

Feito com **Phaser 3 + TypeScript + Vite** e empacotado para Android (**.aab** para a Google Play) com **Capacitor**.

## Estado atual (v0.5)

- **30 estágios em 3 capítulos**:
  - Capítulo 1 *Concórdia*: os 10 estágios iniciais.
  - Capítulos 2 *Fronteiras* e 3 *Terras Perdidas*: 20 estágios desenhados a partir dos mapas de referência, rodados para ecrã horizontal.
  - De 2 até 6 portais (terrestres e aéreos), várias rotas por portal e até 2 saídas.
- **Mapas grandes com scroll** (até 24×13 casas): arrasta o mapa com o dedo ou usa a roda do rato. Ao arrastar uma carta para a borda, o mapa desliza. Pontos vermelhos na borda indicam inimigos fora do ecrã.
- **Fraquezas**: cada operador tem um tipo de dano (Lâmina, Impacto, Perfuração, Antiaéreo, Explosivo, Cura) e cada inimigo tem um operador ideal. Ver [docs/DESIGN.md](docs/DESIGN.md#fraquezas).
- 8 operadores e 12 inimigos. Toca num inimigo em batalha, ou no menu do estágio, para ver a fraqueza dele e o operador ideal.
- **Personagens 3D animadas**: os 20 bonecos são modelos 3D (estilo chibi, sombreado cartoon) exportados como animações
  (operadores: espera e ataque; inimigos: andar/correr/pairar/rolar e ataque). Fonte em `tools/models3d/`.
- **Mapas 3D**: cada estágio tem um cenário 3D no mesmo estilo, com plataformas elevadas, portais e base, em 12 biomas
  (cidade, floresta, deserto, gelo, lava, pântano, céu, mar, ruínas, estação, desfiladeiro, caverna). Fonte em `tools/models3d/map3d.js`.
- O jogo corre a 1280×720 para os bonecos e mapas aparecerem lisos; a interface mantém o estilo pixel.
- Mecânicas: chão/plataforma, bloqueio, DP, direção de ataque, skills com SP, retirar (devolve 50% do DP),
  redeploy com cooldown e custo crescente, limite de unidades, vidas e 3 estrelas
- Velocidade x1/x2/x3, pausa e **auto-cast de skills** (botão AUTO SK)
- **Deploy automático**: *AUTO: REPLAY* repete a tua melhor vitória; *AUTO: IA* joga sozinha mesmo sem
  vitória anterior. Em ambos podes carregar em **ASSUMIR** para tomar o controlo a meio
- PT/EN, progresso guardado no dispositivo
- Arte placeholder gerada por código, pronta a ser substituída (ver [docs/ART_GUIDE.md](docs/ART_GUIDE.md))

## Como jogar

1. Arrasta uma carta do deck para uma casa iluminada (corpo-a-corpo vai para o chão, à distância vai para as plataformas).
   Também podes tocar na carta e depois tocar na casa.
2. Escolhe a direção: arrasta o dedo para um lado, toca numa seta ou toca no operador para aceitar a direção sugerida.
   Tocar no **X** ou fora do operador cancela. O jogo fica parado enquanto colocas um operador.
3. Toca num operador em campo para ver o alcance, ativar a skill ou retirá-lo.

## Desenvolvimento

```bash
npm install
npm run dev        # servidor local; abre o endereço no browser (ou no telemóvel na mesma rede)
npm test           # testes da simulação (regras, IA, replays)
npm run build      # build web para dist/
```

Estrutura:

| Pasta | Conteúdo |
| --- | --- |
| `src/data/` | Dados do jogo: operadores, inimigos e níveis (`levels/chapter1..3.ts`); editar aqui para equilibrar |
| `tests/` | Testes: regras, replays e a garantia de que a IA vence cada estágio |
| `src/sim/` | Simulação determinística sem Phaser: batalha, grelha/caminhos, IA, replays |
| `src/game/` | Phaser: cenas, UI, arte placeholder e save |
| `src/i18n/` | Textos PT e EN |
| `public/assets/` | A tua arte e `manifest.json` |
| `android/` | Projeto Android gerado pelo Capacitor |

A simulação corre a 30 ticks/s fixos sem aleatoriedade. É isto que permite os replays: as mesmas ações nos
mesmos ticks dão sempre o mesmo resultado. Se mudares dados de jogo, os replays gravados deixam de ser válidos
e são descartados automaticamente.

## Testar no celular

Para gerar um APK e instalá-lo no celular (sem servidor, joga offline): `npm run android:apk`.
Guia passo a passo: [docs/INSTALAR_NO_CELULAR.md](docs/INSTALAR_NO_CELULAR.md).

## Android / Google Play (futuro)

O jogo está preparado para ser publicado como `.aab`, mas **ainda não é compilado**. Já estão prontos:

- o projeto Android em `android/`, com ecrã horizontal e modo imersivo
- o workflow manual `.github/workflows/android.yml`, que só corre quando o lançares

Enquanto isso, o workflow `ci.yml` corre os testes e o build web em cada push.
Quando chegar a altura, segue [docs/ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md).

Regras para não comprometer a publicação:

- O jogo tem de funcionar offline e com toque. Não usar hover, teclado obrigatório nem recursos de rede.
- Os assets ficam em `public/` e os caminhos são relativos, porque correm dentro da WebView.
- Os dados guardados ficam só no dispositivo; isto simplifica a política de privacidade da Play Store.

Mais detalhes de design em [docs/DESIGN.md](docs/DESIGN.md).

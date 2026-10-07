# Tower Defense (nome provisório)

Tower defense em pixel art inspirado nas mecânicas do Arknights, num mundo distópico ao estilo
*Equilibrium*: em Concórdia sentir é crime, e tu comandas a Resistência contra as forças do regime.

Feito com **Phaser 3 + TypeScript + Vite** e empacotado para Android (**.aab** para a Google Play) com **Capacitor**.

## Estado atual (v0.1)

- 1 nível jogável completo (14 vagas, 36 inimigos, boss no fim)
- 6 operadores de 4 classes: Vanguard ×2, Defender, Medic, Sniper ×2
- 6 inimigos: Pacificador, Cão de Patrulha, Escudo de Choque, Fuzileiro, Drone (aéreo), Clérigo (boss)
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
| `src/data/` | Dados do jogo: operadores, inimigos e níveis (editar aqui para equilibrar) |
| `src/sim/` | Simulação determinística sem Phaser: batalha, grelha/caminhos, IA, replays |
| `src/game/` | Phaser: cenas, UI, arte placeholder e save |
| `src/i18n/` | Textos PT e EN |
| `public/assets/` | A tua arte e `manifest.json` |
| `android/` | Projeto Android gerado pelo Capacitor |

A simulação corre a 30 ticks/s fixos sem aleatoriedade. É isto que permite os replays: as mesmas ações nos
mesmos ticks dão sempre o mesmo resultado. Se mudares dados de jogo, os replays gravados deixam de ser válidos
e são descartados automaticamente.

## Android / Google Play

O GitHub Actions gera o `.aab` (e um `.apk` de debug para instalares direto no telemóvel) em cada push.
Os ficheiros ficam em **Actions → execução → Artifacts**. Para assinar e publicar, segue
[docs/ANDROID_RELEASE.md](docs/ANDROID_RELEASE.md).

Mais detalhes de design em [docs/DESIGN.md](docs/DESIGN.md).

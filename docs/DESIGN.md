# Documento de design (v0.2)

## Conceito

Em Concórdia, a cidade do regime, as emoções são suprimidas por decreto e por medicação obrigatória. Quem sente é
"sentiente" e é caçado. O jogador comanda a **Resistência**, que defende refúgios das forças do regime.
O visual é cinzento, estéril e geométrico; o **vermelho** é a única cor quente e pertence à Resistência.

*Inspirado no tom do filme Equilibrium e nas mecânicas do Arknights; personagens, nomes e mundo são originais.*

## Regras da batalha

| Regra | Valor |
| --- | --- |
| Simulação | 30 ticks/s fixos, determinística |
| DP inicial / regeneração | 10 / +1 por segundo (máx. 99) |
| Limite de unidades em campo | 5 (por nível) |
| Retirar | devolve 50% do DP pago; o operador entra em cooldown |
| Redeploy | cooldown de 70s; custo +50% por cada novo deploy (máx. +100%) |
| Dano físico | `max(ATK − DEF, 5% ATK)` |
| Bloqueio | um inimigo é travado ao chegar a 0,8 casas de um operador de chão com bloqueio livre; o Escudo de Choque ocupa 2 |
| Aéreos | não são bloqueados nem atingidos por corpo-a-corpo; voam em linha reta |
| Inimigos à distância | atacam o operador colocado mais recentemente dentro do alcance enquanto andam |
| Estrelas | 3★ sem perder vidas, 2★ com 3 ou menos perdidas, 1★ se vencer |

Os alcances estão definidos virados para a direita e rodam com a direção escolhida.

## Operadores

| Nome | Classe | Custo | Bloq. | Papel | Skill |
| --- | --- | --- | --- | --- | --- |
| Brasa | Vanguard | 10 | 2 | Gera DP | Mobilização: +12 DP |
| Faísca | Vanguard | 12 | 1 | +1 DP por abate | Investida: +4 DP, ATK +60% (15s) |
| Muralha | Defender | 18 | 3 | Tanque | Postura de Aço: DEF +70%, ATK +20% (25s) |
| Lírio | Medic | 16 | – | Cura em área 4×3 | Cuidados Intensivos: cura +40%, 2 alvos (20s) |
| Corvo | Sniper | 12 | – | Prioriza aéreos | Rajada: ATK +30%, ataques 40% mais rápidos (15s) |
| Trovão | Sniper | 24 | – | Dano em área | Barragem: ATK +60% (15s) |
| Bastião | Defender | 19 | 3 | Tanque que ataca a casa da frente (a partir do 1-4) | Fortificar: DEF +50%, ATK +40% (20s) |
| Falcão | Sniper | 13 | – | Anti-aéreo (a partir do 1-4) | Olho de Falcão: ATK +60% (15s) |

## Inimigos

| Nome | Notas |
| --- | --- |
| Pacificador | Soldado básico |
| Cão de Patrulha | Rápido e frágil |
| Escudo de Choque | Lento, DEF alta, ocupa 2 de bloqueio |
| Fuzileiro | Dispara a 2 casas enquanto anda |
| Drone de Vigilância | Aéreo, não ataca |
| Drone de Assalto | Aéreo, dispara a 2 casas contra operadores |
| Executor | Muito lento e resistente, ocupa 2 de bloqueio, custa 2 vidas |
| Clérigo | Boss: muito HP, ataques rápidos à distância e corpo-a-corpo, custa 2 vidas |

## Estágios

| # | Nome | Ideia | Unid. |
| --- | --- | --- | --- |
| 1-1 | Refúgio do Setor 7 | Duas entradas que se juntam num corredor | 5 |
| 1-2 | Corredor de Serviço | Um só caminho em serpentina | 5 |
| 1-3 | Avenida da Ordem | Avenida larga; só o caminho do meio bloqueia; Executor no fim | 6 |
| 1-4 | Pátio de Vigilância | Muitos drones (aparecem Bastião e Falcão) | 6 |
| 1-5 | Pátio das Duas Portas | Duas entradas, um único ponto de bloqueio junto à base | 6 |
| 1-6 | Esgotos de Concórdia | Caminho muito longo, Clérigo no fim | 6 |
| 1-7 | Mercado Negro | Três frentes convergem num cruzamento | 7 |
| 1-8 | Fábrica de Serenil | Duas bases independentes | 7 |
| 1-9 | Torre do Conselho | Base no centro, ataques dos dois lados e do ar | 8 |
| 1-10 | Juízo Final | Três frentes, três Clérigos | 8 |

Todos os estágios têm teste automático: sem defesa perde-se, e a IA consegue vencer.
Ao equilibrar, se a IA deixar de ganhar um estágio, o teste falha.

## Deploy automático

- **AUTO: REPLAY**: cada vitória grava todas as ações com o tick exato. O replay da melhor vitória
  (mais estrelas) é repetido tal e qual. Se os dados do jogo mudarem, o replay é descartado.
- **AUTO: IA**: um plano é calculado a partir do mapa. O defensor vai para o ponto onde mais rotas se juntam,
  os vanguards ficam atrás dele, os snipers vão para as plataformas que cobrem mais caminho perto do defensor
  e o medic para a plataforma que cobre mais aliados. Depois coloca-os por ordem à medida que há DP,
  recoloca quem cai e usa skills automáticas. Com várias rotas, garante primeiro um bloqueador por rota.
  Hoje ganha os 10 estágios, alguns à justa (1-9 e 1-10).
- Em ambos os modos, **ASSUMIR** entrega o controlo ao jogador a meio da batalha.

## Próximos passos sugeridos

1. Arte final (ver ART_GUIDE.md), ícone e splash
2. Som e música
3. Desbloqueio progressivo dos estágios e mais capítulos
4. Mais classes (Guard, Caster…) e dano mágico com resistência (RES)
5. Meta-jogo: níveis de operadores, seleção de equipa

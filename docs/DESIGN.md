# Documento de design (v0.3)

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

## Fraquezas

Cada operador causa um ou mais tipos de dano. Quando um ataque acerta numa **fraqueza**, ignora a DEF e faz **×1,5**.
Quando acerta numa **resistência**, faz **metade**. Se as duas se aplicarem, ganha a fraqueza.

| Tipo | Operadores |
| --- | --- |
| Lâmina | Brasa, Faísca |
| Impacto | Muralha, Bastião |
| Perfuração | Corvo, Falcão |
| Antiaéreo | Falcão |
| Explosivo | Trovão |
| Cura | Lírio (também apaga o fogo dos Incineradores) |

## Inimigos

| Inimigo | Mecânica | Fraco a | Resiste a | Operador ideal |
| --- | --- | --- | --- | --- |
| Pacificador | Soldado básico | – | – | Qualquer |
| Cão de Patrulha | Rápido; esquiva-se de metade dos tiros das plataformas | Lâmina | – | Brasa, Faísca |
| Escudo de Choque | Ocupa 2 de bloqueio | Impacto | Lâmina, Perfuração | Muralha, Bastião |
| Fuzileiro | Dispara a 2 casas | Perfuração | – | Corvo, Falcão |
| Drone de Vigilância | Aéreo | Antiaéreo | – | Falcão |
| Drone de Assalto | Aéreo, dispara | Antiaéreo | Perfuração | Falcão |
| Executor | Ocupa 2 de bloqueio, custa 2 vidas | Explosivo | Lâmina | Trovão |
| Incinerador | Incendeia operadores (dano contínuo até ser curado) | Perfuração | – | Lírio + Corvo |
| Infiltrado | Camuflado: as plataformas só o veem quando está bloqueado | Lâmina | – | Brasa, Faísca |
| Enfermeiro do Regime | Cura os inimigos à volta | Perfuração | – | Corvo, Falcão |
| Blindado | Ocupa 3 de bloqueio, custa 2 vidas | Explosivo | Lâmina, Perfuração | Trovão |
| Clérigo (boss) | Esquiva-se de metade dos tiros, custa 2 vidas | Impacto | – | Muralha, Bastião |

A esquiva é determinística (um tiro sim, outro não), para os replays continuarem exatos.

## Estágios

| Capítulo | Estágios | Origem |
| --- | --- | --- |
| 1 Concórdia | 1-1 a 1-10 | Desenhados de raiz (mapas até 16×7) |
| 2 Fronteiras | 2-1 Coração Vulcânico, 2-2 Trilho da Selva, 2-3 Arquipélago, 2-4 Desfiladeiro Vermelho, 2-5 Garganta Profunda, 2-6 Pântano das Passarelas, 2-7 Castelo do Rio, 2-8 Lago Gelado, 2-9 Ruínas Submersas, 2-10 Estação Orbital | Primeira imagem de referência (10 mapas) |
| 3 Terras Perdidas | 3-1 Cidade Fortificada, 3-2 Floresta Ancestral, 3-3 Deserto das Ruínas, 3-4 Montanhas Geladas, 3-5 Pântano Tóxico, 3-6 Ilhas Flutuantes, 3-7 Caverna Abissal, 3-8 Templo Esquecido, 3-9 Vale dos Moinhos, 3-10 Fortaleza do Caos | Segunda imagem de referência (nomes originais) |

Os modelos de referência são verticais e o jogo é horizontal, por isso cada mapa foi rodado: as entradas
(portões de cima ou setas vermelhas) ficam à esquerda e as saídas (setas azuis) ficam à direita. As
entradas laterais dos modelos passam a ficar nas bordas de cima e de baixo. Nas pontes (`,`) não se pode
pôr ninguém; as plataformas (`H`) são os pontos de torre dos modelos.

O número de portais sobe ao longo do jogo: 2 no início e até 6 no fim do capítulo 3 (contando os aéreos `A`).

Os mapas dos capítulos 2 e 3 foram gerados com um pequeno script que desenha caminhos sobre a grelha. O
resultado está em `src/data/levels/chapter2.ts` e `chapter3.ts` e edita-se diretamente.

Todos os estágios têm teste automático: sem defesa perde-se, e a IA consegue vencer.
Se ao equilibrar a IA deixar de ganhar um estágio, o teste falha.

## Deploy automático

- **AUTO: REPLAY**: cada vitória grava todas as ações com o tick exato. O replay da melhor vitória
  (mais estrelas) é repetido tal e qual. Se os dados do jogo mudarem, o replay é descartado.
- **AUTO: IA**: um plano é calculado a partir do mapa. O defensor vai para o ponto onde mais rotas se juntam,
  os vanguards ficam atrás dele, os snipers vão para as plataformas que cobrem mais caminho perto do defensor
  e o medic para a plataforma que cobre mais aliados. Depois coloca-os por ordem à medida que há DP,
  recoloca quem cai e usa skills automáticas. Com várias rotas, garante primeiro um bloqueador por rota.
  Quando há inimigos aéreos, o anti-aéreo entra cedo. Hoje ganha os 30 estágios; o 1-10, o 2-9, o 3-6, o 3-7 e o 3-10 ficam à justa (1 vida).
- Em ambos os modos, **ASSUMIR** entrega o controlo ao jogador a meio da batalha.

## Próximos passos sugeridos

1. Arte final (ver ART_GUIDE.md), ícone e splash
2. Som e música
3. Subida de nível dos operadores, desbloqueio progressivo e o resto do meta-jogo
4. Mais classes (Guard, Caster…) e dano mágico com resistência (RES)
5. Meta-jogo: níveis de operadores, seleção de equipa

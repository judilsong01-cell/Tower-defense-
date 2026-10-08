from PIL import Image, ImageDraw, ImageFont
from hand import render, scale
from sheet import tile_bg
import brasa, ops1, ops2, enemies1, enemies2

F = '/usr/share/fonts/truetype/dejavu/DejaVuSans'
title_f = ImageFont.truetype(F + '-Bold.ttf', 26)
name_f = ImageFont.truetype(F + '-Bold.ttf', 19)
small_f = ImageFont.truetype(F + '.ttf', 13)
tag_f = ImageFont.truetype(F + '-Bold.ttf', 13)

BG = (16, 17, 22, 255)
CARD = (30, 32, 40, 255)
RED = (230, 80, 86, 255)
ICE = (160, 210, 255, 255)
TEXT = (232, 232, 236, 255)
DIM = (150, 154, 166, 255)

ops = dict((n, (r, p)) for n, r, p in ops1.SPRITES + ops2.SPRITES)
ops['Brasa'] = (brasa.ROWS, brasa.PAL)
ens = dict((n, (r, p)) for n, r, p in enemies1.SPRITES + enemies2.SPRITES)

OPS = [
    ('Brasa', 'Vanguard · Lâmina', 'Cabelo ruivo com rabo-de-cavalo, cachecol vermelho, espada.'),
    ('Faísca', 'Vanguard · Lâmina', 'Loira de cabelo espetado, óculos na testa, faca de lâmina invertida.'),
    ('Muralha', 'Defender · Impacto', 'Armadura de aço pesada e escudo de torre com o emblema vermelho.'),
    ('Bastião', 'Defender · Impacto', 'Armadura de bronze, escudo redondo e maça erguida.'),
    ('Lírio', 'Medic · Cura', 'Cabelo longo prateado, bata branca com cruz, mala médica.'),
    ('Corvo', 'Sniper · Perfuração', 'Todo de preto, cachecol vermelho a tapar a boca, espingarda longa.'),
    ('Falcão', 'Sniper · Antiaéreo', 'Cabelo grisalho, óculos de aviador, espingarda apontada ao céu.'),
    ('Trovão', 'Sniper · Explosivo', 'Gorro verde-oliva, lança-granadas ao ombro.'),
]
ENS = [
    ('Pacificador', 'Fraco a: nada', 'Soldado-padrão: capacete branco sem cara, viseira azul, bastão.'),
    ('Cão de Patrulha', 'Fraco a: Lâmina', 'Cão escuro com placa de armadura e olho azul.'),
    ('Escudo de Choque', 'Fraco a: Impacto', 'Armadura negra e escudo translúcido com visor.'),
    ('Fuzileiro', 'Fraco a: Perfuração', 'Uniforme cinzento e espingarda apontada.'),
    ('Drone', 'Fraco a: Antiaéreo', 'Drone branco de vigilância com lente azul.'),
    ('Drone de Assalto', 'Fraco a: Antiaéreo', 'Drone escuro e blindado, lente vermelha, canhões.'),
    ('Executor', 'Fraco a: Explosivo', 'Armadura negra enorme e martelo de guerra.'),
    ('Incinerador', 'Fraco a: Perfuração', 'Fato de proteção, máscara de gás, depósito e lança-chamas.'),
    ('Infiltrado', 'Fraco a: Lâmina', 'Capuz escuro, olhos ciano, padrão de camuflagem e faca.'),
    ('Enfermeiro', 'Fraco a: Perfuração', 'Branco com cruzes azuis e mala médica do Regime.'),
    ('Blindado', 'Fraco a: Explosivo', 'Veículo blindado com torre, canhão e lagartas.'),
    ('Clérigo (boss)', 'Fraco a: Impacto', 'Casaco negro comprido, gola branca, duas pistolas cruzadas.'),
]


def wrap(text, font, width, draw):
    words, lines, cur = text.split(), [], ''
    for wd in words:
        test = (cur + ' ' + wd).strip()
        if draw.textlength(test, font=font) <= width:
            cur = test
        else:
            lines.append(cur)
            cur = wd
    lines.append(cur)
    return lines


def board(title, subtitle, entries, sprites, start, accent, path, cols=4):
    cw, ch = 330, 450
    rows = (len(entries) + cols - 1) // cols
    img = Image.new('RGBA', (cols * cw + 40, rows * ch + 110), BG)
    d = ImageDraw.Draw(img)
    d.text((24, 20), title, fill=TEXT, font=title_f)
    d.text((24, 58), subtitle, fill=DIM, font=small_f)
    for i, (name, tag, desc) in enumerate(entries):
        x = 20 + (i % cols) * cw
        y = 90 + (i // cols) * ch
        d.rounded_rectangle([x, y, x + cw - 14, y + ch - 14], 10, fill=CARD)
        d.rectangle([x, y + 10, x + 4, y + ch - 24], fill=accent)
        rows_, pal = sprites[name]
        spr = render(rows_, pal)
        img.alpha_composite(scale(spr, 8), (x + 30, y + 36))
        d.text((x + 16, y + 10), f'#{start + i}  {name}', fill=TEXT, font=name_f)
        # in-game look: 2x on a ground tile
        t = scale(tile_bg(), 2)
        t.alpha_composite(scale(spr, 2), (0, -8))
        px_, py_ = x + cw - 14 - 64 - 12, y + 312
        img.alpha_composite(t, (px_, py_))
        d.text((px_ + 6, py_ - 18), 'no jogo', fill=DIM, font=small_f)
        d.text((x + 16, y + 300), tag, fill=accent, font=tag_f)
        for j, line in enumerate(wrap(desc, small_f, cw - 44 - 84, d)):
            d.text((x + 16, y + 322 + j * 18), line, fill=DIM, font=small_f)
        # palette swatches
        cols_used = []
        for r in rows_:
            for c in r:
                if c != '.' and pal[c] not in cols_used:
                    cols_used.append(pal[c])
        for j, hexv in enumerate(cols_used[:18]):
            v = tuple(int(hexv[k:k + 2], 16) for k in (1, 3, 5))
            d.rectangle([x + 16 + j * 16, y + ch - 44, x + 29 + j * 16, y + ch - 31], fill=v + (255,))
    img.save(path)


board('Operadores da Resistência', 'Ampliados 8x · "no jogo" = tamanho real em cima de uma casa · cores da paleta em baixo',
      OPS, ops, 1, RED, 'modelos_operadores.png')
board('Inimigos do Regime', 'Ampliados 8x · "no jogo" = tamanho real em cima de uma casa · o Clérigo aparece a 125% no jogo',
      ENS, ens, 9, ICE, 'modelos_inimigos.png')
print('ok')

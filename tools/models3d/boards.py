from PIL import Image, ImageDraw, ImageFont

F = '/usr/share/fonts/truetype/dejavu/DejaVuSans'
title_f = ImageFont.truetype(F + '-Bold.ttf', 30)
name_f = ImageFont.truetype(F + '-Bold.ttf', 21)
small_f = ImageFont.truetype(F + '.ttf', 14)
tag_f = ImageFont.truetype(F + '-Bold.ttf', 14)
BG = (16, 17, 22, 255)
RED = (235, 86, 92, 255)
ICE = (150, 205, 255, 255)
TEXT = (234, 234, 238, 255)
DIM = (150, 154, 166, 255)

OPS = [
    ('brasa', 'Brasa', 'Vanguard · Lâmina', 'Ruiva de rabo-de-cavalo, casaco comprido, cachecol vermelho e espada.'),
    ('faisca', 'Faísca', 'Vanguard · Lâmina', 'Cabelo loiro espetado, óculos na testa, casaco aberto e faca.'),
    ('muralha', 'Muralha', 'Defender · Impacto', 'Armadura de aço com ombreiras e escudo de torre com cruz vermelha.'),
    ('bastiao', 'Bastião', 'Defender · Impacto', 'Barbudo, armadura de bronze, escudo redondo e maça com pontas.'),
    ('lirio', 'Lírio', 'Medic · Cura', 'Cabelo prateado comprido, bata branca com cruz e mala médica.'),
    ('corvo', 'Corvo', 'Sniper · Perfuração', 'Casaco preto comprido, cachecol vermelho a tapar a boca, espingarda.'),
    ('falcao', 'Falcão', 'Sniper · Antiaéreo', 'Grisalho, óculos de aviador, espingarda apontada ao céu.'),
    ('trovao', 'Trovão', 'Sniper · Explosivo', 'Gorro verde, cinto de granadas e lança-granadas ao ombro.'),
]
ENS = [
    ('peacekeeper', 'Pacificador', 'Fraco a: nada', 'Capacete branco sem rosto com viseira luminosa e bastão.'),
    ('hound', 'Cão de Patrulha', 'Fraco a: Lâmina', 'Cão escuro com placa de armadura e olhos azuis.'),
    ('riot', 'Escudo de Choque', 'Fraco a: Impacto', 'Armadura negra e escudo translúcido com visor.'),
    ('rifleman', 'Fuzileiro', 'Fraco a: Perfuração', 'Uniforme cinzento, capacete e espingarda.'),
    ('drone', 'Drone', 'Fraco a: Antiaéreo', 'Drone branco de quatro hélices com lente azul.'),
    ('gunship', 'Drone de Assalto', 'Fraco a: Antiaéreo', 'Drone escuro com lente vermelha e dois canhões.'),
    ('executor', 'Executor', 'Fraco a: Explosivo', 'Gigante de armadura negra com martelo de guerra.'),
    ('incinerator', 'Incinerador', 'Fraco a: Perfuração', 'Fato de proteção, máscara de gás, depósitos e lança-chamas.'),
    ('infiltrator', 'Infiltrado', 'Fraco a: Lâmina', 'Capuz escuro, olhos ciano, padrão de camuflagem e faca.'),
    ('medic', 'Enfermeiro', 'Fraco a: Perfuração', 'Capacete branco com cruz azul e mala médica do Regime.'),
    ('armored', 'Blindado', 'Fraco a: Explosivo', 'Blindado branco com torre, canhão e lagartas.'),
    ('cleric', 'Clérigo (boss)', 'Fraco a: Impacto', 'Casaco negro, gola branca, olhar frio e duas pistolas.'),
]


def wrap(text, font, width, d):
    words, lines, cur = text.split(), [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if d.textlength(t, font=font) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = wd
    lines.append(cur)
    return lines


def card_bg(w, h, accent):
    bg = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(bg)
    for y in range(h):
        k = y / h
        c = (int(38 - 14 * k), int(40 - 14 * k), int(50 - 16 * k), 255)
        d.line([(0, y), (w, y)], fill=c)
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, w - 1, h - 1], 14, fill=255)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(bg, (0, 0), mask)
    ImageDraw.Draw(out).rectangle([0, 14, 4, h - 14], fill=accent)
    return out


def board(title, sub, entries, start, accent, path, cols=4):
    cw, ch = 360, 520
    rows = (len(entries) + cols - 1) // cols
    img = Image.new('RGBA', (cols * cw + 40, rows * ch + 110), BG)
    d = ImageDraw.Draw(img)
    d.text((24, 18), title, fill=TEXT, font=title_f)
    d.text((24, 60), sub, fill=DIM, font=small_f)
    for i, (rid, name, tag, desc) in enumerate(entries):
        x = 20 + (i % cols) * cw
        y = 92 + (i // cols) * ch
        img.alpha_composite(card_bg(cw - 14, ch - 14, accent), (x, y))
        front = Image.open(f'r_{rid}_front.png').convert('RGBA').resize((300, 358), Image.LANCZOS)
        back = Image.open(f'r_{rid}_back.png').convert('RGBA').resize((110, 131), Image.LANCZOS)
        img.alpha_composite(front, (x + 4, y + 30))
        img.alpha_composite(back, (x + cw - 14 - 118, y + 270))
        d.text((x + cw - 14 - 104, y + 400), 'de costas', fill=DIM, font=small_f)
        d.text((x + 18, y + 12), f'#{start + i}  {name}', fill=TEXT, font=name_f)
        d.text((x + 18, y + 400), tag, fill=accent, font=tag_f)
        for j, line in enumerate(wrap(desc, small_f, cw - 50, d)):
            d.text((x + 18, y + 428 + j * 19), line, fill=DIM, font=small_f)
    img.save(path)


board('Operadores da Resistência · 3D', 'Modelos 3D com sombreado cartoon e contorno · vista principal e de costas', OPS, 1, RED, 'modelos3d_operadores.png')
board('Inimigos do Regime · 3D', 'Modelos 3D com sombreado cartoon e contorno · vista principal e de costas', ENS, 9, ICE, 'modelos3d_inimigos.png')
print('ok')

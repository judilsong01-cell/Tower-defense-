"""Contact sheet: each sprite at 8x plus 2x on a ground tile, with its name."""
from PIL import Image, ImageDraw, ImageFont
from hand import scale


def tile_bg(color=(125, 128, 136, 255)):
    t = Image.new('RGBA', (32, 32), color)
    d = ImageDraw.Draw(t)
    d.line([(0, 0), (31, 0)], fill=(154, 157, 165, 255))
    d.line([(0, 0), (0, 31)], fill=(154, 157, 165, 255))
    d.line([(0, 31), (31, 31)], fill=(85, 88, 95, 255))
    d.line([(31, 0), (31, 31)], fill=(85, 88, 95, 255))
    return t


def sheet(items, path, cols=4, big=8):
    cw = 32 * big + 32 * 2 + 40
    ch = 32 * big + 40
    rows = (len(items) + cols - 1) // cols
    img = Image.new('RGBA', (cols * cw, rows * ch), (18, 19, 24, 255))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
    except OSError:
        font = ImageFont.load_default()
    for i, (name, sprite) in enumerate(items):
        x = (i % cols) * cw + 10
        y = (i // cols) * ch + 8
        d.rectangle([x - 2, y + 22, x + 32 * big + 1, y + 22 + 32 * big + 1], fill=(34, 36, 44, 255))
        img.alpha_composite(scale(sprite, big), (x, y + 24))
        bg = scale(tile_bg(), 2)
        bg.alpha_composite(scale(sprite, 2), (0, -8 * 2 + 16))
        img.alpha_composite(bg, (x + 32 * big + 12, y + 24 + 32 * big - 64))
        d.text((x, y), name, fill=(230, 230, 230, 255), font=font)
    img.save(path)

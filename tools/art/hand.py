"""Hand-drawn sprites: 32x32 ASCII maps with explicit palettes; outline is added automatically."""
from PIL import Image

OUTLINE = (21, 15, 28, 255)


def hexc(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def compose(layers):
    """layers: list of (rows, x, y). Later layers overwrite; '.' is transparent."""
    grid = [['.'] * 32 for _ in range(32)]
    for rows, ox, oy in layers:
        for dy, row in enumerate(rows):
            for dx, ch in enumerate(row):
                if ch == '.':
                    continue
                x, y = ox + dx, oy + dy
                if 0 <= x < 32 and 0 <= y < 32:
                    grid[y][x] = ' ' if ch == '_' else ch
    return [''.join(r).replace(' ', '.') for r in grid]


def render(rows, pal, outline=True, w=32, h=32):
    assert len(rows) == h, f'expected {h} rows, got {len(rows)}'
    for i, r in enumerate(rows):
        assert len(r) == w, f'row {i} has {len(r)} chars: {r!r}'
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == '.':
                continue
            if ch not in pal:
                raise KeyError(f'colour {ch!r} at {x},{y} missing from palette')
            img.putpixel((x, y), hexc(pal[ch]))
    if outline:
        src = img.copy()
        for y in range(h):
            for x in range(w):
                if src.getpixel((x, y))[3]:
                    continue
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and src.getpixel((nx, ny))[3] and (nx, ny, 'no') not in ():
                        img.putpixel((x, y), OUTLINE)
                        break
    return img


def scale(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)

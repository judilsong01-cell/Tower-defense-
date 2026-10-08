"""Packs the exported frames (export/<id>_<row>_<frame>.png) into game sprite sheets and
registers them in public/assets/manifest.json. Run after `node export.mjs`."""
import json
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OPS = ['brasa', 'faisca', 'muralha', 'bastiao', 'lirio', 'corvo', 'falcao', 'trovao']
ENS = ['peacekeeper', 'hound', 'riot', 'rifleman', 'drone', 'gunship', 'executor', 'incinerator',
       'infiltrator', 'medic', 'armored', 'cleric']
PX, N = 192, 8
FEET = PX - 12

out_dir = os.path.join(ROOT, 'public', 'assets', 'units')
os.makedirs(out_dir, exist_ok=True)
manifest_path = os.path.join(ROOT, 'public', 'assets', 'manifest.json')
manifest = json.load(open(manifest_path, encoding='utf-8'))
sprites = manifest.setdefault('sprites', {})

for uid in OPS + ENS:
    sheet = Image.new('RGBA', (PX * N, PX * 2), (0, 0, 0, 0))
    top = PX
    for r in range(2):
        for i in range(N):
            fr = Image.open(f'export/{uid}_{r}_{i}.png').convert('RGBA')
            sheet.paste(fr, (i * PX, r * PX))
            box = fr.getchannel('A').point(lambda v: 255 if v > 80 else 0).getbbox()
            if box and r == 0:
                top = min(top, box[1])
    sheet.save(os.path.join(out_dir, f'{uid}.png'), optimize=True)
    is_op = uid in OPS
    sprites[('op_' if is_op else 'en_') + uid] = {
        'file': f'units/{uid}.png', 'frameWidth': PX, 'frameHeight': PX,
        'scale': 0.5, 'originY': round(FEET / PX, 4), 'top': FEET - top, 'smooth': True, 'baked': True,
        'anims': ({'idle': {'frames': list(range(0, 8)), 'fps': 8}, 'attack': {'frames': list(range(8, 16)), 'fps': 16}} if is_op else
                  {'move': {'frames': list(range(0, 8)), 'fps': 10}, 'attack': {'frames': list(range(8, 16)), 'fps': 14}}),
    }

json.dump(manifest, open(manifest_path, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
print('sheets written to', out_dir)

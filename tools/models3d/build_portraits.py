# Packs portrait/<id>_<i>.png (576 px idle frames) into 4x2 sheets in public/assets/units/portrait/.
import os
from PIL import Image

OPS = ['brasa', 'faisca', 'muralha', 'bastiao', 'lirio', 'corvo', 'falcao', 'trovao']
PX = 576
# Every frame is cropped to the same box (union of all operators' frames), so the feet stay at
# x = 50%, y = 284 / 320 of each 360x320 frame (PORTRAIT in src/game/art.ts).
CROP = (108, 256, 468, 576)
FW, FH = CROP[2] - CROP[0], CROP[3] - CROP[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'assets', 'units', 'portrait')
os.makedirs(OUT, exist_ok=True)
for op in OPS:
    sheet = Image.new('RGBA', (FW * 4, FH * 2))
    for i in range(8):
        frame = Image.open(f'portrait/{op}_{i}.png').crop(CROP)
        sheet.paste(frame, ((i % 4) * FW, (i // 4) * FH))
    path = os.path.join(OUT, f'{op}.png')
    sheet.save(path, optimize=True)
    print(op, os.path.getsize(path))

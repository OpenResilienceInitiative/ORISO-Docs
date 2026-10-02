import time, json
import numpy as np
from PIL import Image, ImageDraw, ImageChops
S = '/private/tmp/claude-501/-Users-frankgerhardt-ORISO/ed79c73a-5ff2-4bd7-8e58-5fe1a14a1dbb/scratchpad/trial/'
OUT = '/Users/frankgerhardt/ORISO/ORISO-Docs/.claude/worktrees/agent-a27e6cb8da2b24836/research/screens/screenshot-strategy/'
import os; os.makedirs(OUT, exist_ok=True)
stories = ['both-active', 'forward-only', 'header-rail']
t0 = time.time()
stats = []
for vp in ['desktop', 'mobile']:
    rows = []
    for s in stories:
        n = f'{s}-{vp}'
        b = Image.open(S + n + '-before.png').convert('RGB')
        row = {'name': n}
        imgs = {'before': b}
        for v in ['after', 'control']:
            a = Image.open(S + f'{n}-{v}.png').convert('RGB')
            imgs[v] = a
            d = np.abs(np.asarray(b, dtype=int) - np.asarray(a, dtype=int)).max(axis=2)
            row[v] = {'px_changed': int((d > 0).sum()), 'px_total': int(d.size), 'max_channel_delta': int(d.max())}
        # crop box: non-background pixels in before
        arr = np.asarray(b, dtype=int)
        bg = arr[2, 2]
        m = (np.abs(arr - bg).max(axis=2) > 0)
        ys, xs = np.where(m)
        box = (max(xs.min() - 20, 0), max(ys.min() - 20, 0), min(xs.max() + 20, b.width), min(ys.max() + 20, b.height))
        row['crop'] = box
        # diff image of control amplified
        dc = ImageChops.difference(imgs['before'], imgs['control']).point(lambda x: 255 if x else 0)
        imgs['diff (control, amplified)'] = dc
        rows.append((n, {k: v.crop(box) for k, v in imgs.items()}))
        stats.append(row)
    cols = ['before', 'after', 'control', 'diff (control, amplified)']
    lab = {'before': 'BEFORE', 'after': 'AFTER (token swap)', 'control': 'CONTROL (+9 RGB)', 'diff (control, amplified)': 'DIFF of control, amplified'}
    cw = max(r[1]['before'].width for r in rows)
    ch = [r[1]['before'].height for r in rows]
    W = cw * 4 + 5 * 8
    H = sum(ch) + len(rows) * 28 + 8
    sheet = Image.new('RGB', (W, H), (255, 255, 255))
    dr = ImageDraw.Draw(sheet)
    y = 4
    for (n, im), h in zip(rows, ch):
        dr.text((8, y), n, fill=(0, 0, 0))
        y += 14
        for i, c in enumerate(cols):
            x = 8 + i * (cw + 8)
            dr.text((x, y), lab[c], fill=(90, 0, 0))
            sheet.paste(im[c], (x, y + 12))
        y += h + 14
    sheet = sheet.crop((0, 0, W, y))
    sheet.save(OUT + f'sheet-{vp}.png', optimize=True)
print('pixel+sheet seconds', round(time.time() - t0, 2))
print(json.dumps(stats, default=int))

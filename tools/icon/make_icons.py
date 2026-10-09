"""Dựng icon app (PWA / màn hình chính) từ đúng chữ KEM TRỘN của màn tiêu đề.
Dùng: python3 tools/icon/make_icons.py http://127.0.0.1:5180/  → public/icons/*.png
Chụp màn tiêu đề sau khi dấu nặng rơi xong, ẩn mọi thứ trừ nền hồng + logo, cắt vuông quanh logo."""
import sys, io
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5180/'
out = Path(__file__).resolve().parents[2] / 'public' / 'icons'
out.mkdir(parents=True, exist_ok=True)
DSF = 4

HIDE = """
for (const s of ['.ts-sub','.ts-rays-pos','.ts-jar-pos','.ts-beans','.ts-btns','.ts-foot','.gear-wrap','.ts-install']) document.querySelectorAll(s).forEach(e => e.style.visibility = 'hidden');
const logo = document.querySelector('.ts-logo'); logo.style.top = '260px';
"""
BOX = """() => {
  const rs = ['.ts-k','.ts-t','.ts-drip','.ts-dot'].map(s => document.querySelector(s).getBoundingClientRect());
  const l = Math.min(...rs.map(r => r.left)), t = Math.min(...rs.map(r => r.top)), r = Math.max(...rs.map(r => r.right)), b = Math.max(...rs.map(r => r.bottom));
  return { l, t, r, b };
}"""

def shot(pg, fill):
    b = pg.evaluate(BOX)
    cx, cy = (b['l'] + b['r']) / 2, (b['t'] + b['b']) / 2
    side = max(b['r'] - b['l'], b['b'] - b['t']) / fill
    png = pg.screenshot(clip={'x': cx - side / 2, 'y': cy - side / 2, 'width': side, 'height': side})
    return Image.open(io.BytesIO(png)).convert('RGB')

with sync_playwright() as p:
    br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = br.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=DSF)
    pg.goto(url, wait_until='networkidle')
    pg.wait_for_timeout(3500)  # logo bật + kem chảy + dấu nặng rơi xong
    pg.evaluate(HIDE)
    pg.wait_for_timeout(300)
    full = shot(pg, 0.95)   # icon thường: logo phủ ~95% (iOS bo góc chỉ ăn mép vạch kem)
    mask = shot(pg, 0.74)   # maskable: logo nằm trong vùng an toàn (hình tròn 80%)
    br.close()

for size, img, name in [(512, full, 'icon-512.png'), (192, full, 'icon-192.png'), (180, full, 'apple-touch-icon.png'),
                        (512, mask, 'maskable-512.png'), (192, mask, 'maskable-192.png')]:
    img.resize((size, size), Image.LANCZOS).save(out / name, optimize=True)
    print('wrote', out / name)

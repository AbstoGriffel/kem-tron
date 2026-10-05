"""Chụp ảnh màn hình game 390x844 bằng Chrome hệ thống. Dùng: python3 shot.py <url> <out.png> [js]"""
import sys
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]
js = sys.argv[3] if len(sys.argv) > 3 else None
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2, has_touch=True, is_mobile=True)
    logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto(url, wait_until='networkidle')
    pg.wait_for_timeout(800)
    if js:
        pg.evaluate(js)
        pg.wait_for_timeout(1200)
    pg.screenshot(path=out)
    for l in logs: print(l)
    b.close()

"""Chơi thử tự động 1 đơn và chụp ảnh từng bước. python3 playtest.py [outdir]"""
import sys, math, os
from playwright.sync_api import sync_playwright
def cell(pg, id):
    pg.evaluate(f"__game.shop.drawer.showTabOf('{id}')"); pg.wait_for_timeout(150)
    c = pg.evaluate(f"__game.shop.drawer.cellCenter('{id}')")
    return c['x'], c['y']
def bowlxy(pg):
    return pg.evaluate("(() => { const b = __game.shop.bowl.creamCenter; return [b.x, b.y]; })()")

out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-1003/kt/pt'
os.makedirs(out, exist_ok=True)
logs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'PAGEERROR: {e}'))
    pg.goto('http://localhost:5180/', wait_until='networkidle')
    pg.evaluate("localStorage.clear()")
    pg.reload(wait_until='networkidle')
    pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{out}/0-title.png')
    pg.locator('.b-new').click()
    pg.wait_for_timeout(1400)
    pg.screenshot(path=f'{out}/0b-morning.png')
    pg.locator('.mo-btn.go').click()
    pg.wait_for_timeout(3600)
    pg.screenshot(path=f'{out}/1-customer.png')
    m = pg.mouse
    # chọn cốt kem trơn
    def drag(x0, y0, x1, y1, steps=12):
        m.move(x0, y0); m.down(); 
        for i in range(1, steps + 1):
            m.move(x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps); pg.wait_for_timeout(16)
        m.up(); pg.wait_for_timeout(500)
    x_,y_=cell(pg,'kem_tron'); bb_=bowlxy(pg); drag(x_,y_,bb_[0],bb_[1]+10); pg.wait_for_timeout(700)
    # tab CHỢ: nghệ (cột 0), chanh (cột 1)
    bx_,by_=bowlxy(pg); x_,y_=cell(pg,'nghe'); drag(x_, y_, bx_, by_+20)
    x_,y_=cell(pg,'chanh'); drag(x_, y_, bx_, by_+20)
    pg.screenshot(path=f'{out}/2-added.png')
    # khuấy: bắt đầu trong thau
    cx, cy = bowlxy(pg)
    m.move(cx + 60, cy); m.down()
    for i in range(1, 4 * 28 + 1):
        a = i / 28 * 2 * math.pi
        m.move(cx + math.cos(a) * 60, cy + math.sin(a) * 22); pg.wait_for_timeout(12)
        if i == 40: pg.screenshot(path=f'{out}/3-stirring.png')
    m.up(); pg.wait_for_timeout(1300)
    pg.screenshot(path=f'{out}/4-pack.png')
    pg.locator('.pk-jar').nth(0).click(); pg.wait_for_timeout(300)
    pg.locator('.pk-label').nth(0).click(); pg.wait_for_timeout(400)
    bx = pg.locator('.pack-jar').bounding_box()
    drag(bx['x'] + bx['width'] / 2, bx['y'] + bx['height'] / 2, 236, 150, 16)
    pg.wait_for_timeout(2600)
    pg.screenshot(path=f'{out}/5-react.png')
    pg.wait_for_timeout(2500)
    pg.screenshot(path=f'{out}/6-after.png')
    b.close()
for l in logs: print(l)

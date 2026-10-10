import sys, json
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/2755271a-de2a-5d43-947e-9abd49bf1c60/scratchpad/'
url='file:///home/claude/ultimo-en-pie/dist/ultimo-en-pie.html'
vw,vh,tag = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
champ = sys.argv[4] if len(sys.argv)>4 else 'kenji'
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':vw,'height':vh}, device_scale_factor=1)
    errs=[]
    pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('console', lambda m: errs.append('console.'+m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.evaluate(f"window.__UEP.select('{champ}')"); pg.wait_for_timeout(1500)
    pg.screenshot(path=SP+f'{tag}-select.png')
    pg.evaluate(f"window.__UEP.start('{champ}', 777)")
    pg.wait_for_timeout(900); pg.screenshot(path=SP+f'{tag}-intro.png')
    pg.wait_for_timeout(5000); pg.screenshot(path=SP+f'{tag}-b1.png')
    pg.evaluate("window.__UEP.setSpeed(4)")
    pg.wait_for_timeout(6000); pg.screenshot(path=SP+f'{tag}-b2.png')
    st = pg.evaluate("(()=>{const B=window.__UEP.B;return {t:B.M.t, alive:B.M.aliveN, champAlive:B.M.champ.alive, parts:B.R.parts.length}})()")
    print('state', st)
    pg.wait_for_timeout(6000); pg.screenshot(path=SP+f'{tag}-b3.png')
    pg.click('#b-skip'); pg.wait_for_timeout(800)
    pg.screenshot(path=SP+f'{tag}-results.png', full_page=True)
    print('errors', errs[:10])
    b.close()

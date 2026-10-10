import sys, time
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/2755271a-de2a-5d43-947e-9abd49bf1c60/scratchpad/'
url='file:///home/claude/ultimo-en-pie/dist/ultimo-en-pie.html'
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':430,'height':932})
    errs=[]
    pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('console', lambda m: errs.append('console.'+m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.goto(url); pg.wait_for_timeout(800)
    for gore, champ, seed in [('2','gorgo',31337),('0','abuela',4242)]:
        pg.click('#more')
        pg.click(f'#opt-gore button[data-v="{gore}"]')
        pg.click('#more')
        pg.evaluate(f"window.__UEP.start('{champ}', {seed})")
        pg.evaluate("window.__UEP.setSpeed(4)")
        t0=time.time(); shot=False
        while time.time()-t0 < 90:
            pg.wait_for_timeout(1000)
            st = pg.evaluate("(()=>{const B=window.__UEP.B;return B?{t:B.M.t,alive:B.M.aliveN,res:B.results,parts:B.R.parts.length,corpses:B.R.corpses.length}:null})()")
            if not shot and st and st['alive']<=14:
                pg.screenshot(path=SP+f'gore{gore}.png'); shot=True
            if st and st['res']: break
        print('gore',gore,'final',st,'secs',round(time.time()-t0,1))
        pg.screenshot(path=SP+f'gore{gore}-res.png')
        pg.click('#r-pick'); pg.wait_for_timeout(500)
    print('errors', errs[:10])
    b.close()

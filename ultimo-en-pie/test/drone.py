import sys
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/2755271a-de2a-5d43-947e-9abd49bf1c60/scratchpad/'
url='file:///home/claude/ultimo-en-pie/dist/ultimo-en-pie.html'
vw,vh,tag,champ,seed = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':vw,'height':vh})
    errs=[]
    pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
    pg.on('console', lambda m: errs.append('console.'+m.type+': '+m.text) if m.type in ('error','warning') else None)
    pg.goto(url); pg.wait_for_timeout(800)
    pg.evaluate("window.__UEP.S.cam='drone'")
    pg.evaluate(f"window.__UEP.start('{champ}', {seed})")
    pg.wait_for_timeout(1200); pg.screenshot(path=SP+f'{tag}-d0.png')
    pg.wait_for_timeout(4500); pg.screenshot(path=SP+f'{tag}-d1.png')
    perf = pg.evaluate("(()=>{const R=window.__UEP.B.R;const t0=performance.now();for(let i=0;i<40;i++)R.frame3d(0.016);return ((performance.now()-t0)/40).toFixed(2)})()")
    perf2 = pg.evaluate("(()=>{const R=window.__UEP.B.R;const t0=performance.now();for(let i=0;i<40;i++)R.frame(0.016);return ((performance.now()-t0)/40).toFixed(2)})()")
    print('ms/frame 3d', perf, '2d', perf2)
    pg.evaluate("window.__UEP.setSpeed(4)")
    kc=False
    for i in range(80):
        pg.wait_for_timeout(500)
        st = pg.evaluate("(()=>{const B=window.__UEP.B;return {t:B.M.t,alive:B.M.aliveN,kc:B.kc?B.kc.label:null,res:B.results}})()")
        if st['kc'] and not kc and i>2:
            pg.evaluate("window.__UEP.setSpeed(1)"); pg.wait_for_timeout(900)
            pg.screenshot(path=SP+f'{tag}-kc.png'); kc=True; print('killcam', st)
            pg.evaluate("window.__UEP.setSpeed(4)")
        if st['alive']<=12 and not st['kc']:
            pass
        if st['res']: break
    print('final', st)
    pg.screenshot(path=SP+f'{tag}-dres.png')
    print('errors', errs[:8])
    b.close()

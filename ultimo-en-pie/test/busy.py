import sys
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/2755271a-de2a-5d43-947e-9abd49bf1c60/scratchpad/'
url='file:///home/claude/ultimo-en-pie/dist/ultimo-en-pie.html'
vw,vh,dpr,tag,champ,seed,cam = int(sys.argv[1]),int(sys.argv[2]),float(sys.argv[3]),sys.argv[4],sys.argv[5],sys.argv[6],sys.argv[7]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':vw,'height':vh}, device_scale_factor=dpr); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_function('window.__UEP && window.__UEP.S', timeout=30000)
    pg.evaluate(f"window.__UEP.S.cam='{cam}'; window.__UEP.S.killcam=false")
    pg.evaluate(f"window.__UEP.start('{champ}', {seed})"); pg.evaluate("window.__UEP.setSpeed(4)")
    for i in range(60):
        pg.wait_for_timeout(500)
        st=pg.evaluate("(()=>{const B=window.__UEP.B;return {t:B.M.t,alive:B.M.aliveN,ca:B.M.champ.alive}})()")
        if st['alive']<=22: break
    pg.evaluate("window.__UEP.setSpeed(1)"); pg.wait_for_timeout(1200)
    pg.screenshot(path=SP+tag+'.png'); print(tag, st, 'errors', errs[:3]); b.close()

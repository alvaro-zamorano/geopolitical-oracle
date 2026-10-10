import sys
from playwright.sync_api import sync_playwright
SP='/tmp/claude-0/-home-claude/2755271a-de2a-5d43-947e-9abd49bf1c60/scratchpad/'
url='file:///home/claude/ultimo-en-pie/dist/ultimo-en-pie.html'
vw,vh,dpr,tag = int(sys.argv[1]),int(sys.argv[2]),float(sys.argv[3]),sys.argv[4]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':vw,'height':vh}, device_scale_factor=dpr); pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
    pg.goto(url); pg.wait_for_function('window.__UEP && window.__UEP.S', timeout=30000)
    pg.evaluate("window.__UEP.select('kenji')"); pg.wait_for_timeout(300)
    pg.click('#go'); pg.wait_for_timeout(1200)
    box=pg.locator('#pp-map').bounding_box()
    pg.mouse.click(box['x']+box['width']*0.62, box['y']+box['height']*0.40); pg.wait_for_timeout(200)
    pg.locator('#pp-perks .perk').nth(1).click(); pg.wait_for_timeout(200)
    pg.screenshot(path=SP+tag+'-prep.png', full_page=False)
    info=pg.inner_text('#pp-info'); print('info', info.replace('\n',' | '))
    pg.click('#pp-go'); pg.wait_for_timeout(5000)
    st=pg.evaluate("(()=>{const B=window.__UEP.B,C=B.M.champ;return {perk:C.perk,x:Math.round(C.x),y:Math.round(C.y),fav:B.fav,t:+B.M.t.toFixed(1)}})()"); print('after jump', st)
    pg.screenshot(path=SP+tag+'-jump.png')
    # contraataque
    pg.evaluate("window.__UEP.useFavor('spin')"); pg.wait_for_timeout(450); pg.screenshot(path=SP+tag+'-qte.png')
    pg.evaluate("window.__UEP.qteTap()"); pg.wait_for_timeout(300)
    # rayo
    pg.evaluate("(()=>{const B=window.__UEP.B;B.fav=2})()")
    pg.evaluate("window.__UEP.useFavor('bolt')"); pg.wait_for_timeout(400)
    aim=pg.evaluate("!!window.__UEP.B.aim"); pg.screenshot(path=SP+tag+'-aim.png'); print('aiming', aim)
    print('errors', errs[:5]); b.close()

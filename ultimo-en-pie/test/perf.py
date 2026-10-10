import sys, json
from playwright.sync_api import sync_playwright
url='file:///home/claude/ultimo-en-pie/dist/ultimo-en-pie.html'
vw,vh,dpr,thr = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
JS = """(mode)=>{const B=window.__UEP.B,R=B.R;const n=40;let t0=performance.now();
for(let i=0;i<n;i++){ if(mode==='3d'){R.cam3Update(0.016,'chase',R.follow||B.M.champ,null,false);R.frame3d(0.016);} else R.frame(0.016);}
return ((performance.now()-t0)/n).toFixed(2)}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':vw,'height':vh}, device_scale_factor=dpr)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(url); pg.wait_for_function('window.__UEP && window.__UEP.S', timeout=30000); pg.wait_for_timeout(500)
    if thr>1:
        cdp=ctx.new_cdp_session(pg); cdp.send('Emulation.setCPUThrottlingRate',{'rate':thr})
    out={}
    for hd in [True, False]:
        pg.evaluate(f"window.__UEP.S.hd={'true' if hd else 'false'}")
        t=pg.evaluate("(()=>{const t0=performance.now();window.__UEP.start('kenji',777);return (performance.now()-t0).toFixed(0)})()")
        pg.evaluate("window.__UEP.setSpeed(4)"); pg.wait_for_timeout(int(7000*max(1,thr/2)))
        st=pg.evaluate("(()=>{const B=window.__UEP.B;return {t:+B.M.t.toFixed(1),alive:B.M.aliveN,parts:B.R.parts.length}})()")
        out['hd' if hd else 'clasico']={'start_ms':t,'2d_ms':pg.evaluate(JS,'2d'),'3d_ms':pg.evaluate(JS,'3d'),'state':st,
          'canvas':pg.evaluate("[document.getElementById('game').width,document.getElementById('game').height,document.getElementById('game').style.width]")}
        pg.click('#b-exit'); pg.wait_for_timeout(300)
    print(json.dumps(out)); print('errors',errs[:5]); b.close()

import sys
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv)>3 else 1500
h = int(sys.argv[4]) if len(sys.argv)>4 else 1000
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width':w,'height':h})
    errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
    pg.goto(url); pg.wait_for_timeout(500)
    print('title', pg.title(), 'errors', errs)
    pg.screenshot(path=out)
    b.close()

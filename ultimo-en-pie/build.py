import pathlib
root = pathlib.Path(__file__).parent
order = ['util','weapons','roster','sprites','hd','world','sim','render','render3d','audio','meta','main']
import re, collections, sys
seen = collections.defaultdict(list)
for f in order:
    for line in (root/'src'/f'{f}.js').read_text().splitlines():
        m = re.match(r'^(?:async\s+)?function\s+(\w+)\s*\(', line) or re.match(r'^(?:const|let|var)\s+(\w+)\s*=', line)
        if m: seen[m.group(1)].append(f)
dup = {k: v for k, v in seen.items() if len(v) > 1}
if dup: sys.exit('nombres duplicados entre archivos: ' + str(dup))
js = '\n'.join((root/'src'/f'{f}.js').read_text() for f in order)
js = "(function () {\n" + js + "\n})();"
tpl = (root/'src'/'index.html').read_text()
out = tpl.replace('/*SCRIPT*/', js)
(root/'dist').mkdir(exist_ok=True)
for name in ('index.html', 'ultimo-en-pie.html'):
    (root/'dist'/name).write_text(out)
print('ok', len(out)//1024, 'KB')

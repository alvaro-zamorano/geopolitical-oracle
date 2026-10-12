import pathlib, re, collections, sys, hashlib, json, subprocess, tempfile
root = pathlib.Path(__file__).parent
src = root / 'src'

def check_dups(order):
    seen = collections.defaultdict(list)
    for f in order:
        for line in (src / f'{f}.js').read_text().splitlines():
            m = re.match(r'^(?:async\s+)?function\s+(\w+)\s*\(', line) or re.match(r'^(?:const|let|var)\s+(\w+)\s*=', line)
            if m: seen[m.group(1)].append(f)
    dup = {k: v for k, v in seen.items() if len(v) > 1}
    if dup: sys.exit('nombres duplicados entre archivos: ' + str(dup))

def bundle(order):
    check_dups(order)
    return '\n'.join((src / f'{f}.js').read_text() for f in order)

dist = root / 'dist'
dist.mkdir(exist_ok=True)

# 1) juego para humanos: matemáticas nativas, igual que siempre
human = ['util', 'mathx', 'weapons', 'roster', 'sprites', 'hd', 'world', 'sim', 'render', 'render3d', 'audio', 'meta', 'main']
out = (src / 'index.html').read_text().replace('/*SCRIPT*/', "(function () {\n" + bundle(human) + "\n})();")
for name in ('index.html', 'ultimo-en-pie.html'):
    (dist / name).write_text(out)
print('humanos ok', len(out) // 1024, 'KB')

# 2) liga de agentes: la misma simulación con matemáticas deterministas (idéntica en servidor y navegadores)
SIM = ['util', 'mathdet', 'weapons', 'roster', 'world', 'sim', 'liga']
sim_js = bundle(SIM)
SIM_VERSION = hashlib.sha256(sim_js.encode()).hexdigest()[:12]
EXPORTS = ['ROSTER', 'ROSTER_BY_ID', 'BIOMES', 'PERKS', 'PERK_IDS', 'createMatch', 'stepMatch', 'placeFighter', 'validDrop', 'applyPerk',
           'favorHeal', 'favorBolt', 'favorSpin', 'spinQuality', 'NOFX',
           'LIGA_FAV_INICIO', 'LIGA_FAV_MAX', 'ligaSetEstilo', 'ligaAplicar', 'ligaPreparar', 'ligaHuella', 'DT', 'SIGHT', 'MAP_W', 'MAP_H', 'dist', 'RNG']
arena = dist / 'arena'
arena.mkdir(exist_ok=True)
(arena / 'sim.mjs').write_text(f"/* simulación de Último en Pie para la liga de agentes · versión {SIM_VERSION} (generado por build.py) */\n"
                               + sim_js + f"\nconst SIM_VERSION = '{SIM_VERSION}';\nexport {{ {', '.join(EXPORTS + ['SIM_VERSION'])} }};\n")
print('simulación de agentes ok', SIM_VERSION)

# 3) página /agentes: espectador de la liga
if (src / 'agentes.html').exists() and (src / 'agentes.js').exists():
    spect = ['util', 'mathdet', 'weapons', 'roster', 'sprites', 'hd', 'world', 'sim', 'liga', 'render', 'render3d', 'audio', 'agentes']
    js = bundle(spect).replace('__SIM_VERSION__', SIM_VERSION)
    page = (src / 'agentes.html').read_text().replace('/*SCRIPT*/', "(function () {\n" + js + "\n})();")
    (dist / 'agentes').mkdir(exist_ok=True)
    (dist / 'agentes' / 'index.html').write_text(page)
    skill = root / 'arena' / 'SKILL.md'
    if skill.exists():
        (dist / 'agentes' / 'skill.md').write_text(skill.read_text())
    demo = root / 'arena' / 'demo.json'
    if demo.exists():
        (dist / 'agentes' / 'demo.json').write_text(demo.read_text())
    print('página /agentes ok', len(page) // 1024, 'KB')

# 4) prueba de determinismo entre motores: /agentes/prueba.html rehace partidas y compara huellas con las de Node
if (src / 'prueba.html').exists():
    demo = root / 'arena' / 'demo.json'
    demo_txt = demo.read_text().strip() if demo.exists() else 'null'
    esperado = 'null'
    try:
        with tempfile.TemporaryDirectory() as d:
            cjs = pathlib.Path(d) / 'prueba.cjs'
            cjs.write_text(bundle(SIM + ['prueba']) + '\nmodule.exports = pruebaTodo;\n')
            code = ('const fs = require("fs"); const t = fs.readFileSync(process.argv[2], "utf8");'
                    'process.stdout.write(JSON.stringify(require(process.argv[1])(t.trim() ? JSON.parse(t) : null)));')
            r = subprocess.run(['node', '-e', code, str(cjs), str(demo) if demo.exists() else '/dev/null'], capture_output=True, text=True, timeout=180)
            if r.returncode == 0:
                ref = json.loads(r.stdout)
                ref['sim'] = SIM_VERSION
                esperado = json.dumps(ref)
            else:
                print('prueba: node falló, la página saldrá sin referencia:', r.stderr.strip()[:200])
    except (OSError, subprocess.SubprocessError) as e:
        print('prueba: sin node, la página saldrá sin referencia:', e)
    js = (bundle(SIM + ['prueba', 'prueba-pagina']).replace('__SIM_VERSION__', SIM_VERSION)
          .replace('/*DEMO*/null', demo_txt.replace('</', '<\\/')).replace('/*ESPERADO*/null', esperado))
    page = (src / 'prueba.html').read_text().replace('/*SCRIPT*/', "(function () {\n" + js + "\n})();")
    (dist / 'agentes').mkdir(exist_ok=True)
    (dist / 'agentes' / 'prueba.html').write_text(page)
    print('prueba de determinismo ok', len(page) // 1024, 'KB · referencia', json.loads(esperado)['codigo'] if esperado != 'null' else 'ninguna')

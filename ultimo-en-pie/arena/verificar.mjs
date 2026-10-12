/* rehace cada partida guardada desde su registro y compara la huella final: node arena/verificar.mjs <carpeta de partidas> */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { replayLog } from './core.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sim = await import(path.join(ROOT, 'dist/arena/sim.mjs'));
const dir = process.argv[2];
let ok = 0, n = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const L = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const r = replayLog(sim, L); n++; if (r.hash === L.fin.hash) ok++;
  const pens = L.ventanas.reduce((a, v) => a + Object.keys(v.p).length, 0), ords = L.ventanas.reduce((a, v) => a + v.in.length, 0);
  console.log(f, '| version sim', L.sim === sim.SIM_VERSION ? 'igual' : 'DISTINTA', '| huella', L.fin.hash, r.hash === L.fin.hash ? 'IGUAL' : 'DISTINTA ' + r.hash, '| ventanas', L.ventanas.length, '| ordenes', ords, '| pensamientos', pens, '| tamaño', (fs.statSync(path.join(dir, f)).size / 1024).toFixed(1) + ' KB');
}
console.log('repeticiones exactas:', ok + '/' + n);

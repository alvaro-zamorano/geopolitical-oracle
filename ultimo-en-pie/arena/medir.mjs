/* ===== mide si un agente sencillo supera a la IA del juego (criterio de la fase 0) =====
   node arena/medir.mjs [partidas]
   Mismas semillas y mismos 8 luchadores; compara la IA sola con el agente de reglas jugando por la arena real.
   Además rehace cada partida desde su registro y comprueba que la huella final coincide. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArenaMatch, replayLog } from './core.mjs';
import { prepararReglas, decidirReglas } from './agente-reglas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sim = await import(path.join(ROOT, 'dist/arena/sim.mjs'));
const N = +(process.argv[2] || 100);
const IDX = [3, 11, 17, 24, 30, 38, 42, 49];

function jugar(semilla, modo) {
  const entrants = IDX.map((i) => ({ agente: 'a' + i, nombre: 'Reglas ' + i, script: true }));
  const m = new ArenaMatch(sim, { id: 't' + semilla, semilla, liga: 'tactica', entrants });
  for (const e of entrants) {
    const luchador = sim.ROSTER[+e.agente.slice(1)].id;
    if (modo === 'ia') m.submitPrep(e.agente, { luchador, ventaja: 'tanque', estilo: 'normal' });
    else { const p = prepararReglas(m.prepInfo(e.agente), { luchador, semilla: e.agente }); p.luchador = luchador; m.submitPrep(e.agente, p); }
  }
  m.startPlay();
  while (m.fase === 'play') {
    if (modo !== 'ia') for (const ag of m.vivos()) {
      const o = m.observation(ag);
      m.submit(ag, m.ventana, decidirReglas(o, { favores: modo !== 'entrenador' }));
    }
    m.resolve();
  }
  return m;
}
const modos = [['ia', 'IA del juego (con ventaja tanque, sin decisiones)'], ['entrenador', 'Agente: salto + entrenador, sin favores'], ['completo', 'Agente: salto + entrenador + favores']];
let replaysOk = 0, replays = 0;
for (const [modo, nombre] of modos) {
  let puesto = 0, top10 = 0, gana = 0, n = 0, favores = 0, t0 = Date.now();
  for (let s = 1; s <= N; s++) {
    const m = jugar(s * 7919 + 1, modo);
    for (const ag in m.log.fin.puestos) { const p = m.log.fin.puestos[ag]; puesto += p.puesto; top10 += p.puesto <= 10; gana += p.puesto === 1; favores += p.favores_usados; n++; }
    if (s <= 20) { replays++; if (replayLog(sim, m.log).hash === m.log.fin.hash) replaysOk++; }
  }
  console.log(nombre.padEnd(52), 'puesto medio', (puesto / n).toFixed(1), '| top 10', (top10 / n * 100).toFixed(1) + '%', '| victorias', (gana / n * 100).toFixed(1) + '%', '| favores/partida', (favores / n).toFixed(2), '|', ((Date.now() - t0) / N).toFixed(0), 'ms/partida');
}
console.log('repeticiones exactas desde el registro:', replaysOk + '/' + replays);

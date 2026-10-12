/* ===== lanza N agentes de reglas contra un servidor de la liga =====
   node arena/jugar-reglas.mjs [N] [partidas]   ·   BASE=http://localhost:8787 */
import { Cliente } from './cliente.mjs';
import { prepararReglas, decidirReglas } from './agente-reglas.mjs';

const BASE = process.env.BASE || 'http://localhost:8787';
const N = +(process.argv[2] || 4), PARTIDAS = +(process.argv[3] || 1);

async function agente(k) {
  const c = new Cliente(BASE);
  const alta = await c.registro('Reglas ' + (k + 1), 'reglas-v1', true);
  c.clave = alta.clave;
  let jugadas = 0, respuestas = 0;
  await c.unirse();
  while (jugadas < PARTIDAS) {
    const t = await c.turno(25000);
    if (t.tipo === 'preparacion') await c.preparar(prepararReglas(t, { semilla: alta.agente }));
    else if (t.tipo === 'ventana') { const r = await c.responder(t.ventana, decidirReglas(t)); if (r.ok) respuestas++; }
    else if (t.tipo === 'eliminado') { /* sigue esperando al final */ }
    else if (t.tipo === 'fin') { jugadas++; console.log('[reglas ' + (k + 1) + '] partida', t.partida, 'puesto', t.puesto, 'bajas', t.bajas, 'respuestas', respuestas); if (jugadas < PARTIDAS) await c.unirse(); }
  }
}
await Promise.all(Array.from({ length: N }, (_, k) => agente(k)));

/* ===== consola para jugar a mano (o desde un asistente que solo puede lanzar comandos) =====
   node arena/consola.mjs alta "Nombre" "modelo"      registra y guarda la clave en ~/.uep-agente.json (no la imprime)
   node arena/consola.mjs unirse                      entra en la cola de la próxima partida
   node arena/consola.mjs turno ['{"estilo":...}']   envía la respuesta al turno pendiente (si se da) y espera el siguiente
   BASE=http://localhost:8787 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Cliente } from './cliente.mjs';

const BASE = process.env.BASE || 'http://localhost:8787';
const FICH = process.env.UEP_AGENTE || path.join(os.homedir(), '.uep-agente.json');
const leer = () => { try { return JSON.parse(fs.readFileSync(FICH, 'utf8')); } catch (e) { return {}; } };
const guardar = (o) => { fs.writeFileSync(FICH, JSON.stringify(o), { mode: 0o600 }); };
const [cmd, ...args] = process.argv.slice(2);
const st = leer();
const c = new Cliente(BASE, st.clave);

if (cmd === 'alta') {
  const r = await c.registro(args[0] || 'Agente', args[1] || '', false);
  guardar({ agente: r.agente, clave: r.clave, base: BASE });
  console.log(JSON.stringify({ agente: r.agente, guardado_en: FICH }));
} else if (cmd === 'unirse') {
  console.log(JSON.stringify(await c.unirse()));
} else if (cmd === 'turno') {
  if (args[0]) {
    let resp; try { resp = JSON.parse(args[0]); } catch (e) { console.log(JSON.stringify({ error: 'la respuesta no es JSON válido' })); process.exit(1); }
    const r = st.pendiente === 'preparacion' ? await c.preparar(resp) : await c.responder(st.ventana, resp);
    if (!r.ok || (r.errores && r.errores.length)) console.log(JSON.stringify({ envio: r }));
  }
  let t;
  do { t = await c.turno(25000); } while (t.tipo === 'espera' && process.env.SIN_ESPERA !== '1');
  guardar(Object.assign(leer(), { pendiente: t.tipo, ventana: t.ventana }));
  console.log(JSON.stringify(t));
} else {
  console.log('uso: alta "Nombre" "modelo" | unirse | turno [respuesta JSON]');
}

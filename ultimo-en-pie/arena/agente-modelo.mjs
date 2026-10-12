/* ===== agente de referencia con modelo de lenguaje =====
   Habla con cualquier API compatible con OpenAI (Groq, OpenRouter, Mistral, un servidor local…).
   Variables: BASE (servidor de la liga), LLM_URL (p. ej. https://api.groq.com/openai/v1), LLM_MODELO, LLM_CLAVE, NOMBRE
   La clave del modelo se lee del entorno en tiempo de ejecución y no se imprime nunca.
   Cada ventana manda un mensaje de tamaño fijo (instrucciones + observación + nota), sin historial que crezca. */
import { Cliente } from './cliente.mjs';
import { prepararReglas, decidirReglas } from './agente-reglas.mjs';

const BASE = process.env.BASE || 'http://localhost:8787';
const LLM_URL = (process.env.LLM_URL || '').replace(/\/$/, '');
const LLM_MODELO = process.env.LLM_MODELO || '';
const NOMBRE = process.env.NOMBRE || 'Referencia';
const PARTIDAS = +(process.env.PARTIDAS || 1);

export const SISTEMA = `Diriges a un luchador en un battle royale de 50 (Último en Pie). No lo manejas: la IA del juego mueve y pelea; tú decides cada 2 s de juego.
Responde SOLO con un objeto JSON con estos campos (todos opcionales):
- "favor": null | {"tipo":"pocion"} | {"tipo":"rayo","objetivo":ID} | {"tipo":"contraataque"}
- "objetivo": ID de un rival a la vista que la IA debe priorizar, o null
- "estilo": "prudente" | "normal" | "agresivo"
- "destino": null | "zona" | "c3" (cofre) | "s0" (suministro) | {"x":N,"y":N}
- "pensamiento": frase de hasta 80 caracteres que verá el público
- "nota": hasta 200 caracteres para ti mismo en la siguiente ventana
Favores: empiezas con 2, ganas 1 por baja y al quedar 25 y 10 vivos (máximo 3). Son lo que más cambia el resultado:
guárdalos para momentos decisivos. Poción: cura 45 % (úsala con poca vida y recibiendo daño). Rayo: 34 de daño y aturde
(remata a quien pelea contigo y está tocado). Contraataque: golpe en círculo; perfecto si dos rivales te atacan a la vez.
Estilo: prudente al principio, agresivo al final suele ir bien. Sal de la tormenta antes de que se cierre.`;

function extraerJSON(txt) {
  if (!txt) return null;
  const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(txt.slice(a, b + 1)); } catch (e) { return null; }
}
export async function pensar(obs) {
  const r = await fetch(LLM_URL + '/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + (process.env.LLM_CLAVE || '') },
    body: JSON.stringify({ model: LLM_MODELO, temperature: 0.3, max_tokens: 220, response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: JSON.stringify(obs) }] })
  });
  if (!r.ok) throw new Error('el modelo respondió ' + r.status);
  const d = await r.json();
  return extraerJSON(d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
}

if (import.meta.url === 'file://' + process.argv[1]) {
  if (!LLM_URL || !LLM_MODELO) { console.error('Faltan LLM_URL y LLM_MODELO (y LLM_CLAVE en el entorno).'); process.exit(1); }
  const c = new Cliente(BASE);
  const alta = await c.registro(NOMBRE, LLM_MODELO, false);
  c.clave = alta.clave;
  await c.unirse();
  let jugadas = 0, fallosModelo = 0;
  while (jugadas < PARTIDAS) {
    const t = await c.turno(25000);
    if (t.tipo === 'preparacion') await c.preparar(prepararReglas(t, { semilla: alta.agente }));
    else if (t.tipo === 'ventana') {
      const t0 = Date.now();
      let resp = null;
      try { resp = await pensar(t); } catch (e) { fallosModelo++; }
      if (!resp) resp = decidirReglas(t); // si el modelo falla, no se pierde la ventana
      const r = await c.responder(t.ventana, resp);
      console.log('[ventana', t.ventana + ']', (Date.now() - t0) + ' ms', r.ok ? '' : r.error, resp.pensamiento || '');
    } else if (t.tipo === 'fin') { jugadas++; console.log('[fin] puesto', t.puesto, 'bajas', t.bajas, 'fallos del modelo', fallosModelo); if (jugadas < PARTIDAS) await c.unirse(); }
  }
}

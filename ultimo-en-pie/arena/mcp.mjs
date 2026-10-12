/* ===== servidor MCP de la liga (stdio) =====
   Para asistentes que juegan por herramientas (Claude Desktop, Claude Code, otros clientes MCP).
   Config: { "command": "node", "args": ["/ruta/arena/mcp.mjs"], "env": { "BASE": "https://…" } }
   La clave del agente se guarda en ~/.uep-agente.json y nunca se devuelve al modelo. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Cliente } from './cliente.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE || 'http://localhost:8787';
const FICH = process.env.UEP_AGENTE || path.join(os.homedir(), '.uep-agente.json');
const leer = () => { try { return JSON.parse(fs.readFileSync(FICH, 'utf8')); } catch (e) { return {}; } };
const guardar = (o) => fs.writeFileSync(FICH, JSON.stringify(o), { mode: 0o600 });
const cliente = () => new Cliente(leer().base || BASE, leer().clave);
const texto = (obj) => ({ content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj) }] });

const server = new McpServer({ name: 'ultimo-en-pie', version: '0.1.0' }, {
  instructions: 'Liga de agentes de Último en Pie: un battle royale de 50 luchadores. Diriges a uno: cada 2 s de juego eliges estilo, rival preferido, destino y cuándo usar tus favores. Llama a instrucciones() una vez, luego alta(), unirse() y jugar_turno() en bucle hasta recibir tipo "fin".'
});

server.registerTool('instrucciones', { title: 'Instrucciones', description: 'Reglas completas, formato de la observación y de la respuesta (SKILL.md).', inputSchema: {} },
  async () => texto(fs.readFileSync(path.join(HERE, 'SKILL.md'), 'utf8')));

server.registerTool('alta', {
  title: 'Darse de alta', description: 'Registra a tu agente con un nombre público y el modelo que eres. La clave se guarda en local y no se muestra.',
  inputSchema: { nombre: z.string().min(2).max(24), modelo: z.string().max(40) }
}, async ({ nombre, modelo }) => {
  const st = leer();
  if (st.clave && st.base === BASE) return texto({ ok: true, agente: st.agente, aviso: 'ya estabas dado de alta' });
  const r = await new Cliente(BASE).registro(nombre, modelo, false);
  guardar({ agente: r.agente, clave: r.clave, base: BASE });
  return texto({ ok: true, agente: r.agente });
});

server.registerTool('unirse', { title: 'Unirse a la próxima partida', description: 'Entra en la cola de la próxima partida.', inputSchema: {} },
  async () => texto(await cliente().unirse()));

server.registerTool('jugar_turno', {
  title: 'Jugar un turno',
  description: 'Envía tu respuesta al turno pendiente (preparación o ventana) y espera el siguiente. Sin respuesta, solo espera. Devuelve la siguiente petición: tipo "preparacion", "ventana", "eliminado" o "fin".',
  inputSchema: { respuesta: z.record(z.string(), z.any()).optional().describe('JSON de preparación o de ventana, según el último turno recibido') }
}, async ({ respuesta }) => {
  const c = cliente(), st = leer();
  let envio = null;
  if (respuesta) {
    envio = st.pendiente === 'preparacion' ? await c.preparar(respuesta) : await c.responder(st.ventana, respuesta);
  }
  const limite = Date.now() + 100000;
  let t;
  do { t = await c.turno(25000); } while (t.tipo === 'espera' && Date.now() < limite);
  guardar(Object.assign(leer(), { pendiente: t.tipo, ventana: t.ventana }));
  return texto(envio && (!envio.ok || (envio.errores && envio.errores.length)) ? { envio, siguiente: t } : t);
});

await server.connect(new StdioServerTransport());

/* ===== servidor local de la liga de agentes (fase 0) =====
   node arena/server.mjs   ·   variables: PUERTO, LIGA (rapida|tactica|prueba), MIN_AGENTES, ESPERA_COLA_MS, RETRASO, DATOS
   Protocolo HTTP (JSON). Las claves de los agentes solo se guardan como huella SHA-256. */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ArenaMatch, LIGAS } from './core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const sim = await import(path.join(ROOT, 'dist/arena/sim.mjs'));
const CFG = {
  puerto: +(process.env.PUERTO || 8787),
  liga: LIGAS[process.env.LIGA] ? process.env.LIGA : 'tactica',
  minAgentes: +(process.env.MIN_AGENTES || 1),
  esperaCola: +(process.env.ESPERA_COLA_MS || 15000),
  retraso: +(process.env.RETRASO || 10),
  plazo: process.env.PLAZO_MS ? +process.env.PLAZO_MS : null,
  datos: process.env.DATOS || path.join(HERE, 'datos')
};
fs.mkdirSync(path.join(CFG.datos, 'partidas'), { recursive: true });
const AG_FILE = path.join(CFG.datos, 'agentes.json');
let AGENTES = {};
try { AGENTES = JSON.parse(fs.readFileSync(AG_FILE, 'utf8')); } catch (e) { AGENTES = {}; }
const guardarAgentes = () => fs.writeFileSync(AG_FILE, JSON.stringify(AGENTES, null, 1));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const POR_HUELLA = new Map(Object.values(AGENTES).map((a) => [a.huella, a.id]));

/* ---------- estado ---------- */
const cola = []; // ids de agentes esperando partida
let colaDesde = 0;
let partida = null; // partida en curso
let fasePlazo = 0; // momento límite de la fase actual
const historial = []; // ids de partidas terminadas (más reciente al final)
for (const f of fs.readdirSync(path.join(CFG.datos, 'partidas')).sort()) if (f.endsWith('.json')) historial.push(f.replace('.json', ''));
const esperando = new Map(); // agente -> [resolve] de consultas largas
const finales = new Map(); // agente -> último resultado pendiente de entregar
const altasPorIp = new Map();

function plazoLiga(kind) { const L = LIGAS[partida ? partida.liga : CFG.liga]; return kind === 'prep' ? L.prep : (CFG.plazo || L.plazo); }
function pendienteDe(agente) {
  if (partida && partida.entrants.some((e) => e.agente === agente)) {
    if (partida.fase === 'prep' && !partida.prep[agente]) return partida.prepInfo(agente);
    if (partida.fase === 'play') {
      const f = partida.fighterOf(agente);
      if (f && f.alive && !(agente in partida.respuestas)) return partida.observation(agente);
      if (f && !f.alive && !partida.estado[agente].avisado) {
        partida.estado[agente].avisado = true;
        return { tipo: 'eliminado', partida: partida.id, puesto: f.place, bajas: f.kills, mensaje: 'Tu luchador ha caído. La partida sigue: el resultado final llegará como tipo "fin".' };
      }
    }
  }
  if (finales.has(agente)) { const r = finales.get(agente); finales.delete(agente); return r; }
  return null;
}
function despertar() {
  for (const [ag, lista] of esperando) {
    const p = pendienteDe(ag);
    if (p) { esperando.delete(ag); for (const r of lista) r(p); }
  }
}

/* ---------- ciclo de partidas ---------- */
function nuevaPartida() {
  const ids = cola.splice(0, 50);
  const id = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14) + '-' + crypto.randomBytes(2).toString('hex');
  const semilla = crypto.randomBytes(4).readUInt32BE(0) >>> 1;
  partida = new ArenaMatch(sim, { id, semilla, liga: CFG.liga, entrants: ids.map((a) => ({ agente: a, nombre: AGENTES[a].nombre, modelo: AGENTES[a].modelo, script: AGENTES[a].script })) });
  partida.compromiso = sha(String(semilla)); // huella de la semilla: se publica ya; la semilla, con el retraso
  fasePlazo = Date.now() + plazoLiga('prep');
  console.log('[partida]', id, 'liga', CFG.liga, 'agentes', ids.length);
  despertar();
}
function cerrarPartida() {
  const p = partida;
  fs.writeFileSync(path.join(CFG.datos, 'partidas', p.id + '.json'), JSON.stringify(p.log));
  historial.push(p.id);
  for (const ag in p.estado) finales.set(ag, p.resultado(ag));
  console.log('[fin]', p.id, 'ganador', p.log.fin.ganador_nombre, 'ventanas', p.log.ventanas.length, 'huella', p.log.fin.hash);
  partida = null;
  despertar();
}
function tick() {
  const ahora = Date.now();
  if (!partida) {
    if (cola.length && (cola.length >= CFG.minAgentes || ahora - colaDesde >= CFG.esperaCola)) nuevaPartida();
    return;
  }
  if (partida.fase === 'prep') {
    if (partida.prepListo() || ahora >= fasePlazo) { partida.startPlay(); fasePlazo = Date.now() + plazoLiga('play'); despertar(); }
    return;
  }
  if (partida.fase === 'play') {
    if (partida.pendientes().length === 0 || ahora >= fasePlazo) {
      partida.resolve();
      if (partida.fase === 'over') { cerrarPartida(); return; }
      fasePlazo = Date.now() + plazoLiga('play');
      despertar();
    }
    return;
  }
  if (partida.fase === 'over') cerrarPartida();
}
setInterval(tick, 20);

/* ---------- HTTP ---------- */
function json(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}
function leerCuerpo(req) {
  return new Promise((ok, ko) => {
    let s = ''; req.on('data', (c) => { s += c; if (s.length > 20000) { ko(new Error('cuerpo demasiado grande')); req.destroy(); } });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { ko(new Error('JSON inválido')); } });
  });
}
function autenticar(req) {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '');
  return m ? POR_HUELLA.get(sha(m[1])) || null : null;
}
function servirArchivo(res, file, type) {
  try { const b = fs.readFileSync(file); res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); res.end(b); }
  catch (e) { json(res, 404, { error: 'no existe' }); }
}
function vistaPartida(id) {
  if (partida && partida.id === id) return Object.assign(partida.publicView(CFG.retraso), { compromiso: partida.compromiso, en_directo: true });
  try { const L = JSON.parse(fs.readFileSync(path.join(CFG.datos, 'partidas', id + '.json'), 'utf8')); return Object.assign(L, { fase: 'over', compromiso: sha(String(L.semilla)) }); } catch (e) { return null; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  try {
    /* páginas para probar en local */
    if (p === '/' ) { res.writeHead(302, { location: '/agentes/' }); return res.end(); }
    if (p === '/agentes' || p === '/agentes/') return servirArchivo(res, path.join(ROOT, 'dist/agentes/index.html'), 'text/html; charset=utf-8');
    if (p === '/skill.md' || p === '/agentes/skill.md') return servirArchivo(res, path.join(HERE, 'SKILL.md'), 'text/markdown; charset=utf-8');
    if (p === '/agentes/demo.json') return servirArchivo(res, path.join(ROOT, 'dist/agentes/demo.json'), 'application/json; charset=utf-8');
    if (p === '/agentes/prueba.html') return servirArchivo(res, path.join(ROOT, 'dist/agentes/prueba.html'), 'text/html; charset=utf-8');

    if (p === '/api/registro' && req.method === 'POST') {
      const ip = req.socket.remoteAddress || '?', n = (altasPorIp.get(ip) || 0) + 1; altasPorIp.set(ip, n);
      if (n > 50) return json(res, 429, { error: 'demasiadas altas desde esta dirección' });
      const b = await leerCuerpo(req);
      const nombre = String(b.nombre || '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 24);
      if (nombre.length < 2) return json(res, 400, { error: 'nombre: entre 2 y 24 caracteres (letras, números, espacio, punto, guion)' });
      const id = 'ag_' + crypto.randomBytes(6).toString('hex');
      const clave = 'uep_' + crypto.randomBytes(24).toString('base64url');
      AGENTES[id] = { id, nombre, modelo: String(b.modelo || '').slice(0, 40), script: !!b.script, huella: sha(clave), alta: new Date().toISOString() };
      POR_HUELLA.set(AGENTES[id].huella, id); guardarAgentes();
      return json(res, 200, { agente: id, clave, aviso: 'Guarda la clave: no se puede recuperar. Úsala como "Authorization: Bearer <clave>".' });
    }
    if (p === '/api/estado' && req.method === 'GET') {
      return json(res, 200, { liga: CFG.liga, plazo_ms: CFG.plazo || LIGAS[CFG.liga].plazo, en_cola: cola.length, partida: partida ? { id: partida.id, fase: partida.fase, ventana: partida.ventana, agentes: partida.entrants.length } : null });
    }
    if (p === '/api/partidas' && req.method === 'GET') {
      return json(res, 200, { en_directo: partida ? { id: partida.id, fase: partida.fase, ventana: partida.ventana, compromiso: partida.compromiso } : null, terminadas: historial.slice(-30).reverse() });
    }
    const mp = /^\/api\/partidas\/([\w-]+)$/.exec(p);
    if (mp && req.method === 'GET') { const v = vistaPartida(mp[1]); return v ? json(res, 200, v) : json(res, 404, { error: 'partida desconocida' }); }

    /* a partir de aquí, con clave */
    const yo = autenticar(req);
    if (p.startsWith('/api/') && !yo) return json(res, 401, { error: 'falta la clave o no es válida (Authorization: Bearer <clave>)' });
    if (p === '/api/unirse' && req.method === 'POST') {
      if (partida && partida.entrants.some((e) => e.agente === yo) && partida.fase !== 'over') return json(res, 200, { ok: true, estado: 'ya estás en la partida ' + partida.id });
      if (!cola.includes(yo)) { if (!cola.length) colaDesde = Date.now(); cola.push(yo); }
      return json(res, 200, { ok: true, estado: 'en cola', delante: cola.indexOf(yo), liga: CFG.liga });
    }
    if (p === '/api/turno' && req.method === 'GET') {
      const espera = Math.max(0, Math.min(30000, +(url.searchParams.get('espera') || 25000)));
      const ya = pendienteDe(yo);
      if (ya || !espera) return json(res, 200, ya || { tipo: 'espera', mensaje: cola.includes(yo) ? 'en cola' : 'sin partida: llama a /api/unirse' });
      const lista = esperando.get(yo) || []; esperando.set(yo, lista);
      let hecho = false;
      const fin = (obj) => { if (hecho) return; hecho = true; clearTimeout(tm); json(res, 200, obj); };
      lista.push(fin);
      const tm = setTimeout(() => { const l = esperando.get(yo); if (l) { const i = l.indexOf(fin); if (i >= 0) l.splice(i, 1); } fin({ tipo: 'espera', mensaje: cola.includes(yo) ? 'en cola' : 'sin novedades' }); }, espera);
      req.on('close', () => { hecho = true; clearTimeout(tm); });
      return;
    }
    if (p === '/api/turno' && req.method === 'POST') {
      const b = await leerCuerpo(req);
      if (!partida) return json(res, 409, { ok: false, error: 'no hay partida en curso' });
      if (b.preparacion !== undefined) return json(res, 200, partida.submitPrep(yo, b.preparacion));
      const r = partida.submit(yo, Number(b.ventana), b.respuesta);
      return json(res, r.ok ? 200 : 409, r);
    }
    return json(res, 404, { error: 'ruta desconocida' });
  } catch (e) {
    return json(res, 400, { error: String(e.message || e) });
  }
});
server.listen(CFG.puerto, () => console.log('[arena] escuchando en http://localhost:' + CFG.puerto, 'liga', CFG.liga, 'retraso', CFG.retraso, 'ventanas'));

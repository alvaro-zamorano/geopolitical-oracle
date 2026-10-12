/* ===== /agentes: espectador de la liga de agentes =====
   Reproduce cada partida desde su registro (semilla + preparación + órdenes por ventana) con la misma
   simulación determinista que el servidor, y al final comprueba que la huella coincide. */
const $ = (id) => document.getElementById(id);
const Q = new URLSearchParams(location.search);
const SIM_V = '__SIM_VERSION__';
/* dónde está la API: ?api=…, o el mismo origen si lo sirve el servidor de la liga; si no hay, partida de demostración */
const API = Q.get('api') || (location.port === '8787' ? location.origin : (window.UEP_API || ''));
const V = { log: null, live: false, M: null, R: null, n: 0, w: 0, acc: 0, speed: 1, cam: 'drone', cut: true, follow: null, followT: 0,
  agents: [], byFighter: {}, last: {}, sayT: 0, banT: 0, ended: false, poll: null, scale: 3, swapT: -1, waitingSeed: false };
let lastTs = 0;

/* ---------- carga ---------- */
async function getJSON(url) { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return r.json(); }
async function abrirLista() {
  const ul = $('list'); ul.innerHTML = '';
  const add = (txt, sub, live, fn) => { const li = document.createElement('li'), b = document.createElement('button'); const a = document.createElement('span'); a.textContent = txt; const s = document.createElement('span'); if (live) { s.className = 'live'; s.textContent = '● EN DIRECTO'; } else { s.className = 'lbl'; s.textContent = sub || ''; } b.append(a, s); b.addEventListener('click', () => { $('sh-list').hidden = true; fn(); }); li.append(b); ul.append(li); };
  if (API) {
    try {
      const d = await getJSON(API + '/api/partidas');
      if (d.en_directo) add('Partida en curso', '', true, () => cargarPartida(d.en_directo.id, true));
      for (const id of d.terminadas) add('Partida ' + fechaDe(id), id.split('-').pop(), false, () => cargarPartida(id, false));
      if (!d.en_directo && !d.terminadas.length) add('Todavía no hay partidas: mira la de demostración', '', false, () => cargarDemo());
    } catch (e) { add('No se pudo conectar con la liga: ver la demostración', '', false, () => cargarDemo()); }
  } else add('Partida de demostración', 'grabada en la fase de pruebas', false, () => cargarDemo());
  $('sh-list').hidden = false;
}
function fechaDe(id) { const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(id); return m ? m[3] + '/' + m[2] + ' ' + m[4] + ':' + m[5] : id; }
async function cargarDemo() { try { iniciar(await getJSON('demo.json'), false); } catch (e) { $('m-title').textContent = 'Sin partidas'; } }
async function cargarPartida(id, live) {
  clearInterval(V.poll); V.poll = null;
  const L = await getJSON(API + '/api/partidas/' + id);
  iniciar(L, live && L.fase !== 'over');
  if (V.live) V.poll = setInterval(async () => {
    try {
      const N = await getJSON(API + '/api/partidas/' + id);
      if (!V.log.semilla && N.semilla != null) { iniciar(N, N.fase !== 'over'); return; }
      if (N.ventanas.length > V.log.ventanas.length) V.log.ventanas = N.ventanas;
      if (N.fin) { V.log.fin = N.fin; V.live = false; clearInterval(V.poll); V.poll = null; }
    } catch (e) { /* reintenta en el siguiente ciclo */ }
  }, 2000);
}

/* ---------- partida ---------- */
function iniciar(L, live) {
  V.log = L; V.live = live; V.ended = false; V.n = 0; V.w = 0; V.acc = 0; V.last = {}; V.swapT = -1;
  $('sh-end').hidden = true; $('feed').innerHTML = ''; $('banner').hidden = true; $('say').hidden = true;
  if (L.semilla == null) {
    V.waitingSeed = true; V.M = null;
    $('waiting').hidden = false; $('w-big').textContent = 'Partida en curso';
    $('w-sub').textContent = 'El directo arranca con ' + 10 + ' ventanas de retraso para que nadie espíe. Ya van ' + (L.ventanas_totales || 0) + '.';
    $('m-title').textContent = 'En directo'; $('m-sub').textContent = L.agentes.length + ' agentes';
    return;
  }
  V.waitingSeed = false; $('waiting').hidden = true;
  const M = createMatch(L.semilla, null, {});
  ligaPreparar(M, L.agentes);
  M.onEvent = onEvent;
  V.M = M;
  V.R = createRenderer($('game'), M, { gore: 1, hd: true, onSound: (n, v) => SFX.play(n, v) });
  attach3D(V.R);
  V.agents = L.agentes.map((a) => ({ a, f: M.fighters[a.luchador] }));
  V.byFighter = {}; for (const x of V.agents) V.byFighter[x.f.id] = x;
  V.follow = V.agents[0] ? V.agents[0].f : M.fighters[0];
  V.R.follow = V.follow; V.R.cam.x = V.follow.x; V.R.cam.y = V.follow.y; V.cut = true;
  $('m-title').textContent = M.world.name;
  pintarFichas();
  resize();
  if (L.sim && L.sim !== SIM_V) aviso('Versión distinta', 'Esta partida se jugó con otra versión de la simulación');
}
function onEvent(type, d) {
  if (type === 'kill') {
    const ag = (f) => f && V.byFighter[f.id];
    if (ag(d.killer) && d.killer.alive) d.killer.fav = Math.min(LIGA_FAV_MAX, (d.killer.fav || 0) + 1);
    if (ag(d.killer) || ag(d.victim)) feed((d.killer ? d.killer.d.n : 'La isla') + ' elimina a ' + d.victim.d.n + (ag(d.victim) ? ' (' + ag(d.victim).a.nombre + ')' : ''), false);
    if (d.victim === V.follow) V.swapT = V.M.t + 2;
    if (d.remaining === 1) aviso((d.killer || d.victim).d.n, 'Último en pie');
  } else if (type === 'remaining' && d.n === 2) aviso('Duelo final', 'Quedan dos');
  if (type === 'remaining' && (d.n === 25 || d.n === 10)) for (const x of V.agents) if (x.f.alive) x.f.fav = Math.min(LIGA_FAV_MAX, (x.f.fav || 0) + 1);
  else if (type === 'event') aviso(d.kind === 'meteor' ? '¡Meteoritos!' : '¡Tormenta eléctrica!', '');
}
function aplicarVentana(win) {
  const M = V.M;
  for (const inp of win.in) {
    ligaAplicar(M, inp);
    const x = V.byFighter[inp.i];
    if (x && inp.f) {
      const tgt = inp.f.t === 'rayo' ? M.fighters[inp.f.o] : null;
      const q = inp.f.t === 'contra' ? [' flojo', '', ' perfecto'][inp.f.q] : '';
      feed(x.a.nombre + ': ' + (inp.f.t === 'pocion' ? 'poción' : inp.f.t === 'rayo' ? 'rayo a ' + tgt.d.n : 'contraataque' + q), true);
      x.f.fav = Math.max(0, (x.f.fav || 0) - 1);
    }
  }
  for (const id in win.p) {
    const x = V.byFighter[id];
    if (!x) continue;
    V.last[id] = win.p[id];
    if (x.f === V.follow) decir(x, win.p[id]);
  }
}

/* ---------- interfaz ---------- */
function pintarFichas() {
  const box = $('roster'); box.innerHTML = '';
  for (const x of V.agents) {
    const b = document.createElement('button'); b.className = 'ag'; b.dataset.id = x.f.id;
    const cv = charHD(x.f.d); fitPixel(cv, 36);
    const nm = document.createElement('div'); nm.className = 'nm'; const n1 = document.createElement('span'); n1.textContent = x.a.nombre; const n2 = document.createElement('small'); nm.append(n1, n2);
    const md = document.createElement('div'); md.className = 'md'; md.textContent = x.f.d.n + ' · ' + (x.a.script ? 'script' : (x.a.modelo || 'modelo sin declarar'));
    const bar = document.createElement('div'); bar.className = 'bar'; bar.append(document.createElement('i'));
    const th = document.createElement('div'); th.className = 'th';
    b.append(cv, nm, md, bar, th);
    b.addEventListener('click', () => seguir(x.f));
    box.append(b);
  }
}
function actualizarFichas() {
  for (const b of $('roster').children) {
    const x = V.byFighter[b.dataset.id], f = x.f;
    b.classList.toggle('dead', !f.alive);
    b.setAttribute('aria-pressed', String(f === V.follow));
    b.querySelector('.bar i').style.width = (f.alive ? Math.max(0, f.hp / f.maxHp) * 100 : 0) + '%';
    const sm = b.querySelector('small');
    const pips = '<span class="pips">' + [0, 1, 2].map((k) => '<i' + (k < (f.fav || 0) ? ' class="on"' : '') + '></i>').join('') + '</span>';
    sm.innerHTML = f.alive ? pips + ' ' + f.kills + ' b.' : '#' + f.place + ' · ' + f.kills + ' b.';
    b.querySelector('.th').textContent = V.last[f.id] ? '«' + V.last[f.id] + '»' : '';
  }
  $('m-sub').textContent = (V.live ? '● directo · ' : '') + 'quedan ' + V.M.aliveN + ' · ventana ' + Math.floor(V.n / 120) + ' · ' + fmtTime(V.M.t);
}
function seguir(f) { V.follow = f; V.R.follow = f; V.cut = true; const x = V.byFighter[f.id]; if (x && V.last[f.id]) decir(x, V.last[f.id]); actualizarFichas(); }
function decir(x, txt) { $('say-who').textContent = x.a.nombre + ' · ' + x.f.d.n; const t = $('say-txt'); t.textContent = '«' + txt + '»'; t.className = 'txt'; $('say').hidden = false; V.sayT = 5; }
function feed(txt, fav) { const d = document.createElement('div'); d.textContent = txt; if (fav) d.className = 'fav'; const el = $('feed'); el.prepend(d); while (el.children.length > 5) el.lastChild.remove(); setTimeout(() => d.remove(), 6000); }
function aviso(big, sub) { $('ban-big').textContent = big; $('ban-sub').textContent = sub; $('banner').hidden = false; V.banT = 2.4; }
function siguienteVivo(from) {
  const M = V.M;
  const ags = V.agents.map((x) => x.f).filter((f) => f.alive);
  if (from && from.killer && from.killer.alive) return from.killer;
  if (ags.length) return ags.sort((a, b) => b.kills - a.kills)[0];
  let best = null, bd = 1e12; for (const o of M.fighters) if (o.alive) { const d = dist2(from.x, from.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function terminar() {
  if (V.ended) return; V.ended = true;
  const L = V.log, M = V.M, fin = L.fin;
  const w = M.winner;
  $('e-title').textContent = w ? (V.byFighter[w.id] ? V.byFighter[w.id].a.nombre + ' gana' : w.d.n + ' gana') : 'Nadie sobrevive';
  $('e-sub').textContent = (w ? w.d.n + (V.byFighter[w.id] ? ', dirigido por un agente' : ', de la IA del juego') + ' · ' : '') + M.world.name + ' · ' + fmtTime(M.t);
  const rows = V.agents.map((x) => ({ x, p: fin && fin.puestos[x.a.agente] })).sort((a, b) => (a.p ? a.p.puesto : 99) - (b.p ? b.p.puesto : 99));
  const tb = $('e-rows'); tb.innerHTML = '';
  for (const { x, p } of rows) {
    const tr = document.createElement('tr'); if (p && p.puesto === 1) tr.className = 'win';
    const cell = (t, n) => { const td = document.createElement('td'); td.textContent = t; if (n) td.className = 'n'; tr.append(td); };
    cell(p ? p.puesto : '-', true);
    const td = document.createElement('td'); td.textContent = x.a.nombre; const sm = document.createElement('small'); sm.textContent = x.a.script ? 'script' : (x.a.modelo || ''); td.append(sm); tr.append(td);
    cell(x.f.d.n); cell(p ? p.bajas : x.f.kills, true); cell(p ? p.favores_usados : '-', true); cell(p ? p.perdidas : '-', true); tr.lastChild.classList.add('opt');
    tb.append(tr);
  }
  const h = ligaHuella(M), ok = fin && h === fin.hash;
  const c = $('e-check'); c.className = ok ? 'ok' : 'ko';
  c.textContent = fin ? (ok ? 'Repetición verificada: es exactamente la partida jugada (huella ' + h + ')' : 'La repetición no coincide con la partida jugada (' + h + ' / ' + fin.hash + ')') : '';
  document.documentElement.dataset.huella = h; document.documentElement.dataset.verificada = String(!!ok);
  setTimeout(() => { $('sh-end').hidden = false; }, 2200);
}

/* ---------- bucle ---------- */
function resize() {
  if (!V.R) return;
  const w = innerWidth, h = innerHeight, dpr = window.devicePixelRatio || 1, K = V.R.K || 1;
  const target = clamp(Math.round(Math.sqrt(w * h / 95000)), 2, 6) * dpr, k = Math.max(1, Math.round(target / K));
  const vw = Math.ceil(w * dpr / (k * K)), vh = Math.ceil(h * dpr / (k * K)), cv = $('game');
  cv.width = vw * K; cv.height = vh * K; cv.style.width = (vw * K * k / dpr) + 'px'; cv.style.height = (vh * K * k / dpr) + 'px';
  V.R.vw = vw; V.R.vh = vh; V.scale = k * K / dpr;
}
function puedeAvanzar() {
  const L = V.log, M = V.M;
  if (M.over) return false;
  if (L.fin && V.n >= L.fin.n) return false;
  if (V.n % 120 === 0) {
    const win = L.ventanas[V.w];
    if (win && win.n === V.n) return true;
    if (L.fin || !V.live) return true; // sin más órdenes: la IA sigue sola
    return false; // en directo: esperar a que lleguen las órdenes de esta ventana
  }
  return true;
}
function tick(dt) {
  const M = V.M, R = V.R;
  if (!M) return;
  if (R.hitstop > 0) R.hitstop--;
  else {
    let sc = V.speed;
    if (R.slowmo > 0) { R.slowmo -= dt; sc *= 0.35; }
    V.acc += dt * sc;
    let n = 0;
    while (V.acc >= DT && n < 24) {
      if (!puedeAvanzar()) { V.acc = 0; break; }
      while (V.w < V.log.ventanas.length && V.log.ventanas[V.w].n === V.n) aplicarVentana(V.log.ventanas[V.w++]);
      stepMatch(M); R.step(); V.n++; V.acc -= DT; n++;
    }
    if (n >= 24) V.acc = 0;
  }
  if (V.swapT > 0 && M.t >= V.swapT) { V.swapT = -1; if (!V.follow.alive) seguir(siguienteVivo(V.follow)); }
  if (M.over && M.winner && V.follow !== M.winner) { V.follow = M.winner; R.follow = M.winner; }
  if (V.cam === 'drone') {
    const f = R.follow || V.follow;
    const heading = f.state === 'fight' || f.atkT >= 0 ? f.aim : f.moving ? Math.atan2(f.vy, f.vx) : (V.cut ? (f.f > 0 ? 0 : Math.PI) : null);
    R.cam3Update(dt, 'chase', f, heading, V.cut); V.cut = false; R.frame3d(dt);
  } else { R.view3d = null; R.frame(dt); }
  if (V.sayT > 0) { V.sayT -= dt; if (V.sayT <= 0) $('say').hidden = true; }
  if (V.banT > 0) { V.banT -= dt; if (V.banT <= 0) $('banner').hidden = true; }
  V.uiT = (V.uiT || 0) - dt; if (V.uiT <= 0) { V.uiT = 0.2; actualizarFichas(); R.drawMini($('mini')); }
  if ((M.over || (V.log.fin && V.n >= V.log.fin.n)) && !V.ended) terminar();
}
function loop(ts) {
  const dt = Math.min(0.1, lastTs ? (ts - lastTs) / 1000 : 0.016); lastTs = ts;
  try { tick(dt); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}

/* ---------- controles ---------- */
$('b-list').addEventListener('click', abrirLista);
$('b-close-list').addEventListener('click', () => { $('sh-list').hidden = true; });
$('b-spd').addEventListener('click', () => { V.speed = V.speed === 1 ? 2 : V.speed === 2 ? 4 : 1; $('b-spd').textContent = V.speed + '×'; });
$('b-cam').addEventListener('click', () => { V.cam = V.cam === 'drone' ? 'top' : 'drone'; V.cut = true; $('b-cam').textContent = V.cam === 'drone' ? 'Dron' : 'Cenital'; $('b-cam').setAttribute('aria-pressed', String(V.cam === 'drone')); });
$('b-snd').addEventListener('click', () => { SFX.unlock(); SFX.on = !SFX.on; $('b-snd').setAttribute('aria-pressed', String(SFX.on)); });
$('b-again').addEventListener('click', () => { const L = V.log; iniciar(L, false); });
$('b-more').addEventListener('click', () => { $('sh-end').hidden = true; abrirLista(); });
$('game').addEventListener('pointerdown', (e) => {
  if (!V.R) return;
  const r = $('game').getBoundingClientRect(), sc = V.scale;
  if (V.R.view3d) { const px = (e.clientX - r.left) / sc, py = (e.clientY - r.top) / sc; for (const p of V.R.picks) if (px >= p.x0 - 4 && px <= p.x1 + 4 && py >= p.y0 - 4 && py <= p.y1 + 4) { seguir(p.f); return; } return; }
  const wx = V.R.cam.x - V.R.vw / 2 + (e.clientX - r.left) / sc, wy = V.R.cam.y - V.R.vh / 2 + (e.clientY - r.top) / sc;
  let best = null, bd = 26 * 26; for (const f of V.M.fighters) if (f.alive) { const d = dist2(wx, wy + 10, f.x, f.y); if (d < bd) { bd = d; best = f; } }
  if (best) seguir(best);
});
addEventListener('resize', resize);
addEventListener('keydown', (e) => { if (e.key === 'Escape') { $('sh-list').hidden = true; } });
SFX.on = false;
window.__LIGA = { V, iniciar, cargarPartida, terminar };
requestAnimationFrame(loop);
(async () => {
  const id = Q.get('partida');
  if (id && API) { try { await cargarPartida(id, true); return; } catch (e) { /* sigue */ } }
  if (Q.get('registro')) { try { iniciar(await getJSON(Q.get('registro')), false); return; } catch (e) { /* sigue */ } }
  if (API) {
    try {
      const d = await getJSON(API + '/api/partidas');
      if (d.en_directo) return cargarPartida(d.en_directo.id, true);
      if (d.terminadas.length) return cargarPartida(d.terminadas[0], false);
    } catch (e) { /* sin API: demostración */ }
  }
  cargarDemo();
})();

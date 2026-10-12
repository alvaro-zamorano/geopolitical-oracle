/* ===== núcleo de la arena: una partida de la liga de agentes =====
   Módulo puro (sin red ni disco): lo usan el servidor local y, más adelante, el Durable Object de Cloudflare.
   Determinismo: la partida se rehace exacta a partir de la semilla, la preparación y las órdenes de cada ventana. */

export const WINDOW = 120; // pasos de simulación por ventana de decisión (2 s de juego)
export const LIGAS = {
  rapida: { plazo: 3000, prep: 20000 },
  tactica: { plazo: 15000, prep: 60000 },
  prueba: { plazo: 600000, prep: 600000 } // para probar a mano: espera lo que haga falta
};
export const ESTILOS = ['prudente', 'normal', 'agresivo'];
const ESTADO_ES = { land: 'cae', roam: 'explora', fight: 'lucha', flee: 'huye', loot: 'saquea', zone: 'va_a_la_zona' };
export const MAX_FALLOS = 3;
const PENS_MAX = 80, NOTA_MAX = 200;

/* --------- utilidades --------- */
export const hashState = (sim, M) => sim.ligaHuella(M);
const BLOQUEO = /\b(nazi|hitler|violar|viola[cr]|pedof|suicid|matarte de verdad|negrat|maric[oó]n|put[ao] madre|retrasad[oa])\w*/i;
export function limpiarTexto(t, max) {
  if (typeof t !== 'string') return null;
  const s = t.replace(/[\x00-\x1f\x7f\p{Zl}\p{Zp}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return s || null;
}
export function filtrarPensamiento(t) {
  const s = limpiarTexto(t, PENS_MAX);
  if (!s) return null;
  return BLOQUEO.test(s) ? '[filtrado]' : s;
}
/* rehace una partida desde su registro y devuelve la huella final (para comprobar que la repetición es exacta) */
export function replayLog(sim, log, onStep) {
  const M = sim.createMatch(log.semilla, null, {});
  sim.ligaPreparar(M, log.agentes);
  let w = 0, n = 0;
  const V = log.ventanas || [];
  while (!M.over && M.t < 400) {
    while (w < V.length && V[w].n === n) { for (const inp of V[w].in) sim.ligaAplicar(M, inp); w++; }
    if (log.fin && n >= log.fin.n) break;
    sim.stepMatch(M); n++;
    if (onStep) onStep(M, n);
  }
  return { M, n, hash: sim.ligaHuella(M) };
}
/* --------- una partida en juego --------- */
export class ArenaMatch {
  constructor(sim, { id, semilla, liga, entrants }) {
    this.sim = sim; this.id = id; this.semilla = semilla >>> 0; this.liga = LIGAS[liga] ? liga : 'tactica';
    this.entrants = entrants.map((e) => ({ agente: e.agente, nombre: e.nombre, modelo: e.modelo || '', script: !!e.script }));
    this.M = sim.createMatch(this.semilla, null, {});
    this.fase = 'prep'; this.n = 0; this.ventana = -1;
    this.prep = {}; // agente -> elección
    this.respuestas = {}; // agente -> respuesta cruda de esta ventana
    this.estado = {}; // agente -> { fighterId, notas, errores, fallos, eventos, ultimaVida, invalidas, perdidas, favUsados }
    this.log = { v: 1, sim: sim.SIM_VERSION, id, semilla: this.semilla, liga: this.liga, ventana: WINDOW, agentes: [], ventanas: [], fin: null };
  }

  /* ---- preparación ---- */
  prepInfo(agente) {
    const M = this.M, Z = M.zone, S = this.sim;
    const tomado = new Set(Object.values(this.prep).map((p) => p.luchador).filter(Boolean));
    return {
      tipo: 'preparacion', partida: this.id, liga: this.liga, plazo_ms: LIGAS[this.liga].prep,
      mapa: {
        ancho: S.MAP_W, alto: S.MAP_H, isla: M.world.name,
        primera_zona: { x: Math.round(Z.nx), y: Math.round(Z.ny), r: Math.round(Z.nr) },
        cofres: M.world.chests.map((c, i) => ({ id: 'c' + i, x: Math.round(c.x), y: Math.round(c.y) })),
        caidas_rivales: M.fighters.map((f) => ({ x: Math.round(f.x), y: Math.round(f.y) }))
      },
      luchadores: M.fighters.map((f) => ({ id: f.d.id, nombre: f.d.n, arma: f.w.n, alcance: f.w.rng, vida: f.d.stats.vida, fuerza: f.d.stats.fuerza, velocidad: f.d.stats.velocidad, libre: !tomado.has(f.d.id) })),
      ventajas: S.PERK_IDS.map((k) => ({ id: k, nombre: S.PERKS[k].n, efecto: S.PERKS[k].d })),
      estilos: ESTILOS,
      responde: { luchador: 'id de la lista (si está cogido se asigna otro)', salto: { x: 0, y: 0 }, ventaja: 'id', estilo: 'prudente | normal | agresivo' }
    };
  }
  submitPrep(agente, r) {
    if (this.fase !== 'prep') return { ok: false, error: 'la preparación ya ha terminado' };
    if (!this.entrants.some((e) => e.agente === agente)) return { ok: false, error: 'no estás en esta partida' };
    r = r || {};
    const S = this.sim, errores = [];
    const p = {};
    if (typeof r.luchador === 'string' && S.ROSTER_BY_ID[r.luchador]) p.luchador = r.luchador; else if (r.luchador != null) errores.push('luchador desconocido');
    const sx = r.salto && Number(r.salto.x), sy = r.salto && Number(r.salto.y);
    if (Number.isFinite(sx) && Number.isFinite(sy)) p.salto = { x: Math.max(0, Math.min(S.MAP_W, sx)), y: Math.max(0, Math.min(S.MAP_H, sy)) }; else if (r.salto != null) errores.push('salto debe ser {x, y}');
    if (S.PERK_IDS.includes(r.ventaja)) p.ventaja = r.ventaja; else if (r.ventaja != null) errores.push('ventaja desconocida');
    if (ESTILOS.includes(r.estilo)) p.estilo = r.estilo; else if (r.estilo != null) errores.push('estilo desconocido');
    this.prep[agente] = p;
    return { ok: true, errores };
  }
  prepListo() { return this.entrants.every((e) => this.prep[e.agente]); }

  startPlay() {
    const M = this.M, S = this.sim;
    const libres = new Set(M.fighters.map((f) => f.id));
    const rng = S.RNG(this.semilla + 99);
    const orden = rng.shuffle(M.fighters.map((f) => f.id));
    /* dos pasadas: primero cada agente recibe el luchador que pidió (por orden de llegada);
       después, los que no pudieron tenerlo reciben uno al azar que nadie haya pedido */
    const pedidos = new Set(Object.values(this.prep).map((p) => p.luchador).filter(Boolean));
    const asignado = {};
    for (const e of this.entrants) {
      const p = this.prep[e.agente] || {};
      const f = p.luchador ? M.fighters.find((x) => x.d.id === p.luchador && libres.has(x.id)) : null;
      if (f) { asignado[e.agente] = f; libres.delete(f.id); }
    }
    for (const e of this.entrants) {
      if (asignado[e.agente]) continue;
      const id = orden.find((i) => libres.has(i) && !pedidos.has(M.fighters[i].d.id)) ?? orden.find((i) => libres.has(i));
      asignado[e.agente] = M.fighters[id]; libres.delete(id);
    }
    const agentes = [];
    for (const e of this.entrants) {
      const p = this.prep[e.agente] || {}, f = asignado[e.agente];
      const drop = p.salto ? S.validDrop(M, p.salto.x, p.salto.y) : { x: f.x, y: f.y };
      agentes.push({ agente: e.agente, nombre: e.nombre, modelo: e.modelo, script: e.script, luchador: f.id, personaje: f.d.id, x: drop.x, y: drop.y, ventaja: p.ventaja || 'tanque', estilo: p.estilo || 'normal' });
    }
    S.ligaPreparar(M, agentes);
    this.log.agentes = agentes;
    for (const a of agentes) this.estado[a.agente] = { fighterId: a.luchador, nota: null, errores: [], fallos: 0, eventos: [], ultimaVida: M.fighters[a.luchador].hp, invalidas: 0, perdidas: 0, favUsados: 0, respondidas: 0 };
    M.onEvent = (type, d) => this.onEvent(type, d);
    this.fase = 'play';
    this.beginWindow();
  }

  fighterOf(agente) { const st = this.estado[agente]; return st ? this.M.fighters[st.fighterId] : null; }
  onEvent(type, d) {
    const M = this.M;
    for (const ag in this.estado) {
      const st = this.estado[ag], f = M.fighters[st.fighterId];
      if (!f.alive && !(type === 'kill' && d.victim === f)) continue;
      const ev = (s) => { st.eventos.push(s); if (st.eventos.length > 8) st.eventos.shift(); };
      if (type === 'kill') {
        if (d.killer === f) { f.fav = Math.min(this.sim.LIGA_FAV_MAX, (f.fav || 0) + 1); ev('Eliminas a ' + d.victim.d.n + ' (+1 favor)'); }
        else if (d.victim === f) ev('Has caído: ' + (d.killer ? d.killer.d.n : 'la isla') + ' con ' + d.weapon);
        else if (this.sim.dist(f.x, f.y, d.victim.x, d.victim.y) <= this.sim.SIGHT) ev((d.killer ? d.killer.d.n : 'La isla') + ' elimina a ' + d.victim.d.n);
      } else if (type === 'remaining' && (d.n === 25 || d.n === 10)) {
        f.fav = Math.min(this.sim.LIGA_FAV_MAX, (f.fav || 0) + 1); ev('Quedan ' + d.n + ' (+1 favor)');
      } else if (type === 'remaining' && d.n === 2) ev('Duelo final');
      else if (type === 'airdrop') ev('Cae un suministro en (' + Math.round(d.a.x) + ', ' + Math.round(d.a.y) + ')');
      else if (type === 'zone' && d.mode === 'shrink') ev('La tormenta empieza a cerrarse');
    }
  }

  /* ---- ventanas ---- */
  beginWindow() {
    this.ventana++;
    this.respuestas = {};
    if (this.M.over) this.finish();
  }
  vivos() { return Object.keys(this.estado).filter((a) => this.fighterOf(a).alive); }
  pendientes() { return this.vivos().filter((a) => !(a in this.respuestas)); }
  observation(agente) {
    const M = this.M, S = this.sim, st = this.estado[agente], f = this.fighterOf(agente);
    if (!f) return null;
    const Z = M.zone, vis = [], R = S.SIGHT;
    for (const o of M.fighters) {
      if (o === f || !o.alive || o.z > 0) continue;
      const d = S.dist(f.x, f.y, o.x, o.y);
      if (d > R) continue;
      let ataca = null;
      if (o.state === 'fight' && o.tgt) ataca = o.tgt === f ? 'a ti' : (S.dist(f.x, f.y, o.tgt.x, o.tgt.y) <= R ? o.tgt.id : 'a otro');
      vis.push({ id: o.id, nombre: o.d.n, x: Math.round(o.x), y: Math.round(o.y), dist: Math.round(d), vida: Math.round(o.hp / o.maxHp * 100), arma: o.w.n, alcance: o.w.rng, ataca });
    }
    vis.sort((a, b) => a.dist - b.dist);
    const cofres = [];
    M.world.chests.forEach((c, i) => { if (!c.open) { const d = S.dist(f.x, f.y, c.x, c.y); if (d <= 160) cofres.push({ id: 'c' + i, x: Math.round(c.x), y: Math.round(c.y), dist: Math.round(d) }); } });
    M.airdrops.forEach((A, i) => { if (!A.open) cofres.push({ id: 's' + i, suministro: true, x: Math.round(A.x), y: Math.round(A.y), dist: Math.round(S.dist(f.x, f.y, A.x, A.y)), aterrizado: A.landed }); });
    cofres.sort((a, b) => a.dist - b.dist);
    const dentro = S.dist(f.x, f.y, Z.x, Z.y) < Z.r, dentroSig = S.dist(f.x, f.y, Z.nx, Z.ny) < Z.nr;
    const golpes = vis.filter((r) => r.ataca === 'a ti').map((r) => r.id);
    const dmg = Math.max(0, Math.round(st.ultimaVida - f.hp));
    const D = f.dest;
    return {
      tipo: 'ventana', partida: this.id, ventana: this.ventana, t: Math.round(M.t * 10) / 10, vivos: M.aliveN, plazo_ms: LIGAS[this.liga].plazo,
      yo: {
        id: f.id, personaje: f.d.id, nombre: f.d.n, x: Math.round(f.x), y: Math.round(f.y), cayendo: f.z > 0,
        estado: ESTADO_ES[f.state] || f.state, peleando_con: f.state === 'fight' && f.tgt && f.tgt.alive ? f.tgt.id : null,
        vida: Math.round(f.hp / f.maxHp * 100), vida_puntos: Math.round(f.hp), armadura: Math.round(f.armor),
        arma: f.w.n, alcance: f.w.rng, cuerpo_a_cuerpo: f.w.k === 'melee' || f.w.k === 'thrust' || f.w.k === 'cont', reliquia: !!f.relic,
        bajas: f.kills, favores: f.fav || 0, estilo: f.estilo, objetivo: f.focus == null ? null : f.focus,
        destino: D ? (D.k === 'zona' ? 'zona' : D.k === 'punto' ? { x: Math.round(D.x), y: Math.round(D.y) } : (D.src === 'a' ? 's' : 'c') + D.i) : null,
        dano_recibido: dmg
      },
      rivales: vis.slice(0, 10), me_golpean: golpes, cofres: cofres.slice(0, 6),
      zona: { x: Math.round(Z.x), y: Math.round(Z.y), r: Math.round(Z.r), siguiente: { x: Math.round(Z.nx), y: Math.round(Z.ny), r: Math.round(Z.nr) }, modo: Z.mode === 'wait' ? 'espera' : Z.mode === 'shrink' ? 'se_cierra' : 'final', segundos: Math.round(Math.max(0, Z.t) * 10) / 10, dentro, dentro_de_la_siguiente: dentroSig },
      desde_la_ultima: st.eventos.slice(),
      nota: st.nota, errores: st.errores.slice()
    };
  }
  submit(agente, ventana, r) {
    if (this.fase !== 'play') return { ok: false, error: 'la partida no está en juego' };
    if (ventana !== this.ventana) return { ok: false, error: 'ventana ' + ventana + ' cerrada; la actual es ' + this.ventana };
    const f = this.fighterOf(agente);
    if (!f) return { ok: false, error: 'no estás en esta partida' };
    if (!f.alive) return { ok: false, error: 'tu luchador ya ha caído' };
    if (agente in this.respuestas) return { ok: false, error: 'ya respondiste en esta ventana' };
    this.respuestas[agente] = r == null ? {} : r;
    return { ok: true };
  }
  /* valida una respuesta contra el estado actual; devuelve la entrada para el registro y los errores */
  validate(agente, r) {
    const M = this.M, S = this.sim, f = this.fighterOf(agente), st = this.estado[agente];
    const inp = { i: f.id }, errores = [];
    const visible = (id) => { const o = M.fighters[id]; return o && o !== f && o.alive && o.z <= 0 && S.dist(f.x, f.y, o.x, o.y) <= S.SIGHT; };
    if (typeof r !== 'object' || Array.isArray(r)) { errores.push('la respuesta debe ser un objeto JSON'); return { inp, errores }; }
    if (r.estilo != null) { if (ESTILOS.includes(r.estilo)) { if (r.estilo !== f.estilo) inp.s = r.estilo; } else errores.push('estilo debe ser prudente, normal o agresivo'); }
    if ('objetivo' in r) {
      if (r.objetivo === null) { if (f.focus != null) inp.o = null; }
      else { const id = Number(r.objetivo); if (Number.isInteger(id) && visible(id)) { if (f.focus !== id) inp.o = id; } else errores.push('objetivo ' + r.objetivo + ' no está a la vista'); }
    }
    if ('destino' in r) {
      const d = r.destino;
      if (d === null) { if (f.dest) inp.d = null; }
      else if (d === 'zona') inp.d = { k: 'zona' };
      else if (typeof d === 'string' && /^(cofre:)?[cs]\d+$/.test(d)) {
        const id = d.replace('cofre:', ''), src = id[0] === 's' ? 'a' : 'c', i = Number(id.slice(1));
        const g = src === 'a' ? M.airdrops[i] : M.world.chests[i];
        if (g && !g.open) inp.d = { k: 'cofre', src, i }; else errores.push('cofre ' + d + ' no existe o ya está abierto');
      } else if (d && typeof d === 'object' && Number.isFinite(Number(d.x)) && Number.isFinite(Number(d.y))) {
        inp.d = { k: 'punto', x: Math.max(30, Math.min(S.MAP_W - 30, Math.round(Number(d.x)))), y: Math.max(30, Math.min(S.MAP_H - 30, Math.round(Number(d.y)))) };
      } else errores.push('destino debe ser null, "zona", "c3"/"s0" o {x, y}');
    }
    if (r.favor != null) {
      const fv = typeof r.favor === 'string' ? { tipo: r.favor } : r.favor;
      const tipo = fv && String(fv.tipo || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
      if ((f.fav || 0) <= 0) errores.push('no te quedan favores');
      else if (f.z > 0) errores.push('no puedes usar favores mientras caes');
      else if (tipo === 'pocion') { if (f.hp >= f.maxHp * 0.97) errores.push('tienes la vida llena: la poción no se gasta'); else inp.f = { t: 'pocion' }; }
      else if (tipo === 'rayo') { const id = Number(fv.objetivo); if (Number.isInteger(id) && visible(id)) inp.f = { t: 'rayo', o: id }; else errores.push('el rayo necesita un objetivo a la vista'); }
      else if (tipo === 'contraataque') inp.f = { t: 'contra', q: S.spinQuality(M, f) };
      else errores.push('favor debe ser pocion, rayo o contraataque');
    }
    const pens = filtrarPensamiento(r.pensamiento);
    st.nota = limpiarTexto(r.nota, NOTA_MAX) || st.nota;
    return { inp, errores, pens };
  }
  /* cierra la ventana: valida, aplica, registra y avanza 2 s de juego */
  resolve() {
    if (this.fase !== 'play') return;
    const M = this.M, entradas = [], pens = {};
    const ags = Object.keys(this.estado).filter((a) => this.fighterOf(a).alive).sort((a, b) => this.estado[a].fighterId - this.estado[b].fighterId);
    for (const ag of ags) {
      const st = this.estado[ag], f = this.fighterOf(ag);
      st.errores = []; st.eventos = [];
      if (!(ag in this.respuestas)) {
        st.perdidas++; st.fallos++;
        if (st.fallos === MAX_FALLOS && (f.focus != null || f.dest || f.estilo !== 'normal')) entradas.push({ i: f.id, s: 'normal', o: null, d: null });
        continue;
      }
      st.fallos = 0; st.respondidas++;
      const { inp, errores, pens: p } = this.validate(ag, this.respuestas[ag]);
      st.errores = errores; if (errores.length) st.invalidas++;
      if (inp.f) { f.fav--; st.favUsados++; }
      if (Object.keys(inp).length > 1) entradas.push(inp);
      if (p) pens[f.id] = p;
    }
    for (const inp of entradas) this.sim.ligaAplicar(M, inp);
    this.log.ventanas.push({ n: this.n, in: entradas, p: pens });
    for (const ag of ags) this.estado[ag].ultimaVida = this.fighterOf(ag).hp;
    for (let k = 0; k < WINDOW && !M.over; k++) { this.sim.stepMatch(M); this.n++; }
    this.beginWindow();
  }
  finish() {
    if (this.fase === 'over') return;
    const M = this.M;
    this.fase = 'over';
    const puestos = {};
    for (const ag in this.estado) {
      const st = this.estado[ag], f = this.fighterOf(ag);
      puestos[ag] = { puesto: f.alive ? 1 : f.place, bajas: f.kills, favores_usados: st.favUsados, respondidas: st.respondidas, perdidas: st.perdidas, invalidas: st.invalidas };
    }
    this.log.fin = { n: this.n, t: Math.round(M.t * 100) / 100, ganador: M.winner ? M.winner.id : null, ganador_nombre: M.winner ? M.winner.d.n : null, puestos, hash: this.sim.ligaHuella(M) };
  }
  resultado(agente) {
    const p = this.log.fin && this.log.fin.puestos[agente];
    return { tipo: 'fin', partida: this.id, ...(p || {}), ganador: this.log.fin && this.log.fin.ganador_nombre };
  }
  /* vista pública con retraso: semilla y ventanas solo cuando ya han pasado `retraso` ventanas */
  publicView(retraso) {
    const L = this.log, over = this.fase === 'over';
    const hasta = over ? L.ventanas.length : Math.max(0, L.ventanas.length - retraso);
    const base = { v: L.v, sim: L.sim, id: L.id, liga: L.liga, ventana: L.ventana, fase: this.fase, ventanas_totales: L.ventanas.length,
      agentes: L.agentes.map((a) => ({ agente: a.agente, nombre: a.nombre, modelo: a.modelo, script: a.script, luchador: a.luchador, personaje: a.personaje, x: a.x, y: a.y, ventaja: a.ventaja, estilo: a.estilo })) };
    if (!over && L.ventanas.length < retraso) return Object.assign(base, { semilla: null, ventanas: [], fin: null });
    return Object.assign(base, { semilla: L.semilla, ventanas: L.ventanas.slice(0, hasta), fin: over ? L.fin : null });
  }
}

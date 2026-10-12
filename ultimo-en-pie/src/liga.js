/* ===== liga de agentes: cómo se aplican las decisiones de un agente a su luchador =====
   Un solo código para el servidor (dist/arena/sim.mjs) y para la página /agentes, para que la partida
   que se ve sea exactamente la que se jugó. */
const LIGA_FAV_INICIO = 2, LIGA_FAV_MAX = 3;
function ligaEstilo(base, estilo) {
  if (estilo === 'prudente') return Object.assign({}, base, { aggr: Math.min(base.aggr * 0.5, 0.3), flee: Math.min(0.6, base.flee + 0.15), loot: Math.min(1, base.loot + 0.2) });
  if (estilo === 'agresivo') return Object.assign({}, base, { aggr: Math.max(base.aggr, 0.85), flee: base.flee * 0.5, loot: Math.max(0, base.loot - 0.2) });
  return base;
}
function ligaSetEstilo(f, estilo) { f.estilo = estilo; f.P = ligaEstilo(f.d.pers, estilo); }
function ligaDestino(M, d) {
  if (!d) return null;
  if (d.k === 'zona') return { k: 'zona' };
  if (d.k === 'punto') return { k: 'punto', x: d.x, y: d.y };
  if (d.k === 'cofre') { const g = d.src === 'a' ? M.airdrops[d.i] : M.world.chests[d.i]; return g ? { k: 'cofre', src: d.src, i: d.i, g } : null; }
  return null;
}
/* entrada validada de una ventana: { i: luchador, s?: estilo, o?: objetivo, d?: destino, f?: favor } */
function ligaAplicar(M, inp) {
  const f = M.fighters[inp.i];
  if (!f || !f.alive) return;
  if (inp.s) ligaSetEstilo(f, inp.s);
  if ('o' in inp) f.focus = inp.o;
  if ('d' in inp) f.dest = ligaDestino(M, inp.d);
  if (inp.f) {
    if (inp.f.t === 'pocion') favorHeal(M, f);
    else if (inp.f.t === 'rayo') favorBolt(M, f, M.fighters[inp.f.o]);
    else if (inp.f.t === 'contra') favorSpin(M, f, inp.f.q);
  }
  f.decT = 0;
}
/* preparación ya resuelta: [{ agente, luchador, x, y, ventaja, estilo }] */
function ligaPreparar(M, agentes) {
  for (const a of agentes) {
    const f = M.fighters[a.luchador];
    f.agente = a.agente; f.fav = LIGA_FAV_INICIO;
    placeFighter(M, f, a.x, a.y);
    if (a.ventaja) applyPerk(f, a.ventaja);
    ligaSetEstilo(f, a.estilo || 'normal');
  }
}
/* huella del estado (posiciones, vida, vivos y tiempo): si coincide, la repetición es la partida jugada */
function ligaHuella(M) {
  let h = 0x811c9dc5;
  const s = M.fighters.map((f) => f.x.toFixed(4) + ',' + f.y.toFixed(4) + ',' + f.hp.toFixed(4) + (f.alive ? 'v' : 'm')).join('|') + '#' + M.t.toFixed(4);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

/* mide cuánto mejora el puesto medio de un jugador que usa bien la preparación y los favores */
const fs = require('fs');
const src = ['util','mathx','weapons', 'roster', 'world', 'sim'].map((f) => fs.readFileSync(__dirname + '/../src/' + f + '.js', 'utf8')).join('\n');
const api = new Function(src + '\nreturn {ROSTER,createMatch,stepMatch,applyPerk,placeFighter,favorHeal,favorBolt,favorSpin,PERK_IDS,dist,RNG,MAP_W,MAP_H};')();
const N = +process.argv[2] || 150;
const mode = process.argv[3] || 'all';
function run(seed, champIdx, policy) {
  const champId = api.ROSTER[champIdx].id;
  let fav = +(process.env.FAV0 || 1), used = { heal: 0, bolt: 0, spin: 0 };
  const gain = () => { fav = Math.min(3, fav + 1); };
  let M;
  M = api.createMatch(seed, champId, { onEvent: (t, d) => { if (t === 'kill' && d.killer === M.champ) gain(); if (t === 'remaining' && (d.n === 25 || d.n === 10)) gain(); } });
  const C = M.champ;
  if (policy !== 'pasivo') {
    /* punto de salto: cerca de cofres, lejos de rivales, cerca del centro de la primera zona */
    const r = api.RNG(seed + 5);
    let best = null, bs = -1e9;
    for (let i = 0; i < 300; i++) {
      const x = r.range(60, api.MAP_W - 60), y = r.range(60, api.MAP_H - 60);
      let s = 0;
      for (const c of M.world.chests) if (api.dist(x, y, c.x, c.y) < 70) s += 3;
      for (const f of M.fighters) { if (f === C) continue; const dd = api.dist(x, y, f.x, f.y); if (dd < 60) s -= 10; else if (dd < 120) s -= 5; }
      s -= api.dist(x, y, M.zone.nx, M.zone.ny) / 60;
      if (s > bs) { bs = s; best = { x, y }; }
    }
    api.placeFighter(M, C, best.x, best.y);
    api.applyPerk(C, policy === 'perk' ? api.PERK_IDS[seed % 6] : 'tanque');
  }
  let tick = 0;
  while (!M.over && M.t < 400) {
    api.stepMatch(M);
    if (policy !== 'habil' || !C.alive || ++tick % 15) continue;
    if (fav <= 0) continue;
    const near = M.fighters.filter((f) => f !== C && f.alive && f.z <= 0 && api.dist(f.x, f.y, C.x, C.y) < 24).length;
    const recent = M.t - C.lastHitT < 2;
    if (C.hp < C.maxHp * 0.35 && recent) { api.favorHeal(M, C); fav--; used.heal++; }
    else if (near >= 2 || (C.state === 'fight' && C.tgt && api.dist(C.x, C.y, C.tgt.x, C.tgt.y) < 20 && C.hp < C.maxHp * 0.6)) { api.favorSpin(M, C, Math.random() < 0.3 ? 2 : 1); fav--; used.spin++; }
    else if (C.state === 'fight' && C.tgt && C.tgt.alive && C.tgt.hp > C.tgt.maxHp * 0.3 && api.dist(C.x, C.y, C.tgt.x, C.tgt.y) < 150 && fav >= 2) { api.favorBolt(M, C, C.tgt); fav--; used.bolt++; }
  }
  return { place: C.alive ? 1 : C.place, kills: C.kills, used, dt: C.alive ? M.t : C.deathT };
}
const out = {};
for (const pol of mode === 'all' ? ['pasivo', 'salto', 'habil'] : [mode]) {
  let sum = 0, wins = 0, top10 = 0, kills = 0, early = 0; const u = { heal: 0, bolt: 0, spin: 0 };
  for (let i = 0; i < N; i++) {
    const r = run(1000 + i * 7919, i % 50, pol);
    sum += r.place; if (r.dt < 30) early++; if (r.place === 1) wins++; if (r.place <= 10) top10++; kills += r.kills;
    for (const k in u) u[k] += r.used[k];
  }
  out[pol] = { puesto_medio: +(sum / N).toFixed(1), victorias: (wins / N * 100).toFixed(1) + '%', top10: (top10 / N * 100).toFixed(0) + '%', bajas: +(kills / N).toFixed(2), muere_antes_30s: (early / N * 100).toFixed(0) + '%', usos: Object.fromEntries(Object.entries(u).map(([k, v]) => [k, +(v / N).toFixed(2)])) };
}
console.log(JSON.stringify(out, null, 1));

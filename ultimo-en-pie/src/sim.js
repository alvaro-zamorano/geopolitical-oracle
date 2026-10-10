/* ===== simulación de la batalla (sin DOM: se puede ejecutar en Node) ===== */
const DT = 1 / 60, FR = 5, SIGHT = 125, HP_MULT = 2.5, KDECAY = Math.exp(-7 / 60);
const NOFX = new Proxy({}, { get: () => () => {} });
const ZONE_R0 = 620;
const ZONE_PHASES = [
  { wait: 16, shrink: 14, r: 360, dps: 2 },
  { wait: 12, shrink: 12, r: 220, dps: 4 },
  { wait: 10, shrink: 11, r: 120, dps: 7 },
  { wait: 8,  shrink: 10, r: 55,  dps: 11 },
  { wait: 6,  shrink: 12, r: 8,   dps: 18 }
];
const LOOT = [
  { id: 'pocion', n: 'Poción', w: 30, c: '#e8402f' },
  { id: 'escudo', n: 'Escudo', w: 28, c: '#5aa9ff' },
  { id: 'afilado', n: 'Arma afilada', w: 22, c: '#f2c14e' },
  { id: 'botas', n: 'Botas veloces', w: 12, c: '#7dff6a' },
  { id: 'corazon', n: 'Corazón extra', w: 8, c: '#ff5a8a' }
];

function createMatch(seed, champId, opt) {
  opt = opt || {};
  const rng = RNG(seed);
  const world = opt.world || genWorld(seed);
  const M = {
    seed, rng, world, t: 0, fighters: [], proj: [], areas: [], drops: [], airdrops: [],
    fx: opt.fx || NOFX, onEvent: opt.onEvent || null, training: !!opt.training,
    aliveN: 0, over: false, winner: null, endT: 0, firstBlood: false, placements: [],
    zone: null, nextAir: [40, 84], event: null, eventT: rng.range(56, 68), champ: null, lastMilestone: 50
  };
  const defs = opt.defs || ROSTER;
  const spawns = opt.spawns || rng.shuffle(world.spawns.slice());
  defs.forEach((d, i) => {
    const s = spawns[i % spawns.length];
    const f = makeFighter(M, d, s.x, s.y, i);
    if (!M.training) { f.z = 110 + rng.range(0, 90); f.state = 'land'; }
    M.fighters.push(f);
    if (d.id === champId) { f.isChamp = true; M.champ = f; }
  });
  M.aliveN = M.fighters.length;
  const zc = { x: MAP_W / 2 + rng.range(-60, 60), y: MAP_H / 2 + rng.range(-60, 60) };
  M.zone = { x: zc.x, y: zc.y, r: ZONE_R0, nx: zc.x, ny: zc.y, nr: ZONE_R0, fx: zc.x, fy: zc.y, fr: ZONE_R0, phase: -1, mode: 'wait', t: 4, dps: 1 };
  if (!M.training) nextZone(M);
  return M;
}

function makeFighter(M, d, x, y, i) {
  return {
    d, id: i, x, y, vx: 0, vy: 0, kx: 0, ky: 0, hp: d.hp * HP_MULT, maxHp: d.hp * HP_MULT, armor: 0, f: M.rng() < 0.5 ? 1 : -1, aim: 0,
    w: d.weapon, str: d.str, spd: d.spd, luck: d.luck, mass: d.mass, P: d.pers,
    cd: M.rng.range(0.2, 0.8), atkT: -1, atkDur: 0, atkHit: false, atkTgt: null, contT: 0, burstN: 0, burstT: 0,
    state: 'roam', tgt: null, decT: M.rng.range(0, 0.4), gx: x, gy: y, goal: null, alive: true, z: 0, landT: 0,
    kills: 0, dmgDealt: 0, place: 0, flash: 0, burn: 0, burnSrc: null, bleed: 0, bleedSrc: null, poison: false,
    slow: 0, stun: 0, dmgMul: 1, spdMul: 1, relic: false, lastHitBy: null, lastHitT: -9, lastHitW: '',
    streak: 0, multi: 0, lastKillT: -9, stuckT: 0, sx: x, sy: y, walk: 0, moving: false, side: M.rng() < 0.5 ? 1 : -1,
    tickT: 0, deathT: 0, killer: null, killW: '', surviveT: 0, recoil: 0, lootGot: []
  };
}

/* ---------- zona ---------- */
function nextZone(M) {
  const Z = M.zone;
  Z.phase++;
  if (Z.phase >= ZONE_PHASES.length) { Z.mode = 'final'; Z.t = 999; return; }
  const P = ZONE_PHASES[Z.phase];
  const room = Math.max(0, Z.r - P.r) * 0.75;
  const a = M.rng() * TAU, rr = Math.sqrt(M.rng()) * Math.min(room, Z.phase === 0 ? 120 : room);
  Z.nx = clamp(Z.x + Math.cos(a) * rr, 90, MAP_W - 90);
  Z.ny = clamp(Z.y + Math.sin(a) * rr, 90, MAP_H - 90);
  Z.nr = P.r;
  Z.mode = 'wait'; Z.t = P.wait;
  emit(M, 'zone', { phase: Z.phase, mode: 'wait', t: P.wait });
}
function zoneUpdate(M) {
  const Z = M.zone;
  if (M.training) return;
  Z.t -= DT;
  if (Z.mode === 'wait' && Z.t <= 0) {
    const P = ZONE_PHASES[Z.phase];
    Z.mode = 'shrink'; Z.t = P.shrink; Z.fx = Z.x; Z.fy = Z.y; Z.fr = Z.r; Z.dps = P.dps;
    emit(M, 'zone', { phase: Z.phase, mode: 'shrink', t: P.shrink });
  } else if (Z.mode === 'shrink') {
    const P = ZONE_PHASES[Z.phase];
    const k = clamp(1 - Z.t / P.shrink, 0, 1);
    Z.x = lerp(Z.fx, Z.nx, k); Z.y = lerp(Z.fy, Z.ny, k); Z.r = lerp(Z.fr, Z.nr, k);
    if (Z.t <= 0) { Z.x = Z.nx; Z.y = Z.ny; Z.r = Z.nr; nextZone(M); }
  }
  if (M.t > 230) Z.dps = 30;
}
function outsideZone(M, x, y, margin) { const Z = M.zone; return dist2(x, y, Z.x, Z.y) > (Z.r - (margin || 0)) ** 2; }

function emit(M, type, data) { if (M.onEvent) M.onEvent(type, data || {}); }

/* ---------- paso principal ---------- */
function stepMatch(M) {
  M.t += DT;
  zoneUpdate(M);
  if (!M.training) worldEvents(M);
  const F = M.fighters;
  for (let i = 0; i < F.length; i++) { const f = F[i]; if (f.alive) updateFighter(M, f); }
  separate(M);
  updateProjectiles(M);
  updateAreas(M);
  if (!M.training && !M.over && M.aliveN <= 1) {
    M.over = true; M.endT = M.t;
    M.winner = F.find((f) => f.alive) || null;
    if (M.winner) { M.winner.place = 1; M.winner.surviveT = M.t; }
    emit(M, 'win', { winner: M.winner });
  }
}

function worldEvents(M) {
  /* suministros */
  if (M.nextAir.length && M.t >= M.nextAir[0]) {
    M.nextAir.shift();
    const Z = M.zone, a = M.rng() * TAU, r = Math.sqrt(M.rng()) * Math.max(10, Math.min(Z.r, Z.nr + 40) * 0.6);
    let x = clamp(Z.nx + Math.cos(a) * r, 60, MAP_W - 60), y = clamp(Z.ny + Math.sin(a) * r, 60, MAP_H - 60);
    for (let k = 0; k < 20 && (M.world.blocked(x, y, 10) || M.world.hazAt(x, y) === 1 || M.world.hazAt(x, y) === 2); k++) { x += M.rng.range(-20, 20); y += M.rng.range(-20, 20); }
    const A = { x, y, z: 170, landed: false, open: false };
    M.airdrops.push(A);
    emit(M, 'airdrop', { a: A });
  }
  for (const A of M.airdrops) if (!A.landed) { A.z -= 40 * DT; if (A.z <= 0) { A.z = 0; A.landed = true; M.fx.crateLand(A); } }
  /* evento aleatorio */
  if (!M.event && M.t >= M.eventT && M.aliveN > 6) {
    M.event = { kind: M.rng() < 0.5 ? 'meteor' : 'bolt', t: 9, next: 0 };
    emit(M, 'event', { kind: M.event.kind });
  }
  const E = M.event;
  if (E && E.t > 0) {
    E.t -= DT; E.next -= DT;
    if (E.next <= 0) {
      E.next = E.kind === 'meteor' ? 0.32 : 0.26;
      const alive = M.fighters.filter((f) => f.alive && f.z <= 0);
      let x, y;
      if (alive.length && M.rng() < 0.55) { const f = M.rng.pick(alive); x = f.x + M.rng.range(-28, 28); y = f.y + M.rng.range(-28, 28); }
      else { const Z = M.zone, a = M.rng() * TAU, r = Math.sqrt(M.rng()) * Math.min(Z.r, 330); x = Z.x + Math.cos(a) * r; y = Z.y + Math.sin(a) * r; }
      x = clamp(x, 30, MAP_W - 30); y = clamp(y, 30, MAP_H - 30);
      M.areas.push({ type: 'strike', kind: E.kind, x, y, t: E.kind === 'meteor' ? -1.3 : -0.9, r: E.kind === 'meteor' ? 22 : 15, dmg: E.kind === 'meteor' ? 30 : 24 });
    }
  }
}

/* ---------- luchadores ---------- */
function updateFighter(M, f) {
  const W = M.world;
  if (f.flash > 0) f.flash -= DT;
  if (f.d.dummy) { if (f.burn > 0) f.burn -= DT; if (f.bleed > 0) f.bleed -= DT; f.slow = Math.max(0, f.slow - DT); f.stun = Math.max(0, f.stun - DT); f.x += f.kx * DT * 0.05; f.kx *= KDECAY; return; }
  if (f.recoil > 0) f.recoil -= DT;
  /* caída inicial */
  if (f.state === 'land') {
    f.z -= 95 * DT;
    if (f.z <= 0) { f.z = 0; f.state = 'roam'; f.landT = M.t; f.decT = 0; M.fx.land(f); }
    return;
  }
  /* estados alterados */
  if (f.stun > 0) f.stun -= DT;
  if (f.slow > 0) f.slow -= DT;
  if (f.burn > 0) { f.burn -= DT; hurt(M, f, f.burnSrc, 4 * DT, { kind: 'burn', tick: true }); if (!f.alive) return; }
  if (f.bleed > 0) { f.bleed -= DT; hurt(M, f, f.bleedSrc, 2.4 * DT, { kind: f.poison ? 'poison' : 'bleed', tick: true }); if (!f.alive) return; }
  /* tormenta y lava */
  if (!M.training && outsideZone(M, f.x, f.y)) { hurt(M, f, null, M.zone.dps * DT, { kind: 'zone', tick: true }); if (!f.alive) return; }
  const hz = W.hazAt(f.x, f.y);
  if (hz === 1) { hurt(M, f, null, 22 * DT, { kind: 'lava', tick: true }); f.burn = Math.max(f.burn, 1); if (!f.alive) return; }
  /* regeneración fuera de combate */
  if (M.t - f.lastHitT > 4 && f.hp < f.maxHp && f.burn <= 0 && f.bleed <= 0) f.hp = Math.min(f.maxHp, f.hp + 3 * DT);
  /* decisión */
  f.decT -= DT;
  if (f.decT <= 0) { think(M, f); f.decT = 0.22 + M.rng() * 0.3; }
  if (f.cd > 0) f.cd -= DT;
  /* animación de ataque */
  const w = f.w;
  if (f.atkT >= 0) {
    f.atkT += DT;
    if ((w.k === 'melee' || w.k === 'thrust') && !f.atkHit && f.atkT >= f.atkDur * 0.5) { f.atkHit = true; resolveMelee(M, f); }
    if (f.atkT >= f.atkDur) f.atkT = -1;
  }
  if (f.burstN > 0) { f.burstT -= DT; if (f.burstT <= 0) { f.burstN--; f.burstT = 0.09; if (f.atkTgt && f.atkTgt.alive) fireProj(M, f, f.atkTgt); } }
  if (f.contT > 0) { f.contT -= DT; contTick(M, f); }

  /* movimiento */
  let mx = 0, my = 0;
  const go = (tx, ty, k) => { const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1; mx += dx / d * k; my += dy / d * k; return d; };
  const Z = M.zone;
  switch (f.state) {
    case 'zone': {
      const cx = Z.mode === 'shrink' || Z.t < 6 ? Z.nx : Z.x, cy = Z.mode === 'shrink' || Z.t < 6 ? Z.ny : Z.y;
      go(cx, cy, 1);
      opportunist(M, f, 1);
      break;
    }
    case 'flee': {
      const t = f.tgt;
      if (t && t.alive) { const dx = f.x - t.x, dy = f.y - t.y, d = Math.hypot(dx, dy) || 1; mx += dx / d; my += dy / d; }
      go(Z.x, Z.y, 0.6);
      opportunist(M, f, 1);
      break;
    }
    case 'fight': {
      const t = f.tgt;
      if (!t || !t.alive) { f.state = 'roam'; f.decT = 0; break; }
      const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy) || 1;
      const ux = dx / d, uy = dy / d, px = -uy * f.side, py = ux * f.side;
      const melee = w.k === 'melee' || w.k === 'thrust' || w.k === 'cont';
      if (melee) {
        const want = w.rng * 0.65 + FR;
        if (d > want) { mx += ux + px * 0.25; my += uy + py * 0.25; }
        else { mx += px * 0.35 - ux * 0.15; my += py * 0.35 - uy * 0.15; }
      } else {
        const pref = clamp(w.rng * 0.6, 34, 115);
        if (d > w.rng * 0.88) { mx += ux; my += uy; }
        else if (d < pref * 0.6) { mx -= ux; my -= uy; mx += px * 0.4; my += py * 0.4; }
        else { mx += px * 0.8; my += py * 0.8; }
      }
      if (M.training) { mx = 0; my = 0; if (melee && d > w.rng * 0.85 + FR) { mx = ux; my = uy; } }
      tryAttack(M, f, t);
      if (f.stuckT > 0.8) f.side = -f.side;
      break;
    }
    case 'loot': {
      const g = f.goal;
      if (!g || g.open) { f.state = 'roam'; f.decT = 0; break; }
      const d = go(g.x, g.y, 1);
      if (d < 9) openLoot(M, f, g);
      opportunist(M, f, 0.5);
      break;
    }
    default: { /* roam */
      const d = go(f.gx, f.gy, 0.85);
      if (d < 10) pickWander(M, f);
      opportunist(M, f, 0.6);
    }
  }
  /* steering con obstáculos y lava */
  let ml = Math.hypot(mx, my);
  if (ml > 0.01) {
    mx /= ml; my /= ml;
    const base = Math.atan2(my, mx);
    const tries = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.6, -2.6];
    for (const o of tries) {
      const a = base + o * f.side;
      const px = f.x + Math.cos(a) * 9, py = f.y + Math.sin(a) * 9;
      const h = W.hazAt(px, py);
      if (W.blocked(px, py, FR + 1)) continue;
      if (h === 1 && hz !== 1) continue;
      if (!M.training && f.state !== 'zone' && outsideZone(M, px, py, 4) && !outsideZone(M, f.x, f.y, 4)) continue;
      mx = Math.cos(a); my = Math.sin(a); break;
    }
    ml = 1;
  }
  const melee = w.k === 'melee' || w.k === 'thrust';
  let sp = f.spd * f.spdMul * (f.slow > 0 ? 0.72 : 1) * (hz === 2 ? 0.6 : 1) * (f.stun > 0 ? 0 : 1) * (f.atkT >= 0 && melee ? 0.55 : 1) * (f.contT > 0 ? 0.6 : 1);
  if (f.state === 'roam') sp *= 0.8;
  if (f.state === 'fight' && f.tgt) {
    const dt = dist(f.x, f.y, f.tgt.x, f.tgt.y);
    if (melee || w.k === 'cont') { if (dt > w.rng + FR + 2 && dt < 120) sp *= 1.7; }
    else sp *= 0.72;
  }
  const tvx = mx * sp, tvy = my * sp;
  f.vx += (tvx - f.vx) * 0.18; f.vy += (tvy - f.vy) * 0.18;
  f.x += (f.vx + f.kx) * DT; f.y += (f.vy + f.ky) * DT;
  f.kx *= KDECAY; f.ky *= KDECAY;
  /* colisión con obstáculos */
  for (const o of W.near(f.x, f.y)) {
    const dx = f.x - o.x, dy = f.y - o.y, d2 = dx * dx + dy * dy, m = o.r + FR;
    if (d2 < m * m) { const d = Math.sqrt(d2) || 1; f.x = o.x + dx / d * m; f.y = o.y + dy / d * m; f.kx *= 0.5; f.ky *= 0.5; }
  }
  f.x = clamp(f.x, EDGE + 6, MAP_W - EDGE - 6); f.y = clamp(f.y, EDGE + 6, MAP_H - EDGE - 6);
  const spd = Math.hypot(f.vx, f.vy);
  f.moving = spd > 6;
  if (f.moving) f.walk = (f.walk + spd * DT * 0.09) % 1;
  if (f.state === 'fight' || (f.contT > 0) || f.atkT >= 0) { /* mira al objetivo */ }
  else if (Math.abs(f.vx) > 4) f.f = f.vx > 0 ? 1 : -1;
  /* atasco */
  f.tickT += DT;
  if (f.tickT > 0.5) {
    const moved = dist(f.x, f.y, f.sx, f.sy);
    f.stuckT = moved < 3 && ml > 0 && f.stun <= 0 ? f.stuckT + 0.5 : 0;
    if (f.stuckT > 1.5) { f.side = -f.side; pickWander(M, f); if (f.state === 'loot') f.state = 'roam'; }
    f.sx = f.x; f.sy = f.y; f.tickT = 0;
  }
}

function pickWander(M, f) {
  const Z = M.zone;
  if (!M.training && M.rng() < f.P.aggr * 0.45) {
    let best = null, bd = 1e12;
    for (const o of M.fighters) if (o !== f && o.alive && o.z <= 0) { const d = dist2(f.x, f.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
    if (best) { f.gx = best.x + M.rng.range(-20, 20); f.gy = best.y + M.rng.range(-20, 20); return; }
  }
  const cx = Z.mode === 'shrink' ? Z.nx : Z.x, cy = Z.mode === 'shrink' ? Z.ny : Z.y;
  const R = Math.max(20, Math.min(Z.r, Z.nr + 60) * 0.7);
  for (let k = 0; k < 8; k++) {
    const a = M.rng() * TAU, r = Math.sqrt(M.rng()) * R;
    const x = clamp(cx + Math.cos(a) * r, EDGE + 20, MAP_W - EDGE - 20), y = clamp(cy + Math.sin(a) * r, EDGE + 20, MAP_H - EDGE - 20);
    if (!M.world.blocked(x, y, 8) && M.world.hazAt(x, y) !== 1) { f.gx = x; f.gy = y; return; }
  }
  f.gx = cx; f.gy = cy;
}

function think(M, f) {
  if (M.training) { f.state = 'fight'; f.tgt = M.fighters.find((o) => o !== f); return; }
  const P = f.P, Z = M.zone;
  let best = null, bestS = -1e9, bestD = 1e9, nearest = null, nd = 1e9;
  for (const o of M.fighters) {
    if (o === f || !o.alive || o.z > 0) continue;
    const d = dist(f.x, f.y, o.x, o.y);
    if (d < nd) { nd = d; nearest = o; }
    if (d > SIGHT) continue;
    let s = -d;
    if (P.weak) s += (1 - o.hp / o.maxHp) * 80 * P.weak;
    if (o === f.lastHitBy && M.t - f.lastHitT < 3) s += 80;
    if (P.duel && o.state === 'fight' && o.tgt && o.tgt !== f && M.t - o.lastHitT < 2) s -= 70;
    if (s > bestS) { bestS = s; best = o; bestD = d; }
  }
  const hpF = f.hp / f.maxHp;
  const dc = Math.sqrt(dist2(f.x, f.y, Z.x, Z.y));
  const dn = Math.sqrt(dist2(f.x, f.y, Z.nx, Z.ny));
  const danger = dc > Z.r - 8 || (Z.mode === 'shrink' && dn > Z.nr + (Z.r - Z.nr) * 0.45) || (Z.mode === 'wait' && Z.t < 7 && dn > Z.nr - 6);
  const attackedRecently = f.lastHitBy && f.lastHitBy.alive && M.t - f.lastHitT < 2.5;
  let aggr = P.chaos ? M.rng.range(0.15, 1) : P.aggr;
  if (M.t - f.landT < 12) aggr *= 0.25;
  else if (M.t < 45) aggr *= 0.5;
  else if (M.t < 80) aggr *= 0.75;
  if (f.relic) aggr = Math.min(1, aggr + 0.3);
  const keep = f.state === 'fight' && f.tgt && f.tgt.alive && dist(f.x, f.y, f.tgt.x, f.tgt.y) < SIGHT * 1.25;
  if (danger && !(keep && dist(f.x, f.y, f.tgt.x, f.tgt.y) < 30)) { f.state = 'zone'; return; }
  if (best && hpF < P.flee && bestD < 80 && !P.rage && !f.relic) { f.state = 'flee'; f.tgt = best; return; }
  if (keep && !(attackedRecently && f.lastHitBy !== f.tgt && M.rng() < 0.5)) return;
  const early = M.t - f.landT < 18;
  if (attackedRecently && dist(f.x, f.y, f.lastHitBy.x, f.lastHitBy.y) < SIGHT) {
    if (early && !P.rage && M.rng() < 0.5) { f.state = 'flee'; f.tgt = f.lastHitBy; return; }
    f.state = 'fight'; f.tgt = f.lastHitBy; return;
  }
  const lam = aggr * 0.14 * (1.15 - bestD / SIGHT) * (M.aliveN <= 12 ? 2.2 : 1);
  if (best && ((bestD < 22 && !early) || M.rng() < 1 - Math.exp(-lam * 0.37))) { f.state = 'fight'; f.tgt = best; return; }
  /* botín */
  let loot = null, ld = 1e9;
  const lootR = 120 + 80 * P.loot;
  for (const A of M.airdrops) if (A.landed && !A.open) { const d = dist(f.x, f.y, A.x, A.y) * 0.55; if (d < ld && d < 260) { ld = d; loot = A; } }
  for (const c of M.world.chests) if (!c.open) { const d = dist(f.x, f.y, c.x, c.y); if (d < ld && d < lootR && !outsideZone(M, c.x, c.y, 10)) { ld = d; loot = c; } }
  for (const c of M.drops) if (!c.open && (f.hp < f.maxHp * 0.8)) { const d = dist(f.x, f.y, c.x, c.y); if (d < ld && d < 90) { ld = d; loot = c; } }
  if (loot && (early || M.rng() < P.loot + 0.35)) { f.state = 'loot'; f.goal = loot; return; }
  /* últimos supervivientes: ir a por alguien */
  if (M.aliveN <= 6 && nearest && M.rng() < 0.6) { f.state = 'roam'; f.gx = nearest.x; f.gy = nearest.y; return; }
  if (f.state !== 'roam') { f.state = 'roam'; pickWander(M, f); }
}

function opportunist(M, f, prob) {
  if (f.cd > 0 || f.atkT >= 0 || f.stun > 0) return;
  const w = f.w, reach = (w.k === 'melee' || w.k === 'thrust' || w.k === 'cont') ? w.rng + FR + 1 : w.rng * 0.5;
  let best = null, bd = reach * reach;
  for (const o of M.fighters) {
    if (o === f || !o.alive || o.z > 0) continue;
    const d = dist2(f.x, f.y, o.x, o.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (best && (best === f.lastHitBy || M.rng() < prob * f.P.aggr * 0.004)) tryAttack(M, f, best);
}

/* ---------- ataques ---------- */
function aimAt(M, f, t, spd) {
  let tx = t.x, ty = t.y;
  if (spd) { const tt = dist(f.x, f.y, t.x, t.y) / spd; tx += t.vx * tt * f.P.skill; ty += t.vy * tt * f.P.skill; }
  const dd = dist(f.x, f.y, t.x, t.y);
  const err = ((1 - f.P.skill) * 0.32 + dd / 230 * 0.16) * (M.rng() * 2 - 1);
  return Math.atan2(ty - f.y, tx - f.x) + err;
}
function tryAttack(M, f, t) {
  const w = f.w;
  if (f.stun > 0 || !t.alive) return false;
  const d = dist(f.x, f.y, t.x, t.y);
  if (w.k === 'cont') {
    if (d <= w.rng + FR) { f.contT = 0.25; const a = Math.atan2(t.y - f.y, t.x - f.x); f.aim += angDiff(f.aim, a) * 0.3; f.f = Math.cos(f.aim) >= 0 ? 1 : -1; return true; }
    return false;
  }
  if (f.cd > 0 || f.atkT >= 0) return false;
  const jit = M.rng.range(0.9, 1.12) * (f.P.rage && f.hp < f.maxHp * 0.4 ? 0.8 : 1);
  if (w.k === 'melee' || w.k === 'thrust') {
    if (d > w.rng + FR + 1) return false;
    f.aim = Math.atan2(t.y - f.y, t.x - f.x); f.f = Math.cos(f.aim) >= 0 ? 1 : -1;
    f.atkT = 0; f.atkDur = clamp(w.cd * 0.75, 0.16, 0.5); f.atkHit = false; f.atkTgt = t; f.cd = w.cd * jit;
    M.fx.swing(f);
    return true;
  }
  if (d > w.rng) return false;
  if (w.k !== 'lob' && w.k !== 'wave' && !M.world.los(f.x, f.y - 2, t.x, t.y - 2)) return false;
  f.cd = w.cd * jit; f.atkT = 0; f.atkDur = 0.16; f.atkTgt = t;
  if (w.k === 'proj') { fireProj(M, f, t); if (w.burst) { f.burstN = w.burst - 1; f.burstT = 0.09; } }
  else if (w.k === 'beam') fireBeam(M, f, t);
  else if (w.k === 'lob') fireLob(M, f, t);
  else if (w.k === 'wave') { f.aim = Math.atan2(t.y - f.y, t.x - f.x); f.f = Math.cos(f.aim) >= 0 ? 1 : -1; const A = { type: 'wave', owner: f, x: f.x, y: f.y, ang: f.aim, cone: w.cone, r: 4, rmax: w.rng, hit: new Set() }; M.areas.push(A); M.fx.wave(A, f); }
  f.recoil = 0.12;
  return true;
}

function resolveMelee(M, f) {
  const w = f.w, reach = w.rng + FR + 2;
  const half = w.k === 'thrust' ? 0.55 : (w.arc || 1.6) / 2 + 0.35;
  let hit = 0;
  const targets = w.multi ? M.fighters : [f.atkTgt];
  for (const t of targets) {
    if (!t || t === f || !t.alive || t.z > 0) continue;
    const d = dist(f.x, f.y, t.x, t.y);
    if (d > reach + (w.multi ? 0 : 3)) continue;
    const a = Math.atan2(t.y - f.y, t.x - f.x);
    if (Math.abs(angDiff(f.aim, a)) > half) continue;
    hurt(M, t, f, w.dmg * 1.25, { kind: 'melee', dir: a, knock: w.knock, w });
    hit++;
  }
  if (!hit) M.fx.whiff(f);
}

function fireProj(M, f, t) {
  const w = f.w;
  const base = aimAt(M, f, t, w.spd);
  f.aim = base; f.f = Math.cos(base) >= 0 ? 1 : -1;
  const n = w.count || 1;
  for (let i = 0; i < n; i++) {
    const a = base + (n > 1 ? (i - (n - 1) / 2) * (w.spread / (n - 1)) : 0) + (n > 1 ? M.rng.range(-0.05, 0.05) : 0);
    const sx = f.x + Math.cos(a) * 7, sy = f.y + Math.sin(a) * 7;
    M.proj.push({ owner: f, w, type: w.p, x: sx, y: sy, ox: sx, oy: sy, vx: Math.cos(a) * w.spd, vy: Math.sin(a) * w.spd, ang: a,
      life: w.rng / w.spd * (w.boomer ? 0.55 : 1.05), t: 0, hit: new Set(), dmg: w.dmg, back: false, bounces: w.bounce || 0, tgt: t, spin: 0 });
  }
  M.fx.shoot(f, w, base);
}
function fireBeam(M, f, t) {
  const w = f.w;
  const a = aimAt(M, f, t, 0);
  f.aim = a; f.f = Math.cos(a) >= 0 ? 1 : -1;
  const pts = [[f.x + Math.cos(a) * 8, f.y + Math.sin(a) * 8 - 9]];
  const d = dist(f.x, f.y, t.x, t.y);
  const miss = Math.abs(angDiff(a, Math.atan2(t.y - f.y, t.x - f.x))) * d > FR + 2;
  if (miss) {
    pts.push([f.x + Math.cos(a) * w.rng, f.y + Math.sin(a) * w.rng - 9]);
    M.fx.beam(pts, w, false);
    M.fx.shoot(f, w, a);
    return;
  }
  pts.push([t.x, t.y - 9]);
  hurt(M, t, f, w.dmg, { kind: 'beam', dir: a, knock: w.chain ? 60 : 120, w });
  let cur = t; const hitSet = new Set([t]);
  for (let c = 0; c < (w.chain || 0); c++) {
    let nb = null, nd = 46 * 46;
    for (const o of M.fighters) if (o.alive && o !== f && !hitSet.has(o) && o.z <= 0) { const dd = dist2(cur.x, cur.y, o.x, o.y); if (dd < nd) { nd = dd; nb = o; } }
    if (!nb) break;
    hitSet.add(nb); pts.push([nb.x, nb.y - 9]);
    hurt(M, nb, f, w.dmg * 0.6, { kind: 'beam', dir: Math.atan2(nb.y - cur.y, nb.x - cur.x), knock: 40, w });
    cur = nb;
  }
  M.fx.beam(pts, w, true);
  M.fx.shoot(f, w, a);
}
function fireLob(M, f, t) {
  const w = f.w;
  const tt = 0.75;
  let tx = t.x + t.vx * tt * f.P.skill, ty = t.y + t.vy * tt * f.P.skill;
  tx += M.rng.range(-1, 1) * (1 - f.P.skill) * 24; ty += M.rng.range(-1, 1) * (1 - f.P.skill) * 24;
  f.aim = Math.atan2(ty - f.y, tx - f.x); f.f = Math.cos(f.aim) >= 0 ? 1 : -1;
  M.proj.push({ owner: f, w, type: w.p, lob: true, x: f.x, y: f.y, sx: f.x, sy: f.y, tx, ty, T: tt, t: 0, z: 10, hit: new Set(), dmg: w.dmg, spin: 0, ang: f.aim });
  M.fx.shoot(f, w, f.aim);
}

function contTick(M, f) {
  const w = f.w;
  M.fx.cont(f, w);
  for (const t of M.fighters) {
    if (t === f || !t.alive || t.z > 0) continue;
    const d = dist(f.x, f.y, t.x, t.y);
    if (d > w.rng + FR) continue;
    const a = Math.atan2(t.y - f.y, t.x - f.x);
    if (Math.abs(angDiff(f.aim, a)) > w.cone) continue;
    if (w.burn && !M.world.los(f.x, f.y, t.x, t.y)) continue;
    hurt(M, t, f, w.dps * DT, { kind: 'cont', dir: a, knock: w.knock || 2, w, tick: true });
  }
}

/* ---------- proyectiles ---------- */
function updateProjectiles(M) {
  const W = M.world;
  for (let i = M.proj.length - 1; i >= 0; i--) {
    const p = M.proj[i];
    p.t += DT; p.spin += DT * 18;
    let dead = false;
    if (p.lob) {
      const k = p.t / p.T;
      p.x = lerp(p.sx, p.tx, k); p.y = lerp(p.sy, p.ty, k); p.z = 10 + Math.sin(Math.min(1, k) * Math.PI) * 38 - k * 10;
      if (k >= 1) { explode(M, p.owner, p.tx, p.ty, p.w.aoe, p.dmg, 'bomb'); dead = true; }
    } else {
      if (p.w.homing && p.tgt && p.tgt.alive) {
        const a = Math.atan2(p.tgt.y - p.y, p.tgt.x - p.x), cur = Math.atan2(p.vy, p.vx);
        const na = cur + clamp(angDiff(cur, a), -2.6 * DT, 2.6 * DT), sp = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
      }
      if (p.w.boomer && !p.back && p.t > p.life) { p.back = true; p.hit.clear(); }
      if (p.back) {
        const o = p.owner;
        const a = Math.atan2(o.y - p.y, o.x - p.x), sp = p.w.spd * 1.1;
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp;
        if (!o.alive || dist2(p.x, p.y, o.x, o.y) < 64 || p.t > p.life * 4) dead = true;
      }
      p.x += p.vx * DT; p.y += p.vy * DT; p.ang = Math.atan2(p.vy, p.vx);
      if (!p.w.boomer && p.t > p.life) { dead = true; if (p.w.aoe) explode(M, p.owner, p.x, p.y, p.w.aoe, p.dmg * 0.7, 'fire'); else M.fx.projDie(p, false); }
      const ob = W.blocked(p.x, p.y, 1);
      if (!dead && ob) {
        if (p.bounces > 0) {
          const nx = p.x - ob.x, ny = p.y - ob.y, nl = Math.hypot(nx, ny) || 1, ux = nx / nl, uy = ny / nl;
          const dot = p.vx * ux + p.vy * uy; p.vx -= 2 * dot * ux; p.vy -= 2 * dot * uy; p.bounces--; p.x += ux * 2; p.y += uy * 2; p.hit.clear();
          M.fx.bounce(p);
        } else if (p.w.boomer) { p.back = true; p.hit.clear(); }
        else { dead = true; if (p.w.aoe) explode(M, p.owner, p.x, p.y, p.w.aoe, p.dmg * 0.7, 'fire'); else M.fx.projDie(p, true); }
      }
      if (p.x < 0 || p.y < 0 || p.x > MAP_W || p.y > MAP_H) dead = true;
      if (!dead) {
        for (const t of M.fighters) {
          if (t === p.owner || !t.alive || t.z > 0 || p.hit.has(t)) continue;
          if (dist2(p.x, p.y, t.x, t.y - 3) < (FR + 2) * (FR + 2)) {
            p.hit.add(t);
            const w = p.w;
            hurt(M, t, p.owner, p.dmg, { kind: 'proj', dir: p.ang, knock: w.knock || 45, w });
            if (w.aoe) { explode(M, p.owner, p.x, p.y, w.aoe, p.dmg * 0.6, 'fire', t); dead = true; break; }
            if (w.pierce) { p.dmg *= 0.8; continue; }
            if (w.boomer) { p.back = true; continue; }
            if (p.bounces > 0) { p.vx = -p.vx; p.vy = -p.vy; p.bounces--; continue; }
            dead = true; M.fx.projDie(p, false); break;
          }
        }
      }
    }
    if (dead) M.proj.splice(i, 1);
  }
}

function explode(M, owner, x, y, r, dmg, kind, skip, w, stun) {
  M.fx.explode(x, y, r, kind);
  for (const t of M.fighters) {
    if (!t.alive || t.z > 0 || t === skip) continue;
    const d = dist(x, y, t.x, t.y);
    if (d > r + FR) continue;
    const k = 1 - clamp(d / (r + FR), 0, 1) * 0.6;
    const self = t === owner ? 0.5 : 1;
    hurt(M, t, owner, dmg * k * self, { kind: 'boom', dir: Math.atan2(t.y - y, t.x - x), knock: kind === 'bomb' || kind === 'meteor' ? 200 : 90, w: w || (owner ? owner.w : null), burn: kind !== 'bolt' });
    if (stun && t.alive) t.stun = Math.max(t.stun, stun);
  }
}

/* ---------- áreas (ondas y golpes del cielo) ---------- */
function updateAreas(M) {
  for (let i = M.areas.length - 1; i >= 0; i--) {
    const A = M.areas[i];
    let dead = false;
    if (A.type === 'wave') {
      A.r += 150 * DT;
      for (const t of M.fighters) {
        if (t === A.owner || !t.alive || t.z > 0 || A.hit.has(t)) continue;
        const d = dist(A.x, A.y, t.x, t.y);
        if (d > A.r || d < A.r - 12) continue;
        const a = Math.atan2(t.y - A.y, t.x - A.x);
        if (Math.abs(angDiff(A.ang, a)) > A.cone / 2 + 0.15) continue;
        A.hit.add(t);
        hurt(M, t, A.owner, A.owner.w.dmg, { kind: 'wave', dir: a, knock: A.owner.w.knock, w: A.owner.w });
      }
      if (A.r >= A.rmax) dead = true;
    } else if (A.type === 'strike') {
      const before = A.t;
      A.t += DT;
      if (A.track && A.track.alive && A.t < -0.15) { A.x = A.track.x; A.y = A.track.y; }
      if (before < 0 && A.t >= 0) { explode(M, A.owner || null, A.x, A.y, A.r, A.dmg, A.kind, A.owner || null, A.w, A.stun); }
      if (A.t > 0.2) dead = true;
    }
    if (dead) M.areas.splice(i, 1);
  }
}

/* ---------- daño y muerte ---------- */
function hurt(M, t, src, amount, o) {
  if (!t.alive || amount <= 0) return;
  if (t.d.dummy) { M.fx.hit(t, src, amount, o, false, false); if (!o.tick) t.flash = 0.1; t.hp = t.maxHp; applyStatus(M, t, src, o); return; }
  let dmg = amount, crit = false;
  if (src && src !== t && !o.tick && o.kind !== 'boom') {
    dmg *= src.str * src.dmgMul * (src.P.rage && src.hp < src.maxHp * 0.4 ? 1.35 : 1);
    if (M.rng() < 0.07 + src.luck) { dmg *= 1.75; crit = true; }
  } else if (src && o.kind === 'boom') dmg *= src.dmgMul;
  let absorbed = 0;
  if (t.armor > 0 && o.kind !== 'zone' && o.kind !== 'bleed' && o.kind !== 'poison' && o.kind !== 'burn') {
    absorbed = Math.min(t.armor, dmg * 0.75); t.armor -= absorbed; dmg -= absorbed;
  }
  t.hp -= dmg;
  if (!o.tick) t.flash = 0.11;
  if (src && src !== t) {
    src.dmgDealt += dmg + absorbed;
    if (o.kind !== 'burn' && o.kind !== 'bleed' && o.kind !== 'poison') { t.lastHitBy = src; t.lastHitT = M.t; t.lastHitW = o.w ? o.w.n : ''; }
    if (o.w && o.w.leech && (o.kind === 'melee' || o.kind === 'thrust' || o.kind === 'cont')) src.hp = Math.min(src.maxHp, src.hp + dmg * o.w.leech);
    if (src.leechAll && src.alive) src.hp = Math.min(src.maxHp, src.hp + dmg * src.leechAll);
  }
  if (o.knock && !o.tick) { const k = o.knock / t.mass * (crit ? 1.4 : 1); t.kx += Math.cos(o.dir) * k; t.ky += Math.sin(o.dir) * k; }
  else if (o.knock && o.kind === 'cont') { t.kx += Math.cos(o.dir) * o.knock * 0.3; t.ky += Math.sin(o.dir) * o.knock * 0.3; }
  applyStatus(M, t, src, o);
  M.fx.hit(t, src, dmg + absorbed, o, crit, absorbed > 0);
  if (t.hp <= 0) kill(M, t, src, o, -t.hp);
}
function applyStatus(M, t, src, o) {
  const w = o.w;
  if (o.burn || (w && w.burn && !o.tick && o.kind !== 'boom')) { t.burn = Math.max(t.burn, 3); t.burnSrc = src; }
  if (o.kind === 'cont' && w && w.burn) { t.burn = Math.max(t.burn, 2); t.burnSrc = src; }
  if (w && !o.tick && o.kind !== 'boom') {
    if (w.bleed) { t.bleed = Math.max(t.bleed, 3); t.bleedSrc = src; t.poison = !!w.poison; }
    if (w.slow) t.slow = Math.max(t.slow, 1.4);
    if (w.stun) t.stun = Math.max(t.stun, w.stun);
  }
  if (o.kind === 'cont' && w && w.bleed) { t.bleed = Math.max(t.bleed, 1.5); t.bleedSrc = src; t.poison = false; }
}

function kill(M, t, src, o, overkill) {
  t.alive = false; t.hp = 0; t.place = M.aliveN; M.aliveN--;
  t.deathT = M.t; t.surviveT = M.t;
  const cause = { zone: 'la tormenta', lava: 'la lava', burn: 'las llamas', bleed: 'una hemorragia', poison: 'el veneno' }[o.kind];
  t.killer = src && src !== t ? src : null;
  if (cause) t.killW = cause;
  else if (src === t) t.killW = 'su propia arma';
  else if (o.kind === 'boom' && !src) t.killW = M.event && M.event.kind === 'bolt' ? 'un rayo del cielo' : 'un meteorito';
  else t.killW = o.w ? o.w.n : '';
  M.placements.unshift(t);
  let multi = 0;
  const k = t.killer;
  if (k) {
    k.kills++;
    k.hp = Math.min(k.maxHp, k.hp + 12);
    multi = M.t - k.lastKillT < 4.5 ? k.multi + 1 : 1;
    k.multi = multi; k.lastKillT = M.t;
    if (k.state === 'fight' && k.tgt === t) { k.state = 'roam'; k.decT = 0.2; }
  }
  if (M.rng() < 0.22) M.drops.push({ x: t.x, y: t.y, type: 'potion', open: false });
  M.fx.death(t, k, o, overkill);
  emit(M, 'kill', { victim: t, killer: k, weapon: t.killW, multi, first: !M.firstBlood, remaining: M.aliveN });
  M.firstBlood = true;
  for (const ms of [25, 10, 5, 3, 2]) if (M.aliveN === ms && M.lastMilestone > ms) { M.lastMilestone = ms; emit(M, 'remaining', { n: ms }); }
}

function openLoot(M, f, g) {
  g.open = true;
  let item;
  if (g.z !== undefined) {
    item = { id: 'reliquia', n: 'Reliquia del suministro', c: '#ffd65a' };
    f.hp = f.maxHp; f.armor = Math.min(100, f.armor + 60); f.dmgMul += 0.35; f.relic = true;
  } else if (g.type === 'potion') {
    item = { id: 'pocion', n: 'Poción', c: '#e8402f' }; f.hp = Math.min(f.maxHp, f.hp + 30 * (f.lootMul || 1));
  } else {
    let tot = 0; for (const l of LOOT) tot += l.w;
    let r = M.rng() * tot; item = LOOT[0];
    for (const l of LOOT) { r -= l.w; if (r <= 0) { item = l; break; } }
    const lm = f.lootMul || 1;
    if (item.id === 'pocion') f.hp = Math.min(f.maxHp, f.hp + 45 * lm);
    else if (item.id === 'escudo') f.armor = Math.min(100, f.armor + 40 * lm);
    else if (item.id === 'afilado') f.dmgMul += 0.2 * lm;
    else if (item.id === 'botas') f.spdMul += 0.15 * lm;
    else if (item.id === 'corazon') { f.maxHp += 20 * lm; f.hp += 20 * lm; }
  }
  f.lootGot.push(item.id);
  M.fx.pickup(f, item, g);
  emit(M, 'loot', { f, item });
  f.state = 'roam'; f.decT = 0;
}

function separate(M) {
  const F = M.fighters;
  for (let i = 0; i < F.length; i++) {
    const a = F[i]; if (!a.alive || a.z > 0) continue;
    for (let j = i + 1; j < F.length; j++) {
      const b = F[j]; if (!b.alive || b.z > 0) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, m = FR * 2;
      if (d2 < m * m && d2 > 0.0001) {
        const d = Math.sqrt(d2), push = (m - d) / 2, ux = dx / d, uy = dy / d;
        if (!a.d.dummy) { a.x -= ux * push; a.y -= uy * push; }
        if (!b.d.dummy) { b.x += ux * push; b.y += uy * push; }
      }
    }
  }
}

/* ---------- ventajas y favores del público (solo el campeón del jugador) ---------- */
const PERKS = {
  hierro:    { n: 'Piel de hierro', d: 'Empieza con 50 de escudo.' },
  ligero:    { n: 'Pies ligeros', d: '15 % más rápido.' },
  vampiro:   { n: 'Vampiro', d: 'Recupera el 15 % del daño que hace.' },
  furia:     { n: 'Furia', d: '15 % más de daño.' },
  tanque:    { n: 'Tanque', d: '25 % más de vida.' },
  carronero: { n: 'Carroñero', d: 'Cofres y pociones rinden un 60 % más.' }
};
const PERK_IDS = Object.keys(PERKS);
function applyPerk(f, id) {
  f.perk = id;
  if (id === 'hierro') f.armor = Math.max(f.armor, 50);
  else if (id === 'ligero') f.spdMul += 0.15;
  else if (id === 'vampiro') f.leechAll = 0.15;
  else if (id === 'furia') f.dmgMul += 0.15;
  else if (id === 'tanque') { f.maxHp *= 1.25; f.hp = f.maxHp; }
  else if (id === 'carronero') f.lootMul = 1.6;
}
/* lleva al campeón al punto de salto elegido (o al punto válido más cercano) */
function validDrop(M, x, y) {
  const W = M.world;
  const ok = (px, py) => px > EDGE + 14 && py > EDGE + 14 && px < MAP_W - EDGE - 14 && py < MAP_H - EDGE - 14 && !W.blocked(px, py, FR + 2) && W.hazAt(px, py) !== 1 && W.hazAt(px, py) !== 2;
  if (ok(x, y)) return { x, y };
  for (let r = 4; r < 120; r += 4) for (let a = 0; a < TAU; a += 0.4) { const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (ok(px, py)) return { x: px, y: py }; }
  return { x: MAP_W / 2, y: MAP_H / 2 };
}
function placeFighter(M, f, x, y) {
  const p = validDrop(M, x, y);
  f.x = f.sx = f.gx = p.x; f.y = f.sy = f.gy = p.y;
  return p;
}
const FAVOR_BOLT = { n: 'Rayo del público', id: 'favor' };
const FAVOR_SPIN = { n: 'Contraataque', id: 'spin' };
function favorHeal(M, f) {
  if (!f.alive) return false;
  const h = f.maxHp * 0.45;
  f.hp = Math.min(f.maxHp, f.hp + h); f.burn = 0; f.bleed = 0; f.poison = false; f.slow = 0;
  M.fx.favorHeal(f, h);
  return true;
}
function favorBolt(M, f, t) {
  if (!f.alive || !t || !t.alive) return false;
  M.areas.push({ type: 'strike', kind: 'bolt', x: t.x, y: t.y, t: -0.45, r: 13, dmg: 34, owner: f, track: t, stun: 1.1, w: FAVOR_BOLT });
  return true;
}
/* calidad 0 = flojo, 1 = bien, 2 = perfecto */
function favorSpin(M, f, q) {
  if (!f.alive) return 0;
  const dmg = [10, 22, 38][q], r = [16, 21, 26][q], st = [0.2, 0.6, 1.1][q], kn = [120, 200, 280][q];
  let n = 0;
  for (const t of M.fighters) {
    if (t === f || !t.alive || t.z > 0) continue;
    const d = dist(f.x, f.y, t.x, t.y);
    if (d > r + FR) continue;
    hurt(M, t, f, dmg, { kind: 'spin', dir: Math.atan2(t.y - f.y, t.x - f.x), knock: kn, w: FAVOR_SPIN });
    if (t.alive) t.stun = Math.max(t.stun, st);
    n++;
  }
  M.fx.spin(f, r, q);
  return n;
}

/* ejecuta la partida entera sin dibujar (saltar al final, pruebas) */
function runToEnd(M, maxT) {
  const fx = M.fx; M.fx = NOFX;
  const lim = maxT || 400;
  while (!M.over && M.t < lim) stepMatch(M);
  M.fx = fx;
  return M;
}

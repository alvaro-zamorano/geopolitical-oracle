/* ===== mundo: biomas, obstáculos, peligros, cofres ===== */
const MAP_W = 800, MAP_H = 800, BS = 2, BW = MAP_W / BS, BH = MAP_H / BS, EDGE = 22;
const BIOMES = {
  pradera:  { n: 'Pradera de los Lamentos', g: ['#5d9e3f', '#539339', '#68ab48', '#4a8432'], obs: [['tree', 5], ['rock', 2], ['bush', 0]], dens: 0.8 },
  bosque:   { n: 'Bosque Negro',            g: ['#3a7234', '#33662e', '#427d3b', '#2d5a28'], obs: [['tree', 6], ['bigtree', 3], ['mushroom', 1], ['rock', 1]], dens: 2.2 },
  desierto: { n: 'Dunas del Olvido',        g: ['#d9b56b', '#cfa95f', '#e3c27b', '#c49c55'], obs: [['cactus', 6], ['sandrock', 3]], dens: 0.9 },
  nieve:    { n: 'Tundra Helada',           g: ['#e3ebf2', '#d5e0ea', '#f1f5f9', '#c6d4e2'], obs: [['pine', 7], ['snowrock', 3], ['crystal', 2]], dens: 1.4 },
  volcan:   { n: 'Volcán Ceniza',           g: ['#3d3034', '#342829', '#463a3d', '#2c2224'], obs: [['obsidian', 6], ['deadtree', 3], ['magma', 2]], dens: 1.0 },
  ruinas:   { n: 'Ruinas de Kael',          g: ['#8b8a86', '#81807b', '#979691', '#74736e'], obs: [['pillar', 6], ['block', 4], ['statue', 1]], dens: 1.2 },
  pantano:  { n: 'Pantano Pútrido',         g: ['#4b5b36', '#43522f', '#56683d', '#3a4729'], obs: [['deadtree', 5], ['mushroom', 3], ['tree', 1]], dens: 1.1 }
};
const BIOME_KEYS = Object.keys(BIOMES);
const OBS_R = { tree: 5, bigtree: 7, pine: 5, cactus: 3, rock: 5, sandrock: 5, snowrock: 5, crystal: 4, obsidian: 5, deadtree: 3, magma: 4, pillar: 4, block: 5, statue: 5, mushroom: 4, bush: 0 };
const ISLAND_NAMES = ['Isla Calavera', 'Isla Sin Retorno', 'Isla Maldita', 'Isla Carnicera', 'Isla del Fin', 'Isla Tormenta', 'Isla Hueso', 'Isla de los Cincuenta'];

function genWorld(seed) {
  const rng = RNG(seed ^ 0x9e3779b9);
  const s1 = (seed * 7 + 3) | 0, s2 = (seed * 13 + 11) | 0, s3 = (seed * 31 + 5) | 0;
  /* semillas de bioma */
  const types = rng.shuffle(BIOME_KEYS.slice());
  const seeds = [];
  let minD = 250, tries = 0;
  while (seeds.length < types.length && tries < 4000) {
    tries++;
    if (tries % 400 === 0) minD -= 25;
    const p = { x: rng.range(90, MAP_W - 90), y: rng.range(90, MAP_H - 90) };
    if (seeds.every((q) => dist2(p.x, p.y, q.x, q.y) > minD * minD)) seeds.push(p);
  }
  seeds.forEach((p, i) => (p.b = i));
  const biome = new Uint8Array(BW * BH);
  for (let j = 0; j < BH; j++) {
    for (let i = 0; i < BW; i++) {
      const x = (i + 0.5) * BS, y = (j + 0.5) * BS;
      const wx = x + (fbm(x * 0.006, y * 0.006, s1) - 0.5) * 150;
      const wy = y + (fbm(x * 0.006, y * 0.006, s2) - 0.5) * 150;
      let best = 0, bd = 1e12;
      for (let k = 0; k < seeds.length; k++) { const d = dist2(wx, wy, seeds[k].x, seeds[k].y); if (d < bd) { bd = d; best = k; } }
      biome[j * BW + i] = best;
    }
  }
  const W = {
    seed, W: MAP_W, H: MAP_H, types, seeds, biome, hazard: new Uint8Array(BW * BH),
    obstacles: [], chests: [], spawns: [], pools: [], name: rng.pick(ISLAND_NAMES), s3, island: true, bw: BW
  };
  W.biomeAt = (x, y) => types[biome[clamp(y / BS | 0, 0, BH - 1) * BW + clamp(x / BS | 0, 0, BW - 1)]];
  W.hazAt = (x, y) => W.hazard[clamp(y / BS | 0, 0, BH - 1) * BW + clamp(x / BS | 0, 0, BW - 1)];
  const pointIn = (b) => {
    for (let t = 0; t < 600; t++) {
      const x = rng.range(EDGE + 30, MAP_W - EDGE - 30), y = rng.range(EDGE + 30, MAP_H - EDGE - 30);
      if (W.biomeAt(x, y) === b) return { x, y };
    }
    return null;
  };
  /* charcos de lava y agua */
  const blob = (b, kind, n, r0, r1) => {
    for (let k = 0; k < n; k++) {
      const p = pointIn(b);
      if (!p) continue;
      const r = rng.range(r0, r1);
      W.pools.push({ x: p.x, y: p.y, r, kind });
      for (let j = (p.y - r * 1.4) / BS | 0; j <= (p.y + r * 1.4) / BS; j++) {
        for (let i = (p.x - r * 1.4) / BS | 0; i <= (p.x + r * 1.4) / BS; i++) {
          if (i < 0 || j < 0 || i >= BW || j >= BH) continue;
          const x = (i + 0.5) * BS, y = (j + 0.5) * BS;
          const d = Math.sqrt(dist2(x, y, p.x, p.y));
          const lim = r * (0.7 + 0.55 * vnoise(x * 0.08, y * 0.08, s3 + k));
          if (d < lim && types[biome[j * BW + i]] === b) W.hazard[j * BW + i] = kind;
        }
      }
    }
  };
  blob('volcan', 1, 4, 10, 22);
  blob('pantano', 2, 5, 10, 20);
  blob('nieve', 3, 2, 14, 24);

  /* obstáculos */
  const free = (x, y, r, pad) => {
    if (x < EDGE + 12 || y < EDGE + 12 || x > MAP_W - EDGE - 12 || y > MAP_H - EDGE - 12) return false;
    const hz = W.hazAt(x, y); if (hz === 1 || hz === 2) return false;
    for (const o of W.obstacles) if (dist2(x, y, o.x, o.y) < sq(r + o.r + pad)) return false;
    return true;
  };
  const addObs = (type, x, y) => { const o = { type, x: Math.round(x), y: Math.round(y), r: OBS_R[type], v: rng.int(0, 2) }; W.obstacles.push(o); return o; };
  /* muros de ruinas */
  for (let k = 0; k < 4; k++) {
    const p = pointIn('ruinas'); if (!p) break;
    const a = rng.pick([0, Math.PI / 2]) + rng.range(-0.15, 0.15), n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const x = p.x + mcos(a) * i * 11, y = p.y + msin(a) * i * 11;
      if (rng() < 0.82 && free(x, y, 5, -2)) addObs(i % 2 ? 'block' : 'pillar', x, y);
    }
  }
  const maxD = Math.max(...BIOME_KEYS.map((k) => BIOMES[k].dens));
  let placed = 0, att = 0;
  const target = 185;
  while (placed < target && att < 20000) {
    att++;
    const x = rng.range(EDGE + 14, MAP_W - EDGE - 14), y = rng.range(EDGE + 14, MAP_H - EDGE - 14);
    const b = W.biomeAt(x, y), B = BIOMES[b];
    if (rng() > B.dens / maxD) continue;
    let tot = 0; for (const o of B.obs) tot += o[1];
    let r = rng() * tot, type = B.obs[0][0];
    for (const o of B.obs) { r -= o[1]; if (r <= 0) { type = o[0]; break; } }
    if (!OBS_R[type]) continue;
    if (!free(x, y, OBS_R[type], 12)) continue;
    addObs(type, x, y); placed++;
  }
  /* rejilla de colisión */
  W.cell = 32; W.gw = Math.ceil(MAP_W / W.cell); W.grid = [];
  for (let i = 0; i < W.gw * W.gw; i++) W.grid.push([]);
  for (const o of W.obstacles) {
    const m = o.r + 8;
    for (let cy = Math.max(0, (o.y - m) / W.cell | 0); cy <= Math.min(W.gw - 1, (o.y + m) / W.cell | 0); cy++)
      for (let cx = Math.max(0, (o.x - m) / W.cell | 0); cx <= Math.min(W.gw - 1, (o.x + m) / W.cell | 0); cx++)
        W.grid[cy * W.gw + cx].push(o);
  }
  W.near = (x, y) => W.grid[clamp(y / W.cell | 0, 0, W.gw - 1) * W.gw + clamp(x / W.cell | 0, 0, W.gw - 1)];
  W.blocked = (x, y, pad) => {
    for (const o of W.near(x, y)) if (dist2(x, y, o.x, o.y) < sq(o.r + pad)) return o;
    return null;
  };
  W.los = (x1, y1, x2, y2) => {
    const d = Math.sqrt(dist2(x1, y1, x2, y2)), n = Math.ceil(d / 5);
    for (let i = 1; i < n; i++) { const t = i / n; if (W.blocked(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0)) return false; }
    return true;
  };
  /* cofres */
  const openPoint = (minDist, list, r) => {
    for (let t = 0; t < 3000; t++) {
      const x = rng.range(EDGE + 30, MAP_W - EDGE - 30), y = rng.range(EDGE + 30, MAP_H - EDGE - 30);
      if (W.hazAt(x, y) === 1 || W.hazAt(x, y) === 2) continue;
      if (W.blocked(x, y, r)) continue;
      if (list.some((q) => dist2(x, y, q.x, q.y) < minDist * minDist)) { if (t < 2400) continue; }
      return { x: Math.round(x), y: Math.round(y) };
    }
    return { x: MAP_W / 2, y: MAP_H / 2 };
  };
  for (let i = 0; i < 24; i++) { const p = openPoint(80, W.chests, 9); W.chests.push({ x: p.x, y: p.y, open: false }); }
  for (let i = 0; i < 50; i++) W.spawns.push(openPoint(76, W.spawns, 10));
  return W;
}

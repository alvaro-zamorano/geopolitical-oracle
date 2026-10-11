/* ===== render: suelo, obstáculos, efectos, cámara ===== */
const BLOOD = ['#7a0d14', '#8f121b', '#a8141e', '#6b0b11', '#b3161f'];
const FIRE = ['#fff3b0', '#ffd65a', '#ffb03a', '#ff7a1a', '#e2501c', '#b8300f', '#5a4048', '#3e3238'];

/* fuente pixel 3x5 */
const FONT3 = (() => {
  const g = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010', 8: '010101010101010', 9: '010101011001110',
    '!': '010010010000010', '+': '000010111010000', '-': '000000111000000', '.': '000000000000010', "'": '010010000000000', ' ': '000000000000000', ':': '000010000010000'
  };
  const out = {};
  for (const k in g) { const pts = []; for (let i = 0; i < 15; i++) if (g[k][i] === '1') pts.push([i % 3, Math.floor(i / 3)]); out[k] = pts; }
  return out;
})();
function plain(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase(); }
function drawText3(ctx, str, x, y, col, sc, outline) {
  sc = sc || 1;
  const s = plain(str);
  const w = s.length * 4 * sc - sc;
  let cx = Math.round(x - w / 2);
  const cy = Math.round(y);
  const pass = (c, ox, oy) => {
    ctx.fillStyle = c;
    let px = cx;
    for (const ch of s) { const g = FONT3[ch] || FONT3[' ']; for (const p of g) ctx.fillRect(px + p[0] * sc + ox, cy + p[1] * sc + oy, sc, sc); px += 4 * sc; }
  };
  if (outline) { pass(outline, -1, 0); pass(outline, 1, 0); pass(outline, 0, -1); pass(outline, 0, 1); pass(outline, 1, 1); }
  pass(col, 0, 0);
}

function fillCirclePx(ctx, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.35); ctx.fillRect(cx - w, cy + dy, w * 2 + 1, 1); }
}
function ringPx(ctx, cx, cy, r) {
  cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
  let x = r, y = 0, err = 1 - r;
  while (x >= y) {
    ctx.fillRect(cx + x, cy + y, 1, 1); ctx.fillRect(cx + y, cy + x, 1, 1); ctx.fillRect(cx - y, cy + x, 1, 1); ctx.fillRect(cx - x, cy + y, 1, 1);
    ctx.fillRect(cx - x, cy - y, 1, 1); ctx.fillRect(cx - y, cy - x, 1, 1); ctx.fillRect(cx + y, cy - x, 1, 1); ctx.fillRect(cx + x, cy - y, 1, 1);
    y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
  }
}

/* ---------- suelo ---------- */
function buildGround(world, k) {
  const K = k || 1;
  const WW = world.W, HH = world.H, W = WW * K, H = HH * K, bw = world.bw || BW, bh = (HH / BS) | 0;
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const img = x.createImageData(W, H), U = new Uint32Array(img.data.buffer);
  const s = world.s3 || 7;
  const pk = (h) => { const r = hexToRgb(h); return ((255 << 24) | (r[2] << 16) | (r[1] << 8) | r[0]) >>> 0; };
  const pals = world.types.map((t) => BIOMES[t].g.map(pk));
  const isRuin = world.types.map((t) => t === 'ruinas');
  const HZ = [null, ['#e2501c', '#ff7a1a', '#ffb03a', '#b8300f'].map(pk), ['#2c4a44', '#33564f', '#4d7068', '#24403b'].map(pk), ['#bfe0f2', '#cfe8f6', '#e4f4fc', '#9fc9e3'].map(pk)];
  const crust = [0, pk('#1e1416'), pk('#33402a'), pk('#a9cde3')];
  const sea = ['#1d3a5c', '#244a72', '#2f5d8a'].map(pk), foam = pk('#d8eef6'), sand = pk('#d9c48a'), sandD = pk('#c4ad74');
  const hz = (wx, wy) => world.hazard[clamp(wy / BS | 0, 0, bh - 1) * bw + clamp(wx / BS | 0, 0, bw - 1)];
  const tile = 10 * K, inv = 1 / K, bd = K > 1 ? 1.5 : 2;
  for (let wy = 0; wy < HH; wy++) {
    for (let wx = 0; wx < WW; wx++) {
      const shore = world.island ? 9 + 9 * vnoise(wx * 0.045, wy * 0.045, s + 3) : -1e9;
      const edgeW = world.island ? Math.min(wx, wy, WW - 1 - wx, HH - 1 - wy) : 1e9;
      const h = hz(wx, wy);
      let nLow = 0, seaN = 0, P = null, ruin = false, rn = 0;
      if (edgeW < shore + 2) seaN = vnoise(wx * 0.12, wy * 0.3, s + 9) * 2.4;
      if (h) nLow = vnoise(wx * 0.2, wy * 0.2, s + h) * 0.7;
      else {
        const bi = world.biome[(wy / BS | 0) * bw + (wx / BS | 0)];
        P = pals[bi]; ruin = isRuin[bi];
        nLow = vnoise(wx * 0.13, wy * 0.13, s) * 0.55 + vnoise(wx * 0.5, wy * 0.5, s + 1) * 0.15;
        if (ruin) rn = vnoise(wx * 0.07, wy * 0.07, s + 21);
      }
      for (let sy = 0; sy < K; sy++) {
        for (let sx = 0; sx < K; sx++) {
          const px = wx * K + sx, py = wy * K + sy, i = py * W + px;
          const hsh = hash2(px, py, s);
          if (edgeW < shore + 1) {
            const fx = px * inv, fy = py * inv, e = Math.min(fx, fy, WW - 1 - fx, HH - 1 - fy);
            if (e < shore - 5) { U[i] = hsh > 0.992 ? foam : (sea[(seaN + hsh * 0.6) | 0] || sea[2]); continue; }
            if (e < shore - 3.5) { U[i] = foam; continue; }
            if (e < shore) { U[i] = hsh > 0.6 ? sandD : sand; continue; }
          }
          if (h) {
            const n = nLow + hsh * 0.3, PP = HZ[h];
            let col = n < 0.3 ? PP[3] : n > 0.72 ? PP[2] : n > 0.55 ? PP[1] : PP[0];
            const fx = px * inv, fy = py * inv;
            if (!(hz(Math.min(WW - 1, fx + bd), fy) && hz(Math.max(0, fx - bd), fy) && hz(fx, Math.min(HH - 1, fy + bd)) && hz(fx, Math.max(0, fy - bd)))) col = crust[h];
            U[i] = col; continue;
          }
          const n = nLow + hsh * 0.3;
          let col = n < 0.33 ? P[1] : n > 0.7 ? P[2] : P[0];
          if (hsh > 0.985) col = P[3];
          if (ruin) {
            const tx = (px + ((py / tile | 0) % 2) * (tile / 2)) % tile;
            if (py % tile === 0 || tx === 0) col = P[3];
            else if (K > 1 && (py % tile === 1 || tx === 1)) col = P[2];
            else if (rn > 0.72) col = P[1];
          }
          U[i] = col;
        }
      }
    }
  }
  /* detalles (directamente en el búfer) */
  const rng = RNG(s + 99);
  const PC = new Map();
  const P = (px, py, c) => { if (px < 0 || py < 0 || px >= W || py >= H) return; let v = PC.get(c); if (v === undefined) { v = pk(c); PC.set(c, v); } U[py * W + px] = v; };
  const n = (W * H) / 220;
  for (let i = 0; i < n; i++) {
    const px = rng.int(4, W - 5), py = rng.int(4, H - 5), wx = px / K, wy = py / K;
    if (hz(wx, wy) && hz(wx, wy) !== 2) continue;
    const key = world.types[world.biome[(wy / BS | 0) * bw + (wx / BS | 0)]];
    const r = rng();
    if (world.island && Math.min(wx, wy, WW - wx, HH - wy) < 26) continue;
    if (hz(wx, wy) === 2) { if (r < 0.25) { P(px, py, '#5a8a3a'); P(px + 1, py, '#5a8a3a'); P(px, py + 1, '#4a7a2a'); if (r < 0.06) P(px + 1, py - 1, '#f2a6c8'); } continue; }
    switch (key) {
      case 'pradera':
        if (r < 0.35) { P(px, py, '#3f7a2a'); P(px, py - 1, '#4f9a35'); P(px + 1, py, '#3f7a2a'); if (K > 1) P(px, py - 2, '#5fae45'); }
        else if (r < 0.55) { const fc = rng.pick(['#f5d76e', '#e86a8a', '#ffffff', '#b98aff']); P(px, py, fc); P(px + 1, py, '#3f7a2a'); if (K > 1) { P(px - 1, py, fc); P(px, py - 1, fc); P(px, py + 1, '#3f7a2a'); } }
        break;
      case 'bosque':
        if (r < 0.4) { P(px, py, '#24501f'); P(px + 1, py - 1, '#2d5a28'); P(px - 1, py - 1, '#24501f'); }
        else if (r < 0.46) { P(px, py, '#c0392b'); P(px, py + 1, '#efe3c6'); if (K > 1) { P(px + 1, py, '#c0392b'); P(px, py - 1, '#ffffff'); } }
        else if (r < 0.6) P(px, py, '#6b5a2a');
        break;
      case 'desierto':
        if (r < 0.25) P(px, py, '#a88a4a');
        else if (r < 0.3) { P(px, py, '#efe6d0'); P(px + 1, py, '#efe6d0'); P(px + 2, py - 1, '#efe6d0'); P(px - 1, py - 1, '#efe6d0'); }
        else if (r < 0.45) { P(px, py, '#c49c55'); P(px + 1, py, '#c49c55'); P(px + 2, py, '#c49c55'); }
        break;
      case 'nieve':
        if (r < 0.3) P(px, py, '#ffffff'); else if (r < 0.45) P(px, py, '#b9cbe0');
        break;
      case 'volcan':
        if (r < 0.2) { P(px, py, '#c0442b'); P(px + 1, py + 1, '#8a2a1a'); if (r < 0.06) P(px + 2, py + 1, '#ff7a1a'); }
        else if (r < 0.45) P(px, py, '#55474a');
        break;
      case 'ruinas':
        if (r < 0.3) P(px, py, '#6b8a4a'); else if (r < 0.4) { P(px, py, '#6b6a66'); P(px + 1, py, '#6b6a66'); }
        break;
      case 'pantano':
        if (r < 0.3) { P(px, py, '#6b7a3a'); P(px, py - 1, '#6b7a3a'); P(px, py - 2, '#8a6a3a'); }
        else if (r < 0.4) P(px, py, '#2f3a22');
        break;
    }
  }
  x.putImageData(img, 0, 0);
  c.buf = new Uint32Array(U);
  return c;
}

/* ---------- obstáculos ---------- */
const OBS_CACHE = new Map();
function obsSprite(o, biome) {
  const key = o.type + o.v + biome;
  let e = OBS_CACHE.get(key);
  if (e) return e;
  let W = 22, H = 28;
  const big = { bigtree: [30, 36], pine: [20, 30], cactus: [12, 20], rock: [16, 12], sandrock: [16, 12], snowrock: [16, 12], crystal: [12, 16], obsidian: [14, 16], magma: [14, 16], deadtree: [18, 24], pillar: [10, 24], block: [14, 12], statue: [12, 24], mushroom: [16, 16] }[o.type];
  if (big) { W = big[0]; H = big[1]; }
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const C = (cx, cy, r, col) => { x.fillStyle = col; fillCirclePx(x, cx, cy, r); };
  const v = o.v;
  switch (o.type) {
    case 'tree': case 'bigtree': {
      const k = o.type === 'bigtree' ? 1.35 : 1;
      let pal = ['#2a5e26', '#3c8333', '#56a646', '#7cc45e'];
      if (biome === 'bosque') pal = ['#1f4a1c', '#2e6a28', '#45893a', '#62a650'];
      if (biome === 'pantano') pal = ['#34401f', '#4a5a2a', '#62763a', '#7d924c'];
      if (v === 2 && biome === 'pradera') pal = ['#6a4a1a', '#a86a1f', '#d99a2a', '#f2c14e'];
      const cx = W / 2 | 0, tb = H - 2;
      R(cx - 2, tb - 10 * k, 4 + (k > 1 ? 1 : 0), 10 * k, '#6b4423'); R(cx - 2, tb - 10 * k, 1, 10 * k, '#4e3018'); R(cx - 3, tb, 6, 1, '#4e3018');
      const r = Math.round(9 * k), cy = Math.round(r + 1);
      C(cx, cy + 1, r, pal[0]); C(cx - 1, cy, r - 1, pal[1]); C(cx - 3, cy - 3, Math.round(r * 0.45), pal[2]);
      const rr = RNG(o.v * 31 + 7);
      for (let i = 0; i < 12; i++) { const a = rr() * TAU, d = rr() * (r - 2); R(Math.round(cx - 1 + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 1, 1, rr() < 0.5 ? pal[3] : pal[0]); }
      break;
    }
    case 'pine': {
      R(9, 23, 2, 6, '#5a3a1e');
      for (let y = 1; y < 24; y++) {
        const tier = Math.floor((y - 1) / 5.5), rloc = (y - 1) - tier * 5.5;
        const hw = Math.round(1 + tier * 1.7 + rloc * 0.9);
        R(10 - hw, y, hw, 1, '#2f6a50'); R(10, y, hw, 1, '#245442');
        if (rloc < 1.6) { R(10 - hw + 1, y, Math.max(1, hw * 2 - 2), 1, '#f4f8fb'); }
      }
      R(9, 0, 2, 1, '#f4f8fb');
      break;
    }
    case 'cactus':
      R(5, 2, 3, 17, '#4f9a45'); R(7, 2, 1, 17, '#3a7a34'); R(6, 3, 1, 14, '#6fbf5e');
      R(2, 7, 2, 5, '#4f9a45'); R(2, 11, 4, 2, '#4f9a45'); R(2, 7, 1, 5, '#6fbf5e');
      R(9, 5, 2, 6, '#4f9a45'); R(8, 10, 2, 2, '#4f9a45'); R(10, 5, 1, 6, '#3a7a34');
      if (v === 1) R(5, 0, 3, 2, '#e86a8a');
      for (let i = 0; i < 6; i++) R(4 + (i % 2) * 4, 4 + i * 2, 1, 1, '#d8e8a0');
      break;
    case 'rock': case 'sandrock': case 'snowrock': {
      const P = o.type === 'sandrock' ? ['#c49a5f', '#a87f48', '#7e5e34', '#dcb97f'] : o.type === 'snowrock' ? ['#8d98a6', '#6f7a88', '#525c68', '#ffffff'] : ['#8a8a86', '#6f6f6c', '#55555a', '#a8a8a2'];
      const rows = v === 1 ? [4, 8, 11, 13, 14, 14, 13, 11, 8] : v === 2 ? [5, 9, 9, 12, 14, 14, 12, 9, 6] : [6, 10, 12, 14, 14, 14, 12, 10, 8];
      const off = v === 2 ? [2, 1, 2, 1, 0, 0, 1, 2, 3] : [0, 0, 0, 0, 0, 0, 0, 0, 0];
      rows.forEach((w, i) => {
        const y = H - rows.length + i - 1, x0 = ((W - w) / 2 | 0) + (off[i] > 1 ? 1 : 0);
        R(x0, y, w, 1, i < 2 ? P[3] : i > 6 ? P[2] : (i > 4 ? P[1] : P[0]));
        R(x0, y, 1, 1, P[2]); R(x0 + w - 1, y, 1, 1, i < 3 ? P[0] : P[2]);
        if (i >= 2 && i <= 5) R(x0 + w - 3, y, 2, 1, P[1]);
      });
      R(((W - 10) / 2 | 0) + 2, H - rows.length + 1, 3, 1, '#ffffff');
      R((W / 2 | 0) - 1, H - 6, 1, 2, P[2]); R(W / 2 | 0, H - 4, 1, 1, P[2]);
      if (o.type === 'snowrock') { R(4, H - 10, 8, 1, '#ffffff'); R(3, H - 9, 10, 1, '#eef4f8'); }
      break;
    }
    case 'crystal': case 'obsidian': case 'magma': {
      const P = o.type === 'crystal' ? ['#5fb7e0', '#9fe3ff', '#e8ffff'] : o.type === 'magma' ? ['#2a1f24', '#4a3a3e', '#ff7a1a'] : ['#211a28', '#3e3150', '#6a5a88'];
      const shard = (x0, h, w) => { for (let i = 0; i < h; i++) { const ww = Math.max(1, Math.round(w * (i / h))); R(x0 - (ww >> 1), H - 1 - h + i, ww, 1, i < 2 ? P[2] : P[1]); R(x0 - (ww >> 1), H - 1 - h + i, 1, 1, P[0]); } };
      shard(W / 2 | 0, H - 2, 5); shard((W / 2 | 0) - 4, H - 7, 4); shard((W / 2 | 0) + 4, H - 5, 4);
      if (o.type === 'magma') { R(W / 2 | 0, H - 9, 1, 3, '#ffb03a'); R((W / 2 | 0) + 4, H - 5, 1, 2, '#ff7a1a'); R((W / 2 | 0) - 4, H - 4, 1, 2, '#ff7a1a'); }
      break;
    }
    case 'deadtree': {
      const col = biome === 'volcan' ? '#2a2024' : '#4a3a2e';
      R(8, 6, 2, 18, col); R(7, 22, 4, 2, col);
      const br = [[8, 12, -1, -1, 6], [9, 9, 1, -1, 5], [8, 16, -1, -1, 4], [9, 14, 1, -1, 6]];
      for (const b of br) for (let i = 0; i < b[4]; i++) R(b[0] + b[2] * i, b[1] + b[3] * Math.floor(i * 0.7), 1, 1, col);
      R(8, 4, 1, 3, col);
      break;
    }
    case 'pillar':
      R(2, 4, 6, 18, '#b5b2aa'); R(6, 4, 2, 18, '#8f8c85'); R(4, 5, 1, 16, '#9e9b94');
      R(1, 2, 8, 2, '#c4c1b9'); R(1, 2, 3, 1, '#d2cfc7'); R(6, 0, 2, 2, '#c4c1b9');
      R(1, 22, 8, 2, '#8f8c85');
      if (v === 1) { R(3, 9, 1, 1, '#4a7a3a'); R(2, 10, 1, 4, '#4a7a3a'); R(3, 13, 1, 3, '#5a8a4a'); }
      if (v === 2) { R(5, 12, 1, 3, '#6b6a66'); R(4, 14, 1, 2, '#6b6a66'); }
      break;
    case 'block':
      R(1, 2, 12, 9, '#9e9b94'); R(1, 2, 12, 2, '#b8b5ad'); R(1, 9, 12, 2, '#7e7c77'); R(7, 2, 1, 9, '#7e7c77'); R(1, 6, 12, 1, '#85827c');
      if (v) { R(3, 4, 1, 2, '#6b6a66'); R(10, 7, 2, 1, '#4a7a3a'); }
      break;
    case 'statue':
      R(1, 16, 10, 7, '#9a978f'); R(1, 16, 10, 1, '#b5b2aa'); R(8, 17, 3, 6, '#7e7c77');
      R(3, 5, 6, 11, '#b8b5ad'); R(7, 5, 2, 11, '#94918a'); R(4, 1, 4, 5, '#c4c1b9'); R(6, 1, 2, 5, '#a3a09a');
      R(5, 3, 1, 1, '#3a3a3a'); R(7, 3, 1, 1, '#3a3a3a'); R(2, 8, 2, 5, '#b8b5ad');
      if (v === 2) R(4, 1, 4, 2, '#7e7c77');
      break;
    case 'mushroom': {
      const cap = biome === 'pantano' ? ['#6a3ab6', '#8a4ad6', '#c9a6ff'] : ['#9a2a20', '#c0392b', '#ffffff'];
      R(6, 8, 4, 7, '#efe3c6'); R(8, 8, 2, 7, '#d4c6a4');
      C(8, 7, 7, cap[0]); C(7, 6, 6, cap[1]); R(1, 8, 14, 8, 'rgba(0,0,0,0)');
      x.clearRect(0, 9, W, 7); R(6, 9, 4, 6, '#efe3c6'); R(8, 9, 2, 6, '#d4c6a4'); R(5, 15, 6, 1, '#b9ab8a');
      R(4, 4, 2, 2, cap[2]); R(9, 3, 2, 1, cap[2]); R(11, 6, 1, 1, cap[2]); R(6, 7, 1, 1, cap[2]);
      break;
    }
  }
  e = { c, ax: W / 2 | 0, ay: H - 2 };
  OBS_CACHE.set(key, e);
  return e;
}

const ITEM_SPR = {};
function itemSprite(kind) {
  if (ITEM_SPR[kind]) return ITEM_SPR[kind];
  let c, x;
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  if (kind === 'chest' || kind === 'chestOpen') {
    c = makeCanvas(12, 12); x = c.getContext('2d');
    R(1, 6, 10, 6, '#8a5a2b'); R(1, 6, 10, 1, '#5a3418'); R(1, 11, 10, 1, '#5a3418'); R(3, 6, 1, 6, '#f2c14e'); R(8, 6, 1, 6, '#f2c14e');
    if (kind === 'chest') { R(1, 3, 10, 3, '#a86f3a'); R(1, 3, 10, 1, '#c98a4a'); R(3, 3, 1, 3, '#f2c14e'); R(8, 3, 1, 3, '#f2c14e'); R(5, 5, 2, 2, '#f2c14e'); }
    else { R(2, 6, 8, 2, '#2a1a10'); R(1, 1, 10, 2, '#a86f3a'); R(1, 1, 10, 1, '#c98a4a'); }
  } else if (kind === 'crate') {
    c = makeCanvas(16, 15); x = c.getContext('2d');
    R(1, 2, 14, 13, '#b0803a'); R(1, 2, 14, 1, '#d4a25a'); R(1, 2, 1, 13, '#7a5426'); R(14, 2, 1, 13, '#7a5426'); R(1, 14, 14, 1, '#7a5426');
    for (let i = 0; i < 12; i++) { R(2 + i, 3 + i, 1, 1, '#8a5f2a'); R(13 - i, 3 + i, 1, 1, '#8a5f2a'); }
    R(1, 7, 14, 2, '#d2283c'); R(6, 6, 4, 4, '#ffd65a');
  } else if (kind === 'chute') {
    c = makeCanvas(22, 14); x = c.getContext('2d');
    for (let i = 0; i < 6; i++) R(i < 3 ? 3 - i : 0, i, i < 3 ? 16 + i * 2 : 22, 1, i % 2 ? '#d2283c' : '#efe6d6');
    R(0, 5, 22, 1, '#9a1a2a'); R(5, 0, 2, 6, '#efe6d6'); R(15, 0, 2, 6, '#d2283c');
    for (let i = 0; i < 8; i++) { R(2 + i, 6 + i, 1, 1, '#c9c0b0'); R(19 - i, 6 + i, 1, 1, '#c9c0b0'); }
  } else if (kind === 'potion') {
    c = makeCanvas(6, 8); x = c.getContext('2d');
    R(2, 0, 2, 2, '#8a5a2b'); R(1, 2, 4, 5, '#e8402f'); R(1, 2, 1, 2, '#ffb0a0'); R(1, 7, 4, 1, '#9a1a1a');
  }
  ITEM_SPR[kind] = c;
  return c;
}

/* ---------- renderer ---------- */
function createRenderer(canvas, M, opts) {
  opts = opts || {};
  const ctx = canvas.getContext('2d');
  const K = opts.hd === false ? 1 : 2;
  const R = {
    M, ctx, canvas, K, vw: canvas.width / K, vh: canvas.height / K, cam: { x: 0, y: 0 }, follow: null, time: 0,
    parts: [], nums: [], beams: [], rings: [], corpses: [], pools: [], flashes: [], slashes: [],
    shake: 0, hitstop: 0, slowmo: 0, gore: opts.gore === undefined ? 1 : opts.gore, preview: !!opts.preview,
    ground: buildGround(M.world, K), lavaPts: [], waterPts: [], onSound: opts.onSound || null,
    bias: { x: 0, y: 0 }, offY: 0, subjects: null, cine: false
  };
  const G = R.ground.getContext('2d');
  G.setTransform(K, 0, 0, K, 0, 0);
  const rK = (v) => Math.round(v * K) / K, PX = 1 / K;
  /* manchas en el suelo: se pintan en el lienzo y en la copia en memoria que usa la vista dron */
  const GB = R.ground.buf, GW = R.ground.width, GH = R.ground.height, colC = new Map();
  const parseCol = (c) => {
    let v = colC.get(c); if (v) return v;
    if (c[0] === '#') { const q = hexToRgb(c); v = [q[0], q[1], q[2], 1]; }
    else { const m = c.slice(c.indexOf('(') + 1, c.indexOf(')')).split(',').map(Number); v = [m[0], m[1], m[2], m.length > 3 ? m[3] : 1]; }
    v.push(((255 << 24) | (v[2] << 16) | (v[1] << 8) | v[0]) >>> 0); colC.set(c, v); return v;
  };
  const bufRect = (px, py, pw, ph, col) => {
    const x0 = Math.max(0, px), y0 = Math.max(0, py), x1 = Math.min(GW, px + pw), y1 = Math.min(GH, py + ph);
    if (x1 <= x0 || y1 <= y0) return;
    const C = parseCol(col), a = C[3];
    for (let y = y0; y < y1; y++) {
      const row = y * GW;
      if (a >= 1) { GB.fill(C[4], row + x0, row + x1); continue; }
      for (let x = x0; x < x1; x++) {
        const o = GB[row + x], ia = 1 - a;
        GB[row + x] = ((255 << 24) | (((((o >>> 16) & 255) * ia + C[2] * a) | 0) << 16) | (((((o >>> 8) & 255) * ia + C[1] * a) | 0) << 8) | (((o & 255) * ia + C[0] * a) | 0)) >>> 0;
      }
    }
  };
  const decalRect = (x, y, w, h, col) => { G.fillStyle = col; G.fillRect(x, y, w, h); bufRect(Math.round(x * K), Math.round(y * K), Math.max(1, Math.round(w * K)), Math.max(1, Math.round(h * K)), col); };
  const decalCircle = (x, y, r, col) => {
    G.fillStyle = col; fillCircleK(G, x, y, r, K);
    const R0 = Math.round(r * K), X = Math.round(x * K), Y = Math.round(y * K);
    for (let dy = -R0; dy <= R0; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, R0 * R0 - dy * dy)) + 0.35); bufRect(X - w, Y + dy, w * 2 + 1, 1, col); }
  };
  const world = M.world, bw = world.bw || BW;
  for (let j = 0; j < (world.H / BS); j++) for (let i = 0; i < bw; i++) {
    const h = world.hazard[j * bw + i];
    if (h === 1) R.lavaPts.push(i * BS, j * BS); else if (h === 2 && (i + j) % 3 === 0) R.waterPts.push(i * BS, j * BS);
  }
  if (M.champ) { R.follow = M.champ; R.cam.x = M.champ.x; R.cam.y = M.champ.y; }
  else { R.cam.x = world.W / 2; R.cam.y = world.H / 2; }

  const inView = (x, y, m) => Math.abs(x - R.cam.x) < R.vw / 2 + (m || 20) && Math.abs(y - R.cam.y) < R.vh / 2 + (m || 30);
  const near = (x, y) => {
    const d = Math.max(Math.abs(x - R.cam.x) / (R.vw * 0.5), Math.abs(y - R.cam.y) / (R.vh * 0.5));
    return d < 1 ? 1 : d < 1.6 ? 1.6 - d : 0;
  };
  const snd = (name, x, y, v) => { const k = near(x, y); if (k > 0 && R.onSound) R.onSound(name, (v || 1) * k); };
  const part = (p) => { if (R.parts.length > 2600) R.parts.splice(0, 200); p.max = p.life; R.parts.push(p); };
  const blood = (x, y, z, dir, n, spd) => {
    if (R.gore === 0) {
      for (let i = 0; i < Math.min(6, n); i++) { const a = dir + (Math.random() - 0.5) * 2; part({ x, y, z, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, vz: 40, life: 0.25, c: i % 2 ? '#fff3b0' : '#ffffff', t: 4, s: 1 }); }
      return;
    }
    const mult = R.gore === 2 ? (K > 1 ? 2.6 : 2) : (K > 1 ? 1.1 : 0.85);
    for (let i = 0; i < n * mult; i++) {
      const a = dir + (Math.random() - 0.5) * 1.5, sp = (spd || 40) * (0.25 + Math.random() * 0.9);
      part({ x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, vz: 15 + Math.random() * 45, life: 1.6, c: BLOOD[(Math.random() * BLOOD.length) | 0], t: 1, s: Math.random() < 0.25 ? 2 : 1 });
    }
  };
  /* números de daño: a un lado del cuerpo (alternando) para no tapar nombre ni barra */
  const num = (x, y, txt, c, big, tgt) => {
    if (!tgt) { R.nums.push({ x: x + (Math.random() - 0.5) * 6, y, z: 14, vz: 26, t: big ? 1.0 : 0.75, age: 0, txt, c, big }); return; }
    tgt.numSide = tgt.numSide > 0 ? -1 : 1;
    R.nums.push({ x: tgt.x + tgt.numSide * (13 + Math.random() * 2), y: tgt.y - 16, h: 16, z: 10, vz: 24, t: big ? 1.0 : 0.8, age: 0, txt, c, big });
  };
  /* golpes seguidos al mismo luchador se suman en un solo número en vez de apilarse */
  const hitNum = (t, dmg, crit, armor) => {
    for (const n of R.nums) if (n.tgt === t && n.age < 0.45) {
      n.val += dmg; n.crit = n.crit || crit;
      n.txt = String(Math.round(n.val)) + (n.crit ? '!' : '');
      n.c = n.crit ? '#ffd65a' : armor ? '#9fd8ff' : '#ffffff';
      n.big = n.crit || n.val >= 30; n.t = Math.max(n.t, 0.8); n.age = 0;
      return;
    }
    num(0, 0, String(Math.round(dmg)) + (crit ? '!' : ''), crit ? '#ffd65a' : armor ? '#9fd8ff' : '#ffffff', crit, t);
    const n = R.nums[R.nums.length - 1]; n.tgt = t; n.val = dmg; n.crit = crit;
  };
  /* solo se muestran números y barras del luchador seguido y de quien pelea con él */
  const mine = (t, src) => R.preview || (R.follow && (t === R.follow || src === R.follow));
  R.showBar = (o) => {
    const f = R.follow;
    if (!f) return false;
    if (o === f) return true;
    if (o.isChamp) return true;
    if (!f.alive) return false;
    return (f.state === 'fight' && f.tgt === o) || (o === f.lastHitBy && M.t - f.lastHitT < 3) || (o.lastHitBy === f && M.t - o.lastHitT < 3);
  };
  const shakeAt = (x, y, a) => { if (!R.preview && near(x, y) > 0.5 && !REDUCED) R.shake = Math.max(R.shake, a); };
  const involved = (f) => f && (f === R.follow);

  R.fx = {
    land(f) { for (let i = 0; i < 10; i++) { const a = Math.random() * TAU; part({ x: f.x, y: f.y, z: 1, vx: Math.cos(a) * 40, vy: Math.sin(a) * 20, vz: 10, life: 0.4, c: '#d9cfb8', t: 3, s: 1 }); } snd('land', f.x, f.y, 0.6); },
    swing(f) { snd(f.w.sfx === 'clack' ? 'clack' : 'swing', f.x, f.y, 0.5); },
    whiff() {},
    hit(t, src, dmg, o, crit, armor) {
      const dir = o.dir !== undefined ? o.dir : Math.random() * TAU;
      if (t.d.dummy) {
        if (!o.tick) { num(t.x, t.y - 22, String(Math.round(dmg)), crit ? '#ffd65a' : '#ffffff', crit); for (let i = 0; i < 6; i++) { const a = dir + (Math.random() - 0.5) * 1.6; part({ x: t.x, y: t.y, z: 10, vx: Math.cos(a) * 50, vy: Math.sin(a) * 40, vz: 30, life: 0.5, c: i % 2 ? '#d9c48a' : '#b9a46a', t: 3, s: 1 }); } }
        else if (Math.random() < 0.08) part({ x: t.x + (Math.random() - 0.5) * 8, y: t.y, z: 10, vx: 0, vy: 0, vz: 15, life: 0.5, c: '#ffb03a', t: 2, s: 1 });
        return;
      }
      const showNum = mine(t, src);
      if (o.tick) {
        t.tickAcc = (t.tickAcc || 0) + dmg;
        if (o.kind === 'bleed' && Math.random() < 0.03 && R.gore) part({ x: t.x + (Math.random() - 0.5) * 6, y: t.y, z: 8, vx: 0, vy: 0, vz: 0, life: 1, c: BLOOD[1], t: 1, s: 1 });
        if (o.kind === 'poison' && Math.random() < 0.08) part({ x: t.x + (Math.random() - 0.5) * 6, y: t.y, z: 10, vx: 0, vy: 0, vz: 12, life: 0.6, c: '#7dff6a', t: 2, s: 1 });
        if (o.kind === 'cont') {
          if (t.w && Math.random() < 0.35) blood(t.x, t.y, 9, dir, 1, 45);
          if (t.contN === undefined || R.time - t.contN > 0.35) { t.contN = R.time; if (showNum) num(t.x, t.y - 22, String(Math.max(1, Math.round(t.tickAcc))), '#ffb03a', false, t); t.tickAcc = 0; snd('hit', t.x, t.y, 0.4); }
        } else if (t.tickAcc >= 4) { if (showNum) num(t.x, t.y - 22, String(Math.round(t.tickAcc)), o.kind === 'zone' ? '#c77dff' : o.kind === 'poison' ? '#7dff6a' : o.kind === 'bleed' ? '#ff5a5a' : '#ffb03a', false, t); t.tickAcc = 0; }
        return;
      }
      const n = Math.min(16, 3 + Math.round(dmg * 0.5));
      if (armor) for (let i = 0; i < 6; i++) { const a = dir + Math.PI + (Math.random() - 0.5) * 2; part({ x: t.x, y: t.y, z: 10, vx: Math.cos(a) * 70, vy: Math.sin(a) * 50, vz: 20, life: 0.25, c: i % 2 ? '#9fd8ff' : '#ffffff', t: 4, s: 1 }); }
      blood(t.x, t.y, 9, dir, n, 28 + dmg * 1.6);
      if (showNum) hitNum(t, dmg, crit, armor);
      const w = o.w;
      let s = dmg > 18 || crit ? 'heavy' : 'hit';
      if (w && w.sfx === 'clang') s = 'clang'; else if (w && w.sfx === 'boing') s = 'boing';
      snd(s, t.x, t.y, 0.8);
      if (dmg > 14 || crit) shakeAt(t.x, t.y, crit ? 3 : 2);
      if ((involved(t) || involved(src)) && !R.preview) R.hitstop = Math.max(R.hitstop, crit ? 6 : dmg > 16 ? 4 : 2);
      if (o.kind === 'melee' && w && (w.multi || dmg > 18)) R.rings.push({ x: t.x, y: t.y - 8, r: 2, max: 7, c: '#ffffff', t: 0.12 });
    },
    death(t, k, o, overkill) {
      snd('death', t.x, t.y, 1);
      shakeAt(t.x, t.y, 4);
      const dir = o.dir !== undefined ? o.dir : Math.random() * TAU;
      const gib = R.gore === 2 && (overkill > 16 || o.kind === 'boom');
      const cv = K > 1 ? charHD(t.d, { dead: true, noWeapon: true }) : renderCharCanvas(t.d, { dead: true, noWeapon: true });
      if (R.gore === 0) {
        for (let i = 0; i < 14; i++) { const a = Math.random() * TAU; part({ x: t.x, y: t.y, z: 8, vx: Math.cos(a) * 30, vy: Math.sin(a) * 20, vz: 25, life: 0.8, c: i % 2 ? '#efe6d6' : '#c9c0d6', t: 3, s: 2 }); }
        R.corpses.push({ f: t, x: t.x, y: t.y, vx: Math.cos(dir) * 40, vy: Math.sin(dir) * 40, rot: 0, tr: Math.cos(dir) >= 0 ? Math.PI / 2 : -Math.PI / 2, t: 0, cv, fade: true });
      } else {
        blood(t.x, t.y, 10, dir, gib ? 26 : 14, 70);
        if (gib) {
          const cols = [t.d.sk, t.d.c1, t.d.c2, BLOOD[0], BLOOD[2], '#efe6d0'];
          for (let i = 0; i < 16; i++) { const a = Math.random() * TAU, sp = 40 + Math.random() * 110; part({ x: t.x, y: t.y, z: 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, vz: 40 + Math.random() * 80, life: 2, c: cols[i % cols.length], t: 5, s: 2 }); }
        } else {
          R.corpses.push({ f: t, x: t.x, y: t.y, vx: Math.cos(dir) * 55, vy: Math.sin(dir) * 45, rot: 0, tr: Math.cos(dir) >= 0 ? Math.PI / 2 : -Math.PI / 2, t: 0, cv });
        }
        const lobes = [];
        for (let i = 0; i < 3; i++) lobes.push({ a: Math.random() * TAU, d: 0.5 + Math.random() * 0.4, k: 0.35 + Math.random() * 0.25 });
        R.pools.push({ x: Math.round(t.x + Math.cos(dir) * 6), y: Math.round(t.y + Math.sin(dir) * 4), r: 0, max: R.gore === 2 ? (gib ? 10 : 7) + Math.random() * 2 : 3.5 + Math.random() * 1.5, t: 0, drawn: -1, lobes });
      }
      if (R.follow === t && !R.preview) R.slowmo = 1.2;
    },
    shoot(f, w, a) {
      const mx = f.x + Math.cos(a) * 12, my = f.y + Math.sin(a) * 12 - 9;
      if (w.k === 'proj' && (w.p === 'bullet' || w.p === 'pellet' || w.p === 'plasma' || w.p === 'laser')) R.flashes.push({ x: mx, y: my, t: 0.06, c: w.p === 'laser' ? '#c7f464' : w.p === 'plasma' ? '#57c7ff' : '#fff3b0' });
      const s = { bullet: 'shoot', pellet: 'shoot', laser: 'laser', plasma: 'laser', arrow: 'bow', bolt: 'bow', chancla: 'zas', fan: 'zas', star: 'swing', ball: 'zas', fireball: 'fire', ice: 'laser', curse: 'laser', thorn: 'bow', harpoon: 'bow', bomb: 'swing' }[w.p] || (w.k === 'beam' ? (w.chain ? 'zap' : 'shoot') : 'shoot');
      snd(s, f.x, f.y, 0.55);
      if (w.id === 'rifle') { R.flashes.push({ x: mx, y: my, t: 0.08, c: '#ffffff' }); shakeAt(f.x, f.y, 1.5); }
    },
    projDie(p, wall) {
      const c = p.type === 'ice' ? '#bfeaff' : p.type === 'curse' ? '#c06aff' : p.type === 'thorn' ? '#6fd36a' : '#fff3b0';
      for (let i = 0; i < 5; i++) { const a = Math.random() * TAU; part({ x: p.x, y: p.y, z: 8, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, vz: 10, life: 0.25, c, t: 4, s: 1 }); }
      if (wall && (p.type === 'arrow' || p.type === 'bolt' || p.type === 'harpoon')) part({ x: p.x, y: p.y, z: 8, vx: 0, vy: 0, vz: 0, life: 3, c: '#8a5a2b', t: 6, s: 1, ang: p.ang });
    },
    beam(pts, w, hit) { R.beams.push({ pts, c: w.tracer || '#ffffff', t: w.chain ? 0.18 : 0.22, max: w.chain ? 0.18 : 0.22, zig: !!w.chain }); },
    explode(x, y, r, kind) {
      const big = kind === 'bomb' || kind === 'meteor';
      snd(kind === 'bolt' ? 'zap' : 'boom', x, y, big ? 1.1 : 0.6);
      shakeAt(x, y, big ? 7 : kind === 'bolt' ? 4 : 2);
      R.flashes.push({ x, y: y - 4, t: 0.09, c: kind === 'bolt' ? '#e8ffff' : '#fff3b0', r: Math.round(r * 0.8) });
      R.rings.push({ x, y, r: 3, max: r + 4, c: kind === 'bolt' ? '#8ff7ff' : '#ffd65a', t: 0.3 });
      const n = big ? 46 : kind === 'bolt' ? 14 : 18;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = Math.random() * r * 4;
        part({ x, y, z: 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: 20 + Math.random() * 50, life: 0.35 + Math.random() * 0.5, c: kind === 'bolt' ? '#8ff7ff' : FIRE[(Math.random() * 4) | 0], t: kind === 'bolt' ? 4 : 2, s: Math.random() < 0.4 ? 2 : 1 });
      }
      if (big) for (let i = 0; i < 16; i++) { const a = Math.random() * TAU; part({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 6, z: 6, vx: Math.cos(a) * 14, vy: Math.sin(a) * 10, vz: 18, life: 1.3 + Math.random(), c: '#4a4048', t: 7, s: 2 }); }
      if (big) for (let i = 0; i < 10; i++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 80; part({ x, y, z: 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 60 + Math.random() * 60, life: 1.2, c: '#3a2f2a', t: 5, s: 1 }); }
      if (kind === 'bolt') R.beams.push({ pts: [[x + (Math.random() - 0.5) * 20, y - 160], [x, y]], c: '#e8ffff', t: 0.2, max: 0.2, zig: true, sky: true });
      if (kind === 'meteor') R.beams.push({ pts: [[x - 60, y - 150], [x, y - 4]], c: '#ffb03a', t: 0.12, max: 0.12, zig: false, thick: 2, sky: true });
      /* quemadura en el suelo */
      if (big) { const sr = Math.max(3, Math.round(r * 0.35)); decalCircle(x, y, sr + 1, 'rgba(20,12,10,0.18)'); decalCircle(x, y, sr * 0.6, 'rgba(20,12,10,0.3)'); }
      for (let i = 0; i < r * (big ? 2 : 1) * K; i++) { const a = Math.random() * TAU, d = Math.random() * r; decalRect(rK(x + Math.cos(a) * d), rK(y + Math.sin(a) * d * 0.8), PX, PX, 'rgba(20,12,10,0.4)'); }
    },
    cont(f, w) {
      const a = f.aim, hx = f.x + Math.cos(a) * 9, hy = f.y + Math.sin(a) * 9;
      if (w.burn) {
        for (let i = 0; i < 3; i++) { const aa = a + (Math.random() - 0.5) * w.cone * 1.4, sp = 90 + Math.random() * 60; part({ x: hx, y: hy, z: 9, vx: Math.cos(aa) * sp + f.vx, vy: Math.sin(aa) * sp + f.vy, vz: 4, life: 0.25 + Math.random() * 0.15, c: FIRE[0], t: 2, s: Math.random() < 0.5 ? 2 : 1 }); }
        if (Math.random() < 0.15) snd('fire', f.x, f.y, 0.5);
      } else {
        if (Math.random() < 0.5) part({ x: hx + Math.cos(a) * 6, y: hy + Math.sin(a) * 6, z: 9, vx: (Math.random() - 0.5) * 80, vy: (Math.random() - 0.5) * 80, vz: 30, life: 0.2, c: '#fff3b0', t: 4, s: 1 });
        if (Math.random() < 0.12) snd('saw', f.x, f.y, 0.5);
      }
    },
    wave(A, f) {
      snd('wave', f.x, f.y, 0.9);
      for (let i = 0; i < 3; i++) part({ x: f.x + Math.cos(A.ang) * 8, y: f.y + Math.sin(A.ang) * 8, z: 14, vx: Math.cos(A.ang + (i - 1) * 0.5) * 30, vy: Math.sin(A.ang + (i - 1) * 0.5) * 30, vz: 12, life: 0.9, c: '#f2c14e', t: 8, s: 1 });
    },
    bounce(p) { snd('zas', p.x, p.y, 0.4); },
    pickup(f, item, g) {
      g.openT = R.time;
      snd('pickup', f.x, f.y, 0.8);
      for (let i = 0; i < 12; i++) { const a = Math.random() * TAU; part({ x: g.x, y: g.y, z: 4, vx: Math.cos(a) * 30, vy: Math.sin(a) * 20, vz: 30 + Math.random() * 30, life: 0.6, c: item.c, t: 4, s: 1 }); }
      R.nums.push({ x: f.x, y: f.y - 30, z: 0, vz: 12, t: 1.4, txt: item.n, c: item.c, small: true });
    },
    favorHeal(f, h) {
      snd('pickup', f.x, f.y, 1);
      R.nums.push({ x: f.x, y: f.y - 24, z: 14, vz: 22, t: 1.3, txt: '+' + Math.round(h), c: '#7dff6a', big: true });
      R.rings.push({ x: f.x, y: f.y - 8, r: 3, max: 16, c: '#7dff6a', t: 0.35 });
      for (let i = 0; i < 22; i++) { const a = Math.random() * TAU; part({ x: f.x + Math.cos(a) * 6, y: f.y + Math.sin(a) * 3, z: 2 + Math.random() * 6, vx: 0, vy: 0, vz: 18 + Math.random() * 20, life: 0.9, c: i % 3 ? '#7dff6a' : '#e8ffe0', t: 8, s: 1 }); }
    },
    spin(f, r, q) {
      snd(q ? 'heavy' : 'hit', f.x, f.y, 1);
      shakeAt(f.x, f.y, 2 + q * 2);
      if (!R.preview) R.hitstop = Math.max(R.hitstop, 2 + q * 2);
      const col = q === 2 ? '#ffd65a' : q === 1 ? '#ffffff' : '#a89bb8';
      R.rings.push({ x: f.x, y: f.y - 6, r: 4, max: r + 2, c: col, t: 0.32 });
      if (q) R.rings.push({ x: f.x, y: f.y - 6, r: 2, max: r * 0.7, c: q === 2 ? '#ffffff' : '#d8e4f0', t: 0.24 });
      for (let i = 0; i < 10 + q * 12; i++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 90; part({ x: f.x, y: f.y, z: 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: 20 + Math.random() * 30, life: 0.4, c: i % 2 ? col : '#ffffff', t: 4, s: q === 2 ? 2 : 1 }); }
    },
    crateLand(A) { snd('crate', A.x, A.y, 1); shakeAt(A.x, A.y, 3); for (let i = 0; i < 20; i++) { const a = Math.random() * TAU; part({ x: A.x, y: A.y, z: 1, vx: Math.cos(a) * 60, vy: Math.sin(a) * 30, vz: 12, life: 0.6, c: '#d9cfb8', t: 3, s: 2 }); } }
  };

  /* --- paso de efectos (por paso de simulación) --- */
  R.step = () => {
    const dt = DT;
    for (let i = R.parts.length - 1; i >= 0; i--) {
      const p = R.parts[i];
      p.life -= dt;
      if (p.t === 6) { if (p.life <= 0) R.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.t === 1 || p.t === 5) {
        p.vz -= 320 * dt; p.z += p.vz * dt;
        if (p.z <= 0) {
          if (!R.preview && R.gore && (R.gore === 2 || Math.random() < 0.5)) {
            const ds = K > 1 ? (p.s === 2 ? 1 : 0.5) : p.s;
            decalRect(rK(p.x), rK(p.y), ds, ds, p.c); if (p.t === 5) decalRect(rK(p.x) + ds, rK(p.y), PX, PX, p.c);
          }
          R.parts.splice(i, 1); continue;
        }
      } else if (p.t === 2 || p.t === 7 || p.t === 8) { p.z += (p.vz || 10) * dt; p.vx *= 0.94; p.vy *= 0.94; }
      else { p.vz -= 200 * dt; p.z = Math.max(0, p.z + p.vz * dt); p.vx *= 0.92; p.vy *= 0.92; }
      if (p.life <= 0) R.parts.splice(i, 1);
    }
    for (let i = R.nums.length - 1; i >= 0; i--) { const n = R.nums[i]; n.t -= dt; n.age = (n.age || 0) + dt; n.z += n.vz * dt; n.vz *= 0.93; if (n.t <= 0) R.nums.splice(i, 1); }
    for (let i = R.beams.length - 1; i >= 0; i--) { R.beams[i].t -= dt; if (R.beams[i].t <= 0) R.beams.splice(i, 1); }
    for (let i = R.rings.length - 1; i >= 0; i--) { const g = R.rings[i]; g.t -= dt; g.r += (g.max - g.r) * 0.3; if (g.t <= 0) R.rings.splice(i, 1); }
    for (let i = R.flashes.length - 1; i >= 0; i--) { R.flashes[i].t -= dt; if (R.flashes[i].t <= 0) R.flashes.splice(i, 1); }
    for (const c of R.corpses) {
      if (c.t < 0.45) { c.x += c.vx * dt; c.y += c.vy * dt; c.vx *= 0.9; c.vy *= 0.9; c.rot = lerp(0, c.tr, Math.min(1, c.t / 0.3)); }
      c.t += dt;
    }
    const life = (c) => c.fade ? 0.6 : (R.gore === 2 ? 16 : 7);
    while (R.corpses.length && R.corpses[0].t > life(R.corpses[0]) + 0.8) R.corpses.shift();
    R.corpseAlpha = (c) => clamp(1 - (c.t - life(c)) / 0.8, 0, 1);
    for (let i = R.pools.length - 1; i >= 0; i--) {
      const p = R.pools[i];
      p.t += dt; p.r = Math.min(p.max, p.t * 6);
      const ri = Math.floor(p.r * K) / K;
      if (ri > p.drawn && !R.preview) {
        p.drawn = ri;
        decalCircle(p.x, p.y, ri * 0.75, '#5e0a10');
        for (const L of p.lobes) decalCircle(p.x + Math.cos(L.a) * ri * L.d, p.y + Math.sin(L.a) * ri * L.d * 0.7, Math.max(PX, ri * L.k), '#5e0a10');
        if (ri > 2) decalCircle(p.x - ri * 0.2, p.y - ri * 0.2, ri * 0.4, '#7a0d14');
      }
      if (p.r >= p.max) R.pools.splice(i, 1);
    }
    /* estados alterados: chispas de fuego, aura de reliquia, tormenta */
    for (const f of M.fighters) {
      if (!f.alive || !inView(f.x, f.y)) continue;
      if (f.burn > 0 && Math.random() < 0.35) part({ x: f.x + (Math.random() - 0.5) * 8, y: f.y, z: 6 + Math.random() * 10, vx: 0, vy: 0, vz: 16, life: 0.45, c: FIRE[1], t: 2, s: 1 });
      if (f.relic && Math.random() < 0.25) part({ x: f.x + (Math.random() - 0.5) * 12, y: f.y, z: Math.random() * 18, vx: 0, vy: 0, vz: 10, life: 0.6, c: '#ffd65a', t: 8, s: 1 });
    }
    for (const p of M.proj) {
      if (!inView(p.x, p.y)) continue;
      if (p.type === 'fireball' && Math.random() < 0.9) part({ x: p.x, y: p.y, z: 8, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, vz: 8, life: 0.3, c: FIRE[1], t: 2, s: 1 });
      if (p.type === 'curse' && Math.random() < 0.6) part({ x: p.x, y: p.y, z: 8, vx: 0, vy: 0, vz: 4, life: 0.4, c: '#c06aff', t: 8, s: 1 });
      if (p.type === 'ice' && Math.random() < 0.4) part({ x: p.x, y: p.y, z: 8, vx: 0, vy: 0, vz: 0, life: 0.3, c: '#e8ffff', t: 4, s: 1 });
      if (p.lob && Math.random() < 0.6) part({ x: p.x, y: p.y, z: p.z + 2, vx: 0, vy: 0, vz: 6, life: 0.4, c: '#8a8088', t: 7, s: 1 });
    }
    if (!R.preview && Math.random() < 0.6 && R.lavaPts.length) {
      const k = (Math.random() * R.lavaPts.length / 2 | 0) * 2, x = R.lavaPts[k], y = R.lavaPts[k + 1];
      if (inView(x, y)) part({ x, y, z: 1, vx: 0, vy: 0, vz: 14, life: 0.9, c: FIRE[2], t: 2, s: 1 });
    }
  };

  /* --- dibujo --- */
  const tcFlash = () => '#ffffff';
  const tcCache = {};
  const tcMix = (c2, k) => tcCache[c2 + k] || (tcCache[c2 + k] = (c) => mix(c, c2, k));

  function swingAng(f) {
    const w = f.w, p = clamp(f.atkT / f.atkDur, 0, 1), s = f.f > 0 ? 1 : -1, arc = w.arc || 1.6;
    const a0 = f.aim - s * (arc / 2 + 0.45), a1 = f.aim + s * arc / 2;
    if (p < 0.35) return [lerp(f.aim - s * 0.6, a0, p / 0.35), a0, a1, p];
    if (p < 0.6) return [lerp(a0, a1, (p - 0.35) / 0.25), a0, a1, p];
    return [lerp(a1, a1 - s * 0.25, (p - 0.6) / 0.4), a0, a1, p];
  }
  function pose(f) {
    const w = f.w, d = f.d, fa = f.f > 0 ? 1 : -1;
    const fighting = f.state === 'fight' || f.atkT >= 0 || f.contT > 0 || f.recoil > 0 || (R.preview && !d.dummy);
    if (d.dummy) return { armAng: Math.PI / 2, armLen: 4 };
    if (!fighting) { const p = idlePose(d, fa); if (w.id === 'motosierra') p.wFrame = (R.time * 12 | 0) % 2; return p; }
    if (w.k === 'melee') {
      if (f.atkT >= 0) { const s = swingAng(f); return { armAng: s[0], armLen: 4, wAng: s[0], swing: s }; }
      const a = f.aim - fa * 1.0; return { armAng: f.aim - fa * 0.5, armLen: 4, wAng: a };
    }
    if (w.k === 'thrust') {
      let ext = 0; if (f.atkT >= 0) { const p = clamp(f.atkT / f.atkDur, 0, 1); ext = (p < 0.5 ? p / 0.5 : (1 - p) / 0.5) * (w.fist ? 4 : 5); }
      return { armAng: f.aim, armLen: 3 + ext, wAng: f.aim };
    }
    if (w.k === 'cont') return { armAng: f.aim, armLen: 4, wAng: f.aim + Math.sin(R.time * 60) * 0.04, wFrame: (R.time * 20 | 0) % 2 };
    const rec = f.recoil > 0 ? 2 : 0;
    let frame = 0;
    if (w.bow) frame = f.recoil > 0 ? 2 : (f.cd < 0.35 ? 1 : 0);
    return { armAng: f.aim, armLen: 4 - rec, wAng: STAFFS.has(w.id) ? f.aim - fa * 0.5 : f.aim, wFrame: frame };
  }
  function drawFighter(f, c, ax, ay, tint) {
    c = c || ctx;
    const d = f.d, x = ax !== undefined ? ax : Math.round(f.x), y = ay !== undefined ? ay : Math.round(f.y - (f.z || 0));
    const walk = f.moving && f.stun <= 0 ? f.walk : -1;
    const bob = walk >= 0 ? (walk < 0.5 ? 0 : 1) : ((R.time * 1.6 + f.id * 0.37) % 1 < 0.5 ? 0 : 1);
    let tc = null;
    if (f.flash > 0) tc = tcFlash;
    else if (f.slow > 0) tc = tcMix('#8fd3ff', 0.45);
    else if (f.bleed > 0 && f.poison) tc = tcMix('#7dff6a', 0.3);
    else if (f.burn > 0) tc = tcMix('#ff9a3a', 0.3);
    else if (tint) tc = tcMix(tint, 0.35);
    if (K > 1) return drawFighterHD(f, c, x, y, walk, bob, tc, tint);
    /* paracaídas */
    if (f.z > 18) {
      const ch = itemSprite('chute');
      c.drawImage(ch, x - 11, y - 46);
      c.fillStyle = d.c1; c.fillRect(x - 6, y - 44, 12, 2);
    }
    drawChar(c, d, { x, y, f: f.f, walk, bob, tc });
    const p = pose(f);
    if (p.swing && p.swing[3] > 0.33 && p.swing[3] < 0.8) {
      const [sx, sy] = shoulderPos(d, x, y, f.f, bob);
      const s = p.swing, rad = f.w.rng * 0.85 + 2;
      c.fillStyle = f.w.glow || (f.w.multi ? '#fff3d0' : '#ffffff');
      c.globalAlpha = s[3] < 0.6 ? 0.85 : 0.85 * (1 - (s[3] - 0.6) / 0.2);
      const a0 = s[1], a1 = s[0], steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * rad * 1.3));
      for (let i = 0; i <= steps; i++) {
        const a = lerp(a0, a1, i / steps);
        for (let rr = rad - (f.w.multi ? 3 : 2); rr <= rad; rr++) c.fillRect(Math.round(sx + Math.cos(a) * rr), Math.round(sy + Math.sin(a) * rr), 1, 1);
      }
      c.globalAlpha = 1;
    }
    drawFront(c, d, { x, y, f: f.f, bob, armAng: p.armAng, armLen: p.armLen, wAng: p.wAng, wFrame: p.wFrame, tc });
    if (f.stun > 0) { c.fillStyle = '#ffd65a'; for (let i = 0; i < 3; i++) { const a = R.time * 6 + i * TAU / 3; c.fillRect(Math.round(x + Math.cos(a) * 6), Math.round(y - 27 + Math.sin(a) * 2), 1, 1); } }
  }
  function drawFighterHD(f, c, x, y, walk, bob, tc, tint) {
    const d = f.d;
    const tk = f.flash > 0 ? 'F' : f.slow > 0 ? 'S' : (f.bleed > 0 && f.poison) ? 'P' : f.burn > 0 ? 'B' : (tint || '');
    if (f.z > 18) {
      c.drawImage(itemImg('chute', K), x - 11, y - 46, 22, 14);
      c.fillStyle = d.c1; c.fillRect(x - 6, y - 44, 12, 2);
    }
    c.drawImage(bodyHD(d, f.f, walk, bob, tc, tk), x - BODY_AX, y - BODY_AY, BODY_W, BODY_H);
    const p = pose(f);
    if (p.swing && p.swing[3] > 0.33 && p.swing[3] < 0.8) {
      const [sx, sy] = shoulderPos(d, x, y, f.f, bob);
      const s = p.swing, rad = f.w.rng * 0.85 + 2;
      c.globalAlpha = s[3] < 0.6 ? 0.9 : 0.9 * (1 - (s[3] - 0.6) / 0.2);
      const a0 = s[1], a1 = s[0], steps = Math.max(16, Math.ceil(Math.abs(a1 - a0) * rad * 2.6));
      const thick = f.w.multi ? 3 : 2;
      for (let i = 0; i <= steps; i++) {
        const a = lerp(a0, a1, i / steps), tail = i / steps;
        for (let rr = rad - thick; rr <= rad; rr += 0.5) {
          c.fillStyle = rr > rad - 0.6 ? (f.w.glow || '#ffffff') : (f.w.glow ? f.w.glow : (tail > 0.5 ? '#ffffff' : '#d8e4f0'));
          c.fillRect(rK(sx + Math.cos(a) * rr), rK(sy + Math.sin(a) * rr), PX, PX);
        }
      }
      c.globalAlpha = 1;
    }
    drawFrontHD(c, d, { x, y, f: f.f, bob, armAng: p.armAng, armLen: p.armLen, wAng: p.wAng, wFrame: p.wFrame, tc });
    if (f.stun > 0) {
      for (let i = 0; i < 3; i++) {
        const a = R.time * 6 + i * TAU / 3, X = rK(x + Math.cos(a) * 6), Y = rK(y - 27 + Math.sin(a) * 2);
        c.fillStyle = '#ffd65a'; c.fillRect(X - PX, Y, PX * 3, PX); c.fillRect(X, Y - PX, PX, PX * 3);
      }
    }
  }
  R.drawFighter = drawFighter;
  function drawProjHD(p) {
    const x = p.x, y = p.y - (p.lob ? p.z : 8);
    switch (p.type) {
      case 'arrow': case 'bolt': case 'harpoon': case 'bullet': case 'pellet': case 'laser': case 'ice': case 'thorn': case 'mini':
        ctx.drawImage(projHD(p.type, p.ang), rK(x) - 11, rK(y) - 11, 23, 23); break;
      case 'plasma': ctx.fillStyle = '#2a7fc0'; fillCircleK(ctx, x, y, 2, K); ctx.fillStyle = '#57c7ff'; fillCircleK(ctx, x, y, 1.5, K); ctx.fillStyle = '#e8ffff'; fillCircleK(ctx, x - 0.5, y - 0.5, 0.5, K); break;
      case 'fireball': ctx.fillStyle = '#b8300f'; fillCircleK(ctx, x, y, 2.5, K); ctx.fillStyle = '#ff7a1a'; fillCircleK(ctx, x, y, 2, K); ctx.fillStyle = '#ffd65a'; fillCircleK(ctx, x - 0.5, y - 0.5, 1, K); ctx.fillStyle = '#fff3b0'; ctx.fillRect(rK(x) - 0.5, rK(y) - 0.5, PX, PX); break;
      case 'curse': ctx.fillStyle = '#3a1060'; fillCircleK(ctx, x, y, 2.5, K); ctx.fillStyle = '#6a2aa6'; fillCircleK(ctx, x, y, 2, K); ctx.fillStyle = (R.time * 10 | 0) % 2 ? '#e0b0ff' : '#c06aff'; fillCircleK(ctx, x, y, 1, K); break;
      case 'bomb':
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(rK(p.x) - 2, rK(p.y), 5, 1);
        ctx.fillStyle = '#0b0810'; fillCircleK(ctx, x, y, 2.5, K); ctx.fillStyle = '#24212b'; fillCircleK(ctx, x, y, 2, K); ctx.fillStyle = '#5a5a66'; ctx.fillRect(rK(x) - 1, rK(y) - 1.5, 1, PX);
        ctx.fillStyle = (R.time * 16 | 0) % 2 ? '#ffd65a' : '#ff7a1a'; ctx.fillRect(rK(x) + 1, rK(y) - 3, 1, 1); break;
      case 'ball': {
        const hop = Math.abs(Math.sin(p.t * 9)) * 5, by = p.y - 3 - hop;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(rK(p.x) - 2, rK(p.y), 4, 1);
        ctx.fillStyle = '#180e14'; fillCircleK(ctx, p.x, by, 2.5, K); ctx.fillStyle = '#ffffff'; fillCircleK(ctx, p.x, by, 2, K);
        ctx.fillStyle = '#24212b'; ctx.fillRect(rK(p.x) - 0.5, rK(by) - 0.5, 1, 1); ctx.fillRect(rK(p.x) - 2, rK(by) - 1.5, 1, PX); ctx.fillRect(rK(p.x) + 1, rK(by) + 0.5, PX, 1);
        break;
      }
      case 'chancla': case 'fan': case 'star': drawWeaponHD(ctx, p.w, x, y, p.spin, false, 0); break;
    }
  }
  function drawProj(p) {
    if (K > 1) return drawProjHD(p);
    const x = p.x, y = p.y - (p.lob ? p.z : 8);
    const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
    const line = (len, c, off) => { ctx.fillStyle = c; for (let i = 0; i < len; i++) ctx.fillRect(Math.round(x - ca * (i + (off || 0))), Math.round(y - sa * (i + (off || 0))), 1, 1); };
    switch (p.type) {
      case 'arrow': line(6, '#c9a77a', 1); line(2, '#d9e0e6'); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - ca * 6), Math.round(y - sa * 6), 1, 1); break;
      case 'bolt': line(5, '#8a5a2b', 1); line(2, '#ffffff'); break;
      case 'harpoon': line(9, '#8d99a6', 1); line(3, '#ffffff'); break;
      case 'bullet': ctx.globalAlpha = 0.5; line(5, '#ffd65a', 1); ctx.globalAlpha = 1; line(2, '#fff7d0'); break;
      case 'pellet': line(2, '#ffd65a'); break;
      case 'laser': ctx.globalAlpha = 0.5; line(6, '#7dff6a', 0); ctx.globalAlpha = 1; line(4, '#e8ffd0'); break;
      case 'plasma': ctx.fillStyle = '#57c7ff'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillStyle = '#e8ffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); break;
      case 'mini': line(2, '#3df5ff'); break;
      case 'fireball': ctx.fillStyle = '#e2501c'; fillCirclePx(ctx, x, y, 2); ctx.fillStyle = '#ffd65a'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2); break;
      case 'ice': line(5, '#9fe3ff'); line(2, '#ffffff'); break;
      case 'curse': ctx.fillStyle = '#6a2aa6'; fillCirclePx(ctx, x, y, 2); ctx.fillStyle = (R.time * 10 | 0) % 2 ? '#e0b0ff' : '#c06aff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); break;
      case 'thorn': line(4, '#6fd36a'); line(1, '#d8ff9a'); break;
      case 'bomb':
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y), 5, 1);
        ctx.fillStyle = '#24212b'; fillCirclePx(ctx, x, y, 2); ctx.fillStyle = (R.time * 16 | 0) % 2 ? '#ffd65a' : '#ff7a1a'; ctx.fillRect(Math.round(x) + 1, Math.round(y) - 3, 1, 1); break;
      case 'ball': {
        const hop = Math.abs(Math.sin(p.t * 9)) * 5;
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(p.x) - 2, Math.round(p.y), 4, 1);
        ctx.fillStyle = '#ffffff'; fillCirclePx(ctx, p.x, p.y - 3 - hop, 2); ctx.fillStyle = '#24212b'; ctx.fillRect(Math.round(p.x), Math.round(p.y - 3 - hop), 1, 1); ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y - 4 - hop), 1, 1);
        break;
      }
      case 'chancla': case 'fan': case 'star': drawWeaponAt(ctx, p.w, x, y, p.spin, false, 0); break;
    }
  }

  R.frame = (dtReal) => {
    R.time += dtReal;
    const f = R.follow;
    if (f) {
      let tx = f.alive ? f.x + f.vx * 0.25 : f.x, ty = f.alive ? f.y - 10 + f.vy * 0.2 : f.y - 10;
      /* si pelea, la cámara se abre hacia su rival para que no quede fuera de plano */
      let bx = 0, by = 0;
      if (!R.preview && f.alive && f.state === 'fight' && f.tgt && f.tgt.alive) {
        const dx = f.tgt.x - f.x, dy = f.tgt.y - f.y;
        if (Math.abs(dx) < R.vw && Math.abs(dy) < R.vh) { bx = clamp(dx * 0.4, -R.vw * 0.22, R.vw * 0.22); by = clamp(dy * 0.4, -R.vh * 0.2, R.vh * 0.2); }
      }
      const kb = Math.min(1, dtReal * 2.2);
      R.bias.x += (bx - R.bias.x) * kb; R.bias.y += (by - R.bias.y) * kb;
      /* offY: centra en el hueco que deja el marcador (en móvil los botones de abajo ocupan más) */
      tx += R.bias.x; ty += R.bias.y + R.offY;
      R.cam.x += (tx - R.cam.x) * Math.min(1, dtReal * 5); R.cam.y += (ty - R.cam.y) * Math.min(1, dtReal * 5);
    }
    if (!R.preview) {
      R.cam.x = clamp(R.cam.x, R.vw / 2 - 20, world.W - R.vw / 2 + 20);
      R.cam.y = clamp(R.cam.y, R.vh / 2 - 20, world.H - R.vh / 2 + 20);
      if (R.vw > world.W) R.cam.x = world.W / 2;
      if (R.vh > world.H) R.cam.y = world.H / 2;
    }
    let sx = 0, sy = 0;
    if (R.shake > 0.2) { sx = Math.round((Math.random() - 0.5) * R.shake * 2); sy = Math.round((Math.random() - 0.5) * R.shake * 2); R.shake *= 0.86; } else R.shake = 0;
    const ox = Math.round(R.cam.x - R.vw / 2) - sx, oy = Math.round(R.cam.y - R.vh / 2) - sy;
    R.proj = (x, y, z) => [(x - ox) * K, (y - (z || 0) - oy) * K, K];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#16304e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(K, 0, 0, K, -ox * K, -oy * K);
    const gx = clamp(ox, 0, world.W), gy = clamp(oy, 0, world.H), gw = clamp(ox + R.vw, 0, world.W) - gx, gh = clamp(oy + R.vh, 0, world.H) - gy;
    if (gw > 0 && gh > 0) ctx.drawImage(R.ground, gx * K, gy * K, gw * K, gh * K, gx, gy, gw, gh);
    /* lava viva */
    if (R.lavaPts.length) {
      ctx.fillStyle = '#ffd65a';
      for (let i = 0; i < 40 * K; i++) { const k = (Math.random() * R.lavaPts.length / 2 | 0) * 2, x = R.lavaPts[k] + (K > 1 ? (Math.random() * 4 | 0) / 2 : 0), y = R.lavaPts[k + 1] + (K > 1 ? (Math.random() * 4 | 0) / 2 : 0); if (inView(x, y, 0)) ctx.fillRect(x, y, (1 + (Math.random() < 0.3 ? 1 : 0)) * PX, PX); }
    }
    if (R.waterPts.length) {
      ctx.fillStyle = '#6d958a';
      for (let i = 0; i < 14 * K; i++) { const k = (Math.random() * R.waterPts.length / 2 | 0) * 2, x = R.waterPts[k], y = R.waterPts[k + 1]; if (inView(x, y, 0)) ctx.fillRect(x, y, 2, PX); }
    }
    /* avisos de impacto */
    for (const A of M.areas) if (A.type === 'strike' && A.t < 0 && inView(A.x, A.y, 30)) {
      ctx.fillStyle = (R.time * 8 | 0) % 2 ? '#ff3b3b' : '#ffd65a';
      ringK(ctx, A.x, A.y, Math.round(A.r * (0.6 + 0.4 * (1 + A.t))), K);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#ff3b3b'; fillCircleK(ctx, A.x, A.y, A.r, K); ctx.globalAlpha = 1;
    }
    /* cofres y objetos */
    for (const c of world.chests) if (inView(c.x, c.y) && !(c.open && R.time - (c.openT || 0) > 2.5)) { ctx.drawImage(itemImg(c.open ? 'chestOpen' : 'chest', K), c.x - 6, c.y - 10, 12, 12); if (!c.open && (R.time * 2 + c.x) % 3 < 0.15) { ctx.fillStyle = '#fff3b0'; ctx.fillRect(c.x + 3, c.y - 9, PX * 2, PX * 2); } }
    for (const dr of M.drops) if (!dr.open && inView(dr.x, dr.y)) { ctx.drawImage(itemImg('potion', K), Math.round(dr.x) - 3, Math.round(dr.y) - 8 - ((R.time * 3 | 0) % 2), 6, 8); }
    /* sombras */
    ctx.fillStyle = 'rgba(10,6,16,0.32)';
    for (const o of M.fighters) {
      if (!o.alive || !inView(o.x, o.y)) continue;
      const sw = o.z > 0 ? Math.max(3, 9 - o.z / 20) : 9;
      ctx.fillRect(Math.round(o.x - sw / 2), Math.round(o.y) - 1, Math.round(sw), 2);
      if (o.isChamp && o.z <= 0 && !R.preview) {
        /* anillo dorado fijo en el suelo + onda que se abre: se localiza entre la multitud sin parpadeos */
        const ox = Math.round(o.x), oy = Math.round(o.y);
        ctx.fillStyle = '#1a0f14'; ellipseK(ctx, ox, oy + 1, 8.5, 3.5, K);
        ctx.fillStyle = '#ffd65a'; ellipseK(ctx, ox, oy, 8.5, 3.5, K); ellipseK(ctx, ox, oy, 8, 3, K);
        if (!REDUCED) { const ph = (R.time % 1.6) / 1.6; ctx.globalAlpha = 0.6 * (1 - ph); ellipseK(ctx, ox, oy, 8.5 + ph * 10, 3.5 + ph * 4.5, K); ctx.globalAlpha = 1; }
        ctx.fillStyle = 'rgba(10,6,16,0.32)';
      }
    }
    for (const A of M.airdrops) if (!A.open && inView(A.x, A.y)) { const sw = A.landed ? 14 : Math.max(4, 14 - A.z / 15); ctx.fillRect(Math.round(A.x - sw / 2), Math.round(A.y) - 1, Math.round(sw), 2); }
    /* cadáveres */
    for (const c of R.corpses) {
      if (!inView(c.x, c.y)) continue;
      ctx.save();
      ctx.globalAlpha = R.corpseAlpha ? R.corpseAlpha(c) : 1;
      ctx.translate(Math.round(c.x), Math.round(c.y) - 4);
      ctx.rotate(c.rot);
      ctx.drawImage(c.cv, -12, -21, 28, 30);
      ctx.restore();
    }
    /* entidades ordenadas por altura */
    const list = [];
    for (const o of world.obstacles) if (inView(o.x, o.y, 40)) list.push([o.y + 1, 0, o]);
    for (const o of M.fighters) if (o.alive && inView(o.x, o.y - o.z, 30)) list.push([o.y, 1, o]);
    for (const A of M.airdrops) if (!A.open && inView(A.x, A.y - A.z, 60)) list.push([A.y, 2, A]);
    list.sort((a, b) => a[0] - b[0]);
    const fol = R.follow && R.follow.alive ? R.follow : null;
    for (const e of list) {
      if (e[1] === 0) {
        const o = e[2], biome = world.biomeAt(o.x, o.y), s = obsSprite(o, biome);
        let fade = false;
        if (fol && fol.y < o.y && fol.y > o.y - s.c.height && Math.abs(fol.x - o.x) < s.c.width / 2 + 4) fade = true;
        if (fade) ctx.globalAlpha = 0.45;
        ctx.drawImage(obsImg(o, biome, K), o.x - s.ax, o.y + 2 - s.ay - 1, s.c.width, s.c.height);
        ctx.globalAlpha = 1;
      } else if (e[1] === 1) drawFighter(e[2]);
      else {
        const A = e[2], y = Math.round(A.y - A.z);
        if (!A.landed) ctx.drawImage(itemImg('chute', K), Math.round(A.x) - 11, y - 26, 22, 14);
        ctx.drawImage(itemImg('crate', K), Math.round(A.x) - 8, y - 14, 16, 15);
        if (A.landed && (R.time * 2 | 0) % 2) { ctx.fillStyle = '#ffd65a'; ctx.fillRect(Math.round(A.x), y - 18, 1, 2); }
      }
    }
    /* proyectiles */
    for (const p of M.proj) if (inView(p.x, p.y)) drawProj(p);
    /* ondas */
    for (const A of M.areas) if (A.type === 'wave') {
      ctx.fillStyle = '#f2c14e';
      for (let k = 0; k < 2; k++) { const r = A.r - k * 5; if (r < 2) continue; const n = Math.max(6, r * A.cone); for (let i = 0; i <= n; i++) { const a = A.ang - A.cone / 2 + A.cone * i / n; ctx.fillRect(Math.round(A.x + Math.cos(a) * r), Math.round(A.y - 8 + Math.sin(a) * r * 0.8), 1, 1); } ctx.fillStyle = '#7a4fd1'; }
    }
    /* partículas */
    for (const p of R.parts) {
      if (!inView(p.x, p.y)) continue;
      let c = p.c;
      if (p.t === 2) c = FIRE[Math.min(FIRE.length - 1, Math.floor((1 - p.life / p.max) * FIRE.length))];
      if (p.t === 7) { ctx.globalAlpha = clamp(p.life / p.max, 0, 0.6); }
      ctx.fillStyle = c;
      if (p.t === 6) { ctx.fillRect(Math.round(p.x - Math.cos(p.ang) * 3), Math.round(p.y - 8 - Math.sin(p.ang) * 3), 1, 1); ctx.fillRect(Math.round(p.x), Math.round(p.y - 8), 1, 1); continue; }
      if (p.t === 8) { const x = Math.round(p.x), y = Math.round(p.y - p.z); ctx.fillRect(x, y, 1, 3); ctx.fillRect(x - 2, y + 2, 2, 2); ctx.fillRect(x + 1, y, 1, 1); ctx.globalAlpha = 1; continue; }
      if (K > 1) { const ps = (p.t === 2 || p.t === 7) ? p.s : (p.s === 2 ? 1 : 0.5); ctx.fillRect(rK(p.x), rK(p.y - p.z), ps, ps); }
      else ctx.fillRect(Math.round(p.x), Math.round(p.y - p.z), p.s, p.s);
      if (p.t === 7) ctx.globalAlpha = 1;
    }
    /* rayos y trazadoras */
    for (const b of R.beams) {
      const k = b.t / b.max;
      ctx.globalAlpha = clamp(k * 1.4, 0, 1);
      for (let s = 0; s < b.pts.length - 1; s++) {
        const [x1, y1] = b.pts[s], [x2, y2] = b.pts[s + 1];
        const n = Math.max(2, Math.ceil(dist(x1, y1, x2, y2) / (K > 1 ? 1 : 2)));
        let jx = 0, jy = 0;
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          if (b.zig && i % 3 === 0) { jx = (Math.random() - 0.5) * 5; jy = (Math.random() - 0.5) * 5; }
          const x = rK(lerp(x1, x2, t) + (b.zig && i > 0 && i < n ? jx : 0)), y = rK(lerp(y1, y2, t) + (b.zig && i > 0 && i < n ? jy : 0));
          ctx.fillStyle = b.c; ctx.fillRect(x, y, b.thick || 1, b.thick || 1);
          if (b.zig || b.thick || K > 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, K > 1 ? PX : 1, K > 1 ? PX : 1); }
        }
      }
      ctx.globalAlpha = 1;
    }
    for (const g of R.rings) { ctx.globalAlpha = clamp(g.t * 4, 0, 1); ctx.fillStyle = g.c; ringK(ctx, g.x, g.y, g.r, K); ctx.globalAlpha = 1; }
    for (const fl of R.flashes) { ctx.fillStyle = fl.c; if (fl.r) fillCircleK(ctx, fl.x, fl.y, fl.r, K); else { ctx.fillRect(Math.round(fl.x) - 1, Math.round(fl.y) - 1, 3, 3); ctx.fillRect(Math.round(fl.x) - 2, Math.round(fl.y), 5, 1); ctx.fillRect(Math.round(fl.x), Math.round(fl.y) - 2, 1, 5); } }
    /* tormenta */
    if (!M.training) {
      const Z = M.zone;
      ctx.beginPath();
      ctx.rect(ox - 2, oy - 2, R.vw + 4, R.vh + 4);
      ctx.arc(Z.x, Z.y, Math.max(0.5, Z.r), 0, TAU, true);
      ctx.fillStyle = 'rgba(74,22,128,0.42)';
      ctx.fill('evenodd');
      ctx.lineWidth = 2; ctx.strokeStyle = '#b07dff'; ctx.beginPath(); ctx.arc(Z.x, Z.y, Math.max(0.5, Z.r), 0, TAU); ctx.stroke();
      ctx.lineWidth = 1; ctx.strokeStyle = '#f0d6ff'; ctx.beginPath(); ctx.arc(Z.x, Z.y, Math.max(0.5, Z.r - 1.5), 0, TAU); ctx.stroke();
      if (Z.mode !== 'final' && Z.nr < Z.r - 2) { ctx.lineWidth = K > 1 ? 0.5 : 1; ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(Z.nx, Z.ny, Z.nr, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#d6b8ff';
      for (let i = 0; i < 12 * K; i++) {
        const a = Math.random() * TAU, r = Z.r + Math.random() * 60;
        const x = rK(Z.x + Math.cos(a) * r), y = rK(Z.y + Math.sin(a) * r);
        if (inView(x, y, 0)) ctx.fillRect(x, y, PX, (Math.random() < 0.3 ? 3 : 1) * PX);
      }
    }
    /* números de daño */
    for (const n of R.nums) {
      if (!inView(n.x, n.y)) continue;
      ctx.globalAlpha = clamp(n.t * 3, 0, 1);
      drawText3(ctx, n.txt, n.x, n.y - n.z, n.c, n.big ? 2 : 1, '#1a0f14');
      ctx.globalAlpha = 1;
    }
    /* marcadores y barras de vida */
    for (const o of M.fighters) {
      if (!o.alive || o.d.dummy || !inView(o.x, o.y)) continue;
      const show = !R.preview && R.showBar(o);
      const y = Math.round(o.y - o.z) - 30;
      if (show && o.z <= 0 && K > 1) {
        const x = Math.round(o.x) - 7, k = clamp(o.hp / o.maxHp, 0, 1), ar = o.armor > 0;
        ctx.fillStyle = '#1a0f14'; ctx.fillRect(x - 0.5, y - 0.5, 15, ar ? 4 : 2.5);
        ctx.fillStyle = '#4a1a22'; ctx.fillRect(x, y, 14, 1.5);
        ctx.fillStyle = k > 0.5 ? '#6fdc5a' : k > 0.25 ? '#ffd65a' : '#ff3b3b'; ctx.fillRect(x, y, Math.max(0.5, rK(14 * k)), 1.5);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, Math.max(0.5, rK(14 * k)), 0.5);
        if (ar) { ctx.fillStyle = '#5aa9ff'; ctx.fillRect(x, y + 2, Math.max(0.5, rK(14 * Math.min(1, o.armor / 100))), 1); }
      } else if (show && o.z <= 0) {
        const x = Math.round(o.x) - 7, k = clamp(o.hp / o.maxHp, 0, 1);
        ctx.fillStyle = '#1a0f14'; ctx.fillRect(x - 1, y - 1, 16, o.armor > 0 ? 5 : 4);
        ctx.fillStyle = '#4a1a22'; ctx.fillRect(x, y, 14, 2);
        ctx.fillStyle = k > 0.5 ? '#6fdc5a' : k > 0.25 ? '#ffd65a' : '#ff3b3b'; ctx.fillRect(x, y, Math.max(1, Math.round(14 * k)), 2);
        if (o.armor > 0) { ctx.fillStyle = '#5aa9ff'; ctx.fillRect(x, y + 3, Math.max(1, Math.round(14 * Math.min(1, o.armor / 100))), 1); }
      }
      if ((o.isChamp || o === R.follow) && !R.preview) {
        const bob = (R.time * 3 | 0) % 2;
        const col = o.isChamp ? '#ffd65a' : '#ffffff';
        drawText3(ctx, o.d.n, o.x, y - 8 - bob, col, 1, '#1a0f14');
        ctx.fillStyle = col; ctx.fillRect(Math.round(o.x) - 2, y - 2 - bob, 5, 1); ctx.fillRect(Math.round(o.x) - 1, y - 1 - bob, 3, 1);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  M.fx = R.fx;
  /* minimapa */
  let miniBase = null;
  R.drawMini = (mc) => {
    const m = mc.getContext('2d'), S = mc.width, k = S / world.W;
    if (!miniBase) {
      miniBase = makeCanvas(S, S);
      const b = miniBase.getContext('2d'); b.imageSmoothingEnabled = true; b.drawImage(R.ground, 0, 0, R.ground.width, R.ground.height, 0, 0, S, S);
    }
    m.imageSmoothingEnabled = false;
    m.clearRect(0, 0, S, S);
    m.drawImage(miniBase, 0, 0);
    const Z = M.zone;
    m.beginPath(); m.rect(0, 0, S, S); m.arc(Z.x * k, Z.y * k, Math.max(0.5, Z.r * k), 0, TAU, true); m.fillStyle = 'rgba(74,22,128,0.55)'; m.fill('evenodd');
    m.strokeStyle = '#b07dff'; m.lineWidth = 1; m.beginPath(); m.arc(Z.x * k, Z.y * k, Math.max(0.5, Z.r * k), 0, TAU); m.stroke();
    if (Z.mode !== 'final') { m.strokeStyle = '#ffffff'; m.setLineDash([2, 2]); m.beginPath(); m.arc(Z.nx * k, Z.ny * k, Z.nr * k, 0, TAU); m.stroke(); m.setLineDash([]); }
    for (const o of M.fighters) {
      if (!o.alive) continue;
      if (o.isChamp || o === R.follow) continue;
      m.fillStyle = '#efe6d6'; m.fillRect(Math.round(o.x * k) - 1, Math.round(o.y * k) - 1, 2, 2);
    }
    for (const A of M.airdrops) if (!A.open && (R.time * 3 | 0) % 2) { m.fillStyle = '#ffd65a'; m.fillRect(Math.round(A.x * k) - 2, Math.round(A.y * k) - 2, 4, 4); }
    const hl = (o, c) => { if (!o || !o.alive) return; m.fillStyle = '#1a0f14'; m.fillRect(Math.round(o.x * k) - 3, Math.round(o.y * k) - 3, 6, 6); m.fillStyle = c; m.fillRect(Math.round(o.x * k) - 2, Math.round(o.y * k) - 2, 4, 4); };
    if (R.follow && !R.follow.isChamp) hl(R.follow, '#ffffff');
    hl(M.champ, '#ffd65a');
    if (R.view3d) {
      const C = R.view3d, hf = Math.atan2(R.vw / 2, C.F), L = 150 * k;
      m.strokeStyle = 'rgba(255,255,255,0.75)'; m.beginPath();
      m.moveTo(C.x * k + Math.cos(C.yaw - hf) * L, C.y * k + Math.sin(C.yaw - hf) * L); m.lineTo(C.x * k, C.y * k); m.lineTo(C.x * k + Math.cos(C.yaw + hf) * L, C.y * k + Math.sin(C.yaw + hf) * L); m.stroke();
      m.fillStyle = '#ffffff'; m.fillRect(Math.round(C.x * k) - 1, Math.round(C.y * k) - 1, 3, 3);
    } else { m.strokeStyle = 'rgba(255,255,255,0.5)'; m.strokeRect((R.cam.x - R.vw / 2) * k + 0.5, (R.cam.y - R.vh / 2) * k + 0.5, R.vw * k, R.vh * k); }
  };
  return R;
}
const REDUCED = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* mundo de entrenamiento para la ficha */
function genTrainingWorld(biomeKey) {
  const W = 160, H = 80, bw = W / BS, bh = H / BS;
  const w = {
    seed: 1, W, H, bw, types: [biomeKey], biome: new Uint8Array(bw * bh), hazard: new Uint8Array(bw * bh), obstacles: [], chests: [], spawns: [], pools: [], s3: 17, island: false,
    biomeAt: () => biomeKey, hazAt: () => 0, near: () => [], blocked: () => null, los: () => true
  };
  return w;
}
const DUMMY_DEF = { id: 'dummy', dummy: true, n: 'Muñeco', bd: 'n', x: [], fa: [], hp: 99999, spd: 0, str: 1, luck: 0, mass: 999, sk: '#d9c48a', c1: '#d9c48a', c2: '#7a4a24', c3: '#d2283c' };
DUMMY_DEF.weapon = WEAPONS.punos; DUMMY_DEF.w = 'punos'; DUMMY_DEF.pers = PERS.cauto;

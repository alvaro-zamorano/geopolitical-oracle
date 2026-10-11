/* ===== cámara dron: pseudo-3D (suelo en perspectiva tipo Mode 7 + sprites escalados) =====
   Reutiliza el estado del renderer 2D (partículas, cadáveres, números, rayos) y la textura del suelo con sus manchas. */
const rgbPack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
const hexPack = (h) => { const c = hexToRgb(h); return rgbPack(c[0], c[1], c[2]); };
const P3 = { ZMAX: 470, sea: hexPack('#16304e'), haze: [64, 44, 86], storm: [104, 36, 160] };
const SKY_LUT = (() => {
  const stops = [[0, '#0f0a1c'], [0.55, '#2c1a46'], [0.85, '#5a3462'], [1, '#8a546e']].map((s) => [s[0], hexToRgb(s[1])]);
  const out = new Uint32Array(64);
  for (let i = 0; i < 64; i++) {
    const t = i / 63;
    let a = stops[0], b = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) if (t >= stops[k][0] && t <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
    const u = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
    out[i] = rgbPack(a[1][0] + (b[1][0] - a[1][0]) * u, a[1][1] + (b[1][1] - a[1][1]) * u, a[1][2] + (b[1][2] - a[1][2]) * u);
  }
  return out;
})();
const PROJ_COL = { arrow: '#c9a77a', bolt: '#8a5a2b', harpoon: '#d9e0e6', bullet: '#fff3b0', pellet: '#ffd65a', laser: '#7dff6a', plasma: '#57c7ff', fireball: '#ff7a1a', ice: '#9fe3ff', curse: '#c06aff', thorn: '#6fd36a', bomb: '#24212b', ball: '#ffffff', chancla: '#3fa8e0', fan: '#e8402f', star: '#d9e0e6', mini: '#3df5ff' };

function attach3D(R) {
  const M = R.M, world = M.world, K = R.K || 1, gW = R.ground.width, gH = R.ground.height, GK = gW / world.W;
  const gbuf = R.ground.buf;
  const off = makeCanvas(64 * K, 72 * K), ox = off.getContext('2d');
  ox.setTransform(K, 0, 0, K, 0, 0);
  const floorCv = makeCanvas(1, 1), fctx = floorCv.getContext('2d');
  let img = null, buf = null, cw = 0, ch = 0;
  R.cam3 = { x: 0, y: 0, fx: 0, fy: 0, yaw: 0, h: 46, hy: 50, hyF: 0.22, F: 300, dist: 120, mode: 'chase', init: false };
  R.picks = [];



  /* --- cámara --- */
  R.cam3Update = (dt, mode, focus, heading, snap) => {
    const C = R.cam3, vw = R.vw, vh = R.vh;
    C.F = 0.9 * Math.max(vw, vh * 0.62);
    const port = vh > vw * 1.2;
    /* en vertical: menos cielo y la acción por encima de los botones */
    const P = mode === 'orbit' ? { frac: port ? 0.22 : 0.28, hy: port ? 0.3 : 0.3, feet: port ? 0.68 : 0.76 } : { frac: port ? 0.17 : 0.24, hy: port ? 0.26 : 0.22, feet: port ? 0.7 : 0.74 };
    let dist = 24 * C.F / (vh * P.frac);
    /* duelo: la cámara mira de lado a la pareja, así que basta con que quepan a lo ancho */
    if (focus.spread) dist = Math.max(dist, focus.lock ? (focus.spread * 0.5 + 16) * C.F / (vw * 0.36) : focus.spread * 1.15 + 50);
    const h = (P.feet - P.hy) * vh * dist / C.F;
    if (!C.init || snap) { C.fx = focus.x; C.fy = focus.y; C.dist = dist; C.h = h; C.hyF = P.hy; if (heading !== null) C.yaw = heading; C.init = true; }
    const k = Math.min(1, dt * 3);
    C.dist += (dist - C.dist) * k; C.h += (h - C.h) * k; C.hyF += (P.hy - C.hyF) * k;
    C.fx += (focus.x - C.fx) * Math.min(1, dt * 6); C.fy += (focus.y - C.fy) * Math.min(1, dt * 6);
    if (mode === 'orbit' && focus.lock && focus.ang !== undefined) {
      /* regla de los 180°: perpendicular a la línea entre los dos, del lado en que ya está, con un balanceo suave */
      let tgt = focus.ang + Math.PI / 2 + Math.sin(R.time * 0.45) * 0.28;
      if (Math.abs(angDiff(C.yaw, tgt)) > Math.PI / 2) tgt += Math.PI;
      C.yaw += angDiff(C.yaw, tgt) * Math.min(1, dt * 1.4);
    } else if (mode === 'orbit') C.yaw += dt * 0.35;
    else if (heading !== null) C.yaw += angDiff(C.yaw, heading) * Math.min(1, dt * 1.2);
    C.mode = mode;
    let sx = 0, sy = 0;
    if (R.shake > 0.2) { sx = (Math.random() - 0.5) * R.shake; sy = (Math.random() - 0.5) * R.shake; R.shake *= 0.86; } else R.shake = 0;
    C.x = C.fx - Math.cos(C.yaw) * C.dist + sx; C.y = C.fy - Math.sin(C.yaw) * C.dist + sy;
    C.hy = Math.round(vh * C.hyF);
    R.cam.x = C.fx; R.cam.y = C.fy;
  };

  /* --- fotograma --- */
  R.frame3d = (dt) => {
    R.time += dt;
    const C = R.cam3, ctx = R.ctx, vw = R.vw, vh = R.vh, F = C.F, H = C.h, hy = C.hy, Z = M.zone;
    R.view3d = C;
    if (!img || cw !== vw || ch !== vh) { floorCv.width = vw; floorCv.height = vh; img = fctx.createImageData(vw, vh); buf = new Uint32Array(img.data.buffer); cw = vw; ch = vh; }
    const fx = Math.cos(C.yaw), fy = Math.sin(C.yaw), rx = -fy, ry = fx;
    /* cielo con estrellas fijas en el horizonte */
    const skyRows = clamp(hy + 1, 0, vh);
    for (let y = 0; y < skyRows; y++) {
      const base = SKY_LUT[Math.round(clamp(y / Math.max(1, hy), 0, 1) * 63)];
      const row = y * vw;
      buf.fill(base, row, row + vw);
      if (y < hy * 0.7) for (let x = 0; x < vw; x += 1) {
        const a = Math.round((C.yaw + Math.atan((x - vw / 2) / F)) * 160);
        if (hash2(a, y, 5) > 0.994) buf[row + x] = 0xffd6e6ef;
      }
    }
    /* suelo */
    const zr2 = Z.r * Z.r, haze = P3.haze, st = P3.storm, training = M.training;
    for (let y = Math.max(skyRows, 0); y < vh; y++) {
      const z = H * F / (y - hy + 0.5);
      const row = y * vw;
      if (z > P3.ZMAX || z <= 0) { buf.fill(rgbPack(haze[0], haze[1], haze[2]), row, row + vw); continue; }
      const fog = clamp((z - 170) / 300, 0, 0.82), nf = 1 - fog;
      const dl = z / F;
      let wx = C.x + fx * z + rx * (-vw / 2) * dl, wy = C.y + fy * z + ry * (-vw / 2) * dl;
      const sx = rx * dl, sy = ry * dl;
      for (let x = 0; x < vw; x++) {
        const ix = (wx * GK) | 0, iy = (wy * GK) | 0;
        let v = (ix >= 0 && iy >= 0 && ix < gW && iy < gH) ? gbuf[iy * gW + ix] : P3.sea;
        let r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
        if (!training) { const dx = wx - Z.x, dy = wy - Z.y; if (dx * dx + dy * dy > zr2) { r = r * 0.55 + st[0] * 0.45; g = g * 0.55 + st[1] * 0.45; b = b * 0.55 + st[2] * 0.45; } }
        if (fog > 0) { r = r * nf + haze[0] * fog; g = g * nf + haze[1] * fog; b = b * nf + haze[2] * fog; }
        buf[row + x] = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
        wx += sx; wy += sy;
      }
    }
    fctx.putImageData(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(floorCv, 0, 0, vw * K, vh * K);
    ctx.setTransform(K, 0, 0, K, 0, 0);

    const P = (x, y) => {
      const dx = x - C.x, dy = y - C.y, z = dx * fx + dy * fy;
      if (z < 6 || z > P3.ZMAX) return null;
      const s = F / z;
      return { z, s, sx: vw / 2 + (dx * rx + dy * ry) * s, sy: hy + H * s };
    };
    R.proj = (x, y, z) => { const q = P(x, y); return q ? [q.sx * K, (q.sy - (z || 0) * q.s) * K, q.s * K] : null; };
    const ring = (x, y, r, col, step) => {
      const n = Math.max(14, Math.round(r * (step || 2.5)));
      ctx.fillStyle = col;
      for (let i = 0; i < n; i++) { const a = i / n * TAU, q = P(x + Math.cos(a) * r, y + Math.sin(a) * r); if (q) { const w = Math.max(1, Math.round(q.s * 0.5)); ctx.fillRect(Math.round(q.sx), Math.round(q.sy), w, w); } }
    };

    /* muro de tormenta */
    if (!training) {
      ctx.globalAlpha = 0.3;
      for (let x = 0; x < vw; x += 1) {
        const lx = (x - vw / 2) / F, dxr = fx + rx * lx, dyr = fy + ry * lx;
        const px = C.x - Z.x, py = C.y - Z.y;
        const a = dxr * dxr + dyr * dyr, b = 2 * (dxr * px + dyr * py), c = px * px + py * py - zr2, disc = b * b - 4 * a * c;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc);
        let t = (-b - sq) / (2 * a); if (t < 6) t = (-b + sq) / (2 * a);
        if (t < 6 || t > P3.ZMAX) continue;
        const yg = hy + H * F / t, yt = hy + (H - 150) * F / t;
        ctx.fillStyle = '#8a4ae0'; ctx.fillRect(x, Math.round(yt), 1, Math.max(1, Math.round(yg - yt)));
      }
      ctx.globalAlpha = 1;
    }

    /* sprites ordenados por profundidad */
    const L = [];
    for (const o of world.obstacles) { const q = P(o.x, o.y + 1); if (q && q.sx > -40 * q.s && q.sx < vw + 40 * q.s) L.push([q.z, 0, o, q]); }
    for (const c of world.chests) { if (c.open && R.time - (c.openT || 0) > 2.5) continue; const q = P(c.x, c.y); if (q) L.push([q.z, 3, c, q]); }
    for (const d of M.drops) if (!d.open) { const q = P(d.x, d.y); if (q) L.push([q.z, 4, d, q]); }
    for (const A of M.airdrops) if (!A.open) { const q = P(A.x, A.y); if (q) L.push([q.z, 5, A, q]); }
    for (const c of R.corpses) { const q = P(c.x, c.y); if (q) L.push([q.z, 2, c, q]); }
    for (const f of M.fighters) if (f.alive) { const q = P(f.x, f.y); if (q && q.sx > -40 * q.s && q.sx < vw + 40 * q.s) L.push([q.z, 1, f, q]); }
    L.sort((a, b) => b[0] - a[0]);
    const over = [];
    R.picks = [];
    /* protagonistas del plano: lo que se interponga entre ellos y la cámara se vuelve transparente */
    const subj = [], subjSet = new Set();
    const addSubj = (o) => {
      if (!o || subjSet.has(o)) return;
      subjSet.add(o);
      const q = P(o.x, o.y); if (!q) return;
      const hh = o.alive ? 30 : 12;
      subj.push({ z: q.z, x0: q.sx - 10 * q.s, x1: q.sx + 10 * q.s, y0: q.sy - hh * q.s, y1: q.sy });
    };
    if (R.follow && R.follow.alive) addSubj(R.follow);
    if (M.champ && M.champ.alive) addSubj(M.champ);
    if (R.subjects) for (const o of R.subjects) addSubj(o);
    const hides = (z, x0, x1, y0, y1) => { for (const r of subj) if (z < r.z - 3 && x0 < r.x1 && x1 > r.x0 && y0 < r.y1 && y1 > r.y0) return true; return false; };
    for (const e of L) {
      const q = e[3], s = q.s, flat = clamp(H / q.z, 0.15, 1);
      switch (e[1]) {
        case 0: {
          const o = e[2], bio = world.biomeAt(o.x, o.y), sp = obsSprite(o, bio), im = obsImg(o, bio, K);
          const w = sp.c.width * s, h = sp.c.height * s, x0 = q.sx - sp.ax * s, y0 = q.sy - sp.ay * s;
          const between = (q.z < C.dist - 4 && Math.abs(q.sx - vw / 2) < w / 2 + 6 * s) || hides(q.z, x0, x0 + w, y0, y0 + h);
          if (between) ctx.globalAlpha = 0.35;
          ctx.drawImage(im, Math.round(q.sx - sp.ax * s), Math.round(q.sy - sp.ay * s), Math.ceil(w), Math.ceil(h));
          ctx.globalAlpha = 1;
          break;
        }
        case 1: {
          const f = e[2];
          let dir = f.f > 0 ? 0 : Math.PI;
          if (f.state === 'fight' || f.atkT >= 0 || f.contT > 0) dir = f.aim; else if (f.moving) dir = Math.atan2(f.vy, f.vx);
          const lat = Math.cos(dir) * rx + Math.sin(dir) * ry;
          if (f.sf3 === undefined || Math.abs(lat) > 0.22) f.sf3 = lat >= 0 ? 1 : -1;
          const pf = Object.create(f); pf.f = f.sf3; pf.aim = f.sf3 > 0 ? 0.06 : Math.PI - 0.06;
          const outside = !training && dist2(f.x, f.y, Z.x, Z.y) > zr2;
          ox.clearRect(0, 0, 64, 72);
          R.drawFighter(pf, ox, 32, 58, outside ? '#8a4ae0' : null);
          /* sombra */
          if (f.z <= 0) { ctx.fillStyle = 'rgba(10,6,16,0.35)'; const hh = Math.max(1, Math.round(3 * s * flat)); ctx.fillRect(Math.round(q.sx - 4.5 * s), Math.round(q.sy - hh / 2), Math.round(9 * s), hh); }
          if (f.isChamp && f.z <= 0 && !training) ring(f.x, f.y, 7, (R.time * 3 | 0) % 2 ? '#f2b43a' : '#ffd65a');
          const top = q.sy - (58 + (f.z || 0)) * s;
          if (!subjSet.has(f) && (q.z < C.dist * 0.6 || hides(q.z, q.sx - 10 * s, q.sx + 10 * s, q.sy - 30 * s, q.sy))) ctx.globalAlpha = 0.4;
          ctx.drawImage(off, Math.round(q.sx - 32 * s), Math.round(top), Math.ceil(64 * s), Math.ceil(72 * s));
          ctx.globalAlpha = 1;
          const headY = q.sy - (f.z || 0) * s - 26 * s;
          R.picks.push({ f, x0: q.sx - 8 * s, x1: q.sx + 8 * s, y0: headY, y1: q.sy });
          /* en la killcam no hay nombres ni barras flotando: el plano es para el golpe */
          if (!training && !R.cine && R.showBar(f)) over.push([f, q.sx, headY, s]);
          break;
        }
        case 2: {
          const c = e[2];
          ctx.save();
          ctx.globalAlpha = R.corpseAlpha ? R.corpseAlpha(c) : 1;
          if (!subjSet.has(c) && hides(q.z, q.sx - 14 * s, q.sx + 14 * s, q.sy - 12 * s, q.sy)) ctx.globalAlpha *= 0.35;
          ctx.translate(Math.round(q.sx), Math.round(q.sy - 3 * s * flat));
          ctx.scale(s, s * clamp(flat * 2.4, 0.3, 1));
          ctx.rotate(c.rot);
          ctx.drawImage(c.cv, -12, -21, 28, 30);
          ctx.restore();
          break;
        }
        case 3: { const c = e[2], sp = itemImg(c.open ? 'chestOpen' : 'chest', K); ctx.drawImage(sp, Math.round(q.sx - 6 * s), Math.round(q.sy - 10 * s), Math.ceil(12 * s), Math.ceil(12 * s)); break; }
        case 4: { const sp = itemImg('potion', K); ctx.drawImage(sp, Math.round(q.sx - 3 * s), Math.round(q.sy - 8 * s), Math.ceil(6 * s), Math.ceil(8 * s)); break; }
        case 5: {
          const A = e[2], y = q.sy - A.z * s;
          if (hides(q.z, q.sx - 11 * s, q.sx + 11 * s, y - 26 * s, y)) ctx.globalAlpha = 0.35;
          if (!A.landed) ctx.drawImage(itemImg('chute', K), Math.round(q.sx - 11 * s), Math.round(y - 26 * s), Math.ceil(22 * s), Math.ceil(14 * s));
          else { ctx.fillStyle = 'rgba(255,214,90,0.25)'; ctx.fillRect(Math.round(q.sx - 1 * s), Math.round(q.sy - 90 * s), Math.max(1, Math.round(2 * s)), Math.round(90 * s)); }
          ctx.drawImage(itemImg('crate', K), Math.round(q.sx - 8 * s), Math.round(y - 14 * s), Math.ceil(16 * s), Math.ceil(15 * s));
          ctx.globalAlpha = 1;
          break;
        }
      }
    }
    /* avisos de impacto y ondas */
    for (const A of M.areas) {
      if (A.type === 'strike' && A.t < 0) { const col = (R.time * 8 | 0) % 2 ? '#ff3b3b' : '#ffd65a'; ring(A.x, A.y, A.r, col); ring(A.x, A.y, A.r * (0.6 + 0.4 * (1 + A.t)), col); }
      else if (A.type === 'wave') {
        ctx.fillStyle = '#f2c14e';
        const n = Math.max(8, Math.round(A.r * A.cone * 1.5));
        for (let i = 0; i <= n; i++) { const a = A.ang - A.cone / 2 + A.cone * i / n, q = P(A.x + Math.cos(a) * A.r, A.y + Math.sin(a) * A.r); if (q) ctx.fillRect(Math.round(q.sx), Math.round(q.sy - 8 * q.s), Math.max(1, Math.round(q.s)), Math.max(1, Math.round(q.s * 2))); }
      }
    }
    /* proyectiles */
    for (const p of M.proj) {
      const q = P(p.x, p.y); if (!q) continue;
      const hz = p.lob ? p.z : 8, col = PROJ_COL[p.type] || '#ffffff', sz = Math.max(1, Math.round(q.s * (p.type === 'fireball' || p.type === 'curse' || p.type === 'bomb' || p.type === 'ball' ? 1.6 : 0.8)));
      ctx.fillStyle = col;
      const tail = P(p.x - Math.cos(p.ang || 0) * 5, p.y - Math.sin(p.ang || 0) * 5);
      if (tail && (p.type === 'arrow' || p.type === 'bolt' || p.type === 'laser' || p.type === 'bullet' || p.type === 'harpoon' || p.type === 'ice' || p.type === 'thorn')) {
        const n = 6; for (let i = 0; i <= n; i++) { const t = i / n; ctx.fillRect(Math.round(lerp(q.sx, tail.sx, t)), Math.round(lerp(q.sy - hz * q.s, tail.sy - hz * tail.s, t)), sz, sz); }
      } else ctx.fillRect(Math.round(q.sx - sz / 2), Math.round(q.sy - hz * q.s - sz / 2), sz, sz);
    }
    /* partículas */
    for (const p of R.parts) {
      const q = P(p.x, p.y); if (!q) continue;
      let c = p.c;
      if (p.t === 2) c = FIRE[Math.min(FIRE.length - 1, Math.floor((1 - p.life / p.max) * FIRE.length))];
      if (p.t === 7) ctx.globalAlpha = clamp(p.life / p.max, 0, 0.6);
      ctx.fillStyle = c;
      const sz = Math.max(1, Math.round(p.s * q.s * 0.75));
      ctx.fillRect(Math.round(q.sx), Math.round(q.sy - (p.z || 0) * q.s), sz, sz);
      if (p.t === 7) ctx.globalAlpha = 1;
    }
    /* rayos, trazadoras, destellos y anillos */
    for (const b of R.beams) {
      ctx.globalAlpha = clamp(b.t / b.max * 1.4, 0, 1);
      let pts;
      if (b.sky) { const g = b.pts[b.pts.length - 1]; pts = [[g[0], g[1], 170], [g[0], g[1], 0]]; }
      else pts = b.pts.map((p) => [p[0], p[1] + 9, 9]);
      for (let k = 0; k < pts.length - 1; k++) {
        const a = P(pts[k][0], pts[k][1]), c = P(pts[k + 1][0], pts[k + 1][1]);
        if (!a || !c) continue;
        const ax = a.sx, ay = a.sy - pts[k][2] * a.s, cx = c.sx, cy = c.sy - pts[k + 1][2] * c.s;
        const n = Math.max(2, Math.ceil(Math.hypot(cx - ax, cy - ay) / 2));
        let jx = 0, jy = 0;
        for (let i = 0; i <= n; i++) {
          if (b.zig && i % 3 === 0) { jx = (Math.random() - 0.5) * 6; jy = (Math.random() - 0.5) * 6; }
          const x = Math.round(lerp(ax, cx, i / n) + (b.zig ? jx : 0)), y = Math.round(lerp(ay, cy, i / n) + (b.zig ? jy : 0));
          ctx.fillStyle = b.c; ctx.fillRect(x, y, b.thick ? 3 : 2, b.thick ? 3 : 2);
          ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
    for (const g of R.rings) { ctx.globalAlpha = clamp(g.t * 4, 0, 1); ring(g.x, g.y, g.r, g.c, 3); ctx.globalAlpha = 1; }
    for (const fl of R.flashes) {
      const q = P(fl.x, fl.y + 6); if (!q) continue;
      ctx.fillStyle = fl.c;
      const r = Math.max(1, Math.round((fl.r || 2) * q.s));
      fillCirclePx(ctx, q.sx, q.sy - 6 * q.s, r);
    }
    /* números de daño */
    for (const n of R.nums) {
      const hh = n.h === undefined ? 22 : n.h, q = P(n.x, n.y + hh); if (!q || q.z > 240) continue;
      ctx.globalAlpha = clamp(n.t * 3, 0, 1);
      drawText3(ctx, n.txt, q.sx, q.sy - (hh + n.z) * q.s, n.c, n.big && q.s > 2.2 ? 2 : 1, '#1a0f14');
      ctx.globalAlpha = 1;
    }
    /* nombres y barras de vida (siempre encima) */
    for (const [f, x, y, s] of over) {
      const sc = s > 2.2 ? 2 : 1, bw = 14 * sc, bx = Math.round(x - bw / 2), by = Math.round(y - 8 * sc);
      const k = clamp(f.hp / f.maxHp, 0, 1);
      ctx.fillStyle = '#1a0f14'; ctx.fillRect(bx - 1, by - 1, bw + 2, 2 * sc + 2);
      ctx.fillStyle = k > 0.5 ? '#6fdc5a' : k > 0.25 ? '#ffd65a' : '#ff3b3b'; ctx.fillRect(bx, by, Math.max(1, Math.round(bw * k)), 2 * sc);
      if (f.isChamp || f === R.follow) drawText3(ctx, f.d.n, x, by - 8 * sc, f.isChamp ? '#ffd65a' : '#ffffff', sc, '#1a0f14');
    }
  };
}

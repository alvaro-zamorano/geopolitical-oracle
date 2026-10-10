/* ===== modo HD: doble resolución de pixel =====
   epx2: escalado EPX/Scale2x (suaviza diagonales sin inventar colores).
   hdPass: contorno fino exterior, líneas interiores entre zonas y luz/sombra de borde.
   Los sprites se procesan una vez y se guardan en caché (cuerpo por pose, arma por ángulo). */
function epx2Arr(a, w, h) {
  const W2 = w * 2, b = new Uint32Array(W2 * h * 2);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const P = a[y * w + x];
      const A = y > 0 ? a[(y - 1) * w + x] : P, D = y < h - 1 ? a[(y + 1) * w + x] : P;
      const C = x > 0 ? a[y * w + x - 1] : P, B = x < w - 1 ? a[y * w + x + 1] : P;
      let p1 = P, p2 = P, p3 = P, p4 = P;
      if (C === A && C !== D && A !== B) p1 = A;
      if (A === B && A !== C && B !== D) p2 = B;
      if (D === C && D !== B && C !== A) p3 = C;
      if (B === D && B !== A && D !== C) p4 = D;
      const o = (y * 2) * W2 + x * 2;
      b[o] = p1; b[o + 1] = p2; b[o + W2] = p3; b[o + W2 + 1] = p4;
    }
  }
  return b;
}
function hdPassArr(a, w, h, opt) {
  opt = opt || {};
  const out = new Uint32Array(a);
  const op = (v) => (v >>> 24) > 120;
  const lum = (v) => (v & 255) * 0.3 + ((v >>> 8) & 255) * 0.59 + ((v >>> 16) & 255) * 0.11;
  const tone = (v, k) => {
    const r = v & 255, g = (v >>> 8) & 255, bl = (v >>> 16) & 255;
    const f = (c) => clamp(Math.round(k > 0 ? c + (255 - c) * k : c * (1 + k)), 0, 255);
    return ((v & 0xff000000) | (f(bl) << 16) | (f(g) << 8) | f(r)) >>> 0;
  };
  const OUT = 0xf2180e14;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, v = a[i];
      const up = y > 0 ? a[i - w] : 0, dn = y < h - 1 ? a[i + w] : 0, lf = x > 0 ? a[i - 1] : 0, rt = x < w - 1 ? a[i + 1] : 0;
      if (!op(v)) {
        if (opt.outline !== false && (op(up) || op(dn) || op(lf) || op(rt))) out[i] = OUT;
        continue;
      }
      let nv = v;
      if (!op(up)) nv = tone(nv, 0.22);
      else if (!op(dn)) nv = tone(nv, -0.22);
      else {
        const L = lum(v);
        if ((op(dn) && dn !== v && lum(dn) > L + 18) || (op(rt) && rt !== v && lum(rt) > L + 18)) nv = tone(nv, -0.28);
      }
      out[i] = nv;
    }
  }
  return out;
}
function readArr(cv) { return new Uint32Array(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.buffer); }
function arrToCanvas(a, w, h) {
  const c = makeCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h);
  new Uint32Array(im.data.buffer).set(a); x.putImageData(im, 0, 0);
  return c;
}
/* lienzo 1x -> lienzo HD (una sola lectura, todo el proceso en memoria) */
function hdify(src, opt) {
  const w = src.width, h = src.height;
  let b = epx2Arr(readArr(src), w, h);
  if (!opt || opt.pass !== false) b = hdPassArr(b, w * 2, h * 2, opt);
  return arrToCanvas(b, w * 2, h * 2);
}
function epx2(src) { return arrToCanvas(epx2Arr(readArr(src), src.width, src.height), src.width * 2, src.height * 2); }
function hdPass(cv, opt) {
  const x = cv.getContext('2d'), im = x.getImageData(0, 0, cv.width, cv.height), a = new Uint32Array(im.data.buffer);
  a.set(hdPassArr(a, cv.width, cv.height, opt)); x.putImageData(im, 0, 0);
  return cv;
}
function cpuCanvas(w, h) { const c = makeCanvas(w, h); return [c, c.getContext('2d', { willReadFrequently: true })]; }

/* cachés */
function lru(max) {
  const m = new Map();
  return {
    get(k) { const v = m.get(k); if (v !== undefined) { m.delete(k); m.set(k, v); } return v; },
    set(k, v) { m.set(k, v); if (m.size > max) m.delete(m.keys().next().value); },
    get size() { return m.size; }
  };
}
const HD_CACHE = new Map();
function hdOf(key, make) {
  let c = HD_CACHE.get(key);
  if (!c) { c = hdify(make()); HD_CACHE.set(key, c); }
  return c;
}
function charHD(d, opt) { return hdify(renderCharCanvas(d, opt)); }

/* cuerpo del luchador (sin brazo delantero ni arma) */
const BODY_HD = lru(1800);
const BODY_W = 32, BODY_H = 34, BODY_AX = 16, BODY_AY = 30;
function bodyHD(d, f, walk, bob, tc, tk, dead) {
  const ws = walk < 0 ? 2 : (walk < 0.5 ? 0 : 1);
  const key = d.id + '|' + (f < 0 ? 0 : 1) + ws + (bob ? 1 : 0) + '|' + (tk || '') + (dead ? 'D' : '');
  let c = BODY_HD.get(key);
  if (!c) {
    const [src, sctx] = cpuCanvas(BODY_W, BODY_H);
    drawChar(sctx, d, { x: BODY_AX, y: BODY_AY, f, walk: ws === 2 ? -1 : (ws === 0 ? 0.25 : 0.75), bob: bob ? 1 : 0, tc, dead });
    c = hdify(src);
    BODY_HD.set(key, c);
  }
  return c;
}

/* armas: misma rotación por cubetas que el modo clásico, procesadas una vez */
const WEAP_HD = lru(4000);
function weaponHD(w, ang, flip, frame) {
  const e = weaponCanvas(w, ang, flip, frame);
  let h = WEAP_HD.get(e);
  if (!h) { h = { c: hdify(e.c), r: e.r }; WEAP_HD.set(e, h); }
  return h;
}
function drawWeaponHD(ctx, w, hx, hy, ang, flip, frame) {
  const h = weaponHD(w, ang, flip, frame), s = h.r * 2 + 1;
  ctx.drawImage(h.c, Math.floor(hx * 2) / 2 - h.r, Math.floor(hy * 2) / 2 - h.r, s, s);
}

/* brazo delantero + arma + mano, a medio píxel (el contexto ya está escalado ×2) */
function drawFrontHD(ctx, d, o) {
  if (d.dummy) return;
  const P = pal(d);
  const f = o.f < 0 ? -1 : 1;
  const [sx, sy] = shoulderPos(d, o.x, o.y, f, o.bob);
  const a = o.armAng, L = o.armLen || 4;
  const ca = Math.cos(a), sa = Math.sin(a);
  const sleeve = SLEEVELESS.has(d.b) ? P.sk : P.c1;
  const tc = o.tc;
  const q = (v) => Math.floor(v * 2) / 2;
  ctx.fillStyle = '#180e14';
  for (let t = 0; t <= L; t += 0.5) ctx.fillRect(q(sx + ca * t) - 1, q(sy + sa * t) - 1, 2, 2);
  for (let t = 0; t <= L; t += 0.5) {
    const col = t < L - 1.5 ? sleeve : P.sk;
    ctx.fillStyle = tc ? tc(col) : col;
    ctx.fillRect(q(sx + ca * t) - 0.5, q(sy + sa * t) - 0.5, 1, 1);
  }
  const hx = sx + ca * L, hy = sy + sa * L;
  const w = d.weapon;
  if (o.wAng !== undefined && w.shape && (w.shape.length || w.bow)) drawWeaponHD(ctx, w, hx, hy, o.wAng, f < 0 && !isGun(w), o.wFrame || 0);
  if (w.id !== 'guantes' && (!w.fist || w.id === 'punos' || w.id === 'mordisco')) {
    const hs = w.fist ? 2 : 1.5, X = q(hx), Y = q(hy);
    ctx.fillStyle = '#180e14'; ctx.fillRect(X - hs / 2 - 0.5, Y - hs / 2 - 0.5, hs + 1, hs + 1);
    ctx.fillStyle = tc ? tc(P.sk) : P.sk; ctx.fillRect(X - hs / 2, Y - hs / 2, hs, hs);
    ctx.fillStyle = tc ? tc(P.skL) : P.skL; ctx.fillRect(X - hs / 2, Y - hs / 2, hs, 0.5);
  }
  return [hx, hy];
}

/* proyectiles lineales (flecha, bala, láser...) por ángulo */
const PROJ_HD = new Map();
function projHD(type, ang) {
  const b = Math.round((((ang % TAU) + TAU) % TAU) / TAU * 32) % 32;
  const key = type + b;
  let c = PROJ_HD.get(key);
  if (c) return c;
  const [src, x] = cpuCanvas(23, 23);
  const A = b / 32 * TAU, ca = Math.cos(A), sa = Math.sin(A);
  const line = (len, col, off) => { x.fillStyle = col; for (let i = 0; i < len; i++) x.fillRect(Math.round(11 - ca * (i + (off || 0))), Math.round(11 - sa * (i + (off || 0))), 1, 1); };
  switch (type) {
    case 'arrow': line(6, '#c9a77a', 1); line(2, '#d9e0e6'); line(1, '#ffffff', 6); break;
    case 'bolt': line(5, '#8a5a2b', 1); line(2, '#ffffff'); break;
    case 'harpoon': line(9, '#8d99a6', 1); line(3, '#ffffff'); break;
    case 'bullet': line(5, '#b08a3a', 1); line(2, '#fff7d0'); break;
    case 'pellet': line(2, '#ffd65a'); break;
    case 'laser': line(6, '#3faa3a'); line(4, '#e8ffd0'); break;
    case 'ice': line(5, '#9fe3ff'); line(2, '#ffffff'); break;
    case 'thorn': line(4, '#6fd36a'); line(1, '#d8ff9a'); break;
    default: line(2, '#3df5ff');
  }
  const glow = type === 'bullet' || type === 'laser' || type === 'pellet' || type === 'mini';
  c = hdify(src, { pass: !glow });
  PROJ_HD.set(key, c);
  return c;
}

/* círculos y anillos con resolución 1/K (el contexto está escalado ×K) */
function fillCircleK(ctx, cx, cy, r, K) {
  if (K === 1) return fillCirclePx(ctx, cx, cy, Math.round(r));
  const R = Math.round(r * K), X = Math.round(cx * K), Y = Math.round(cy * K), inv = 1 / K;
  for (let dy = -R; dy <= R; dy++) {
    const w = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.35);
    ctx.fillRect((X - w) * inv, (Y + dy) * inv, (w * 2 + 1) * inv, inv);
  }
}
function ringK(ctx, cx, cy, r, K) {
  if (K === 1) return ringPx(ctx, cx, cy, r);
  const inv = 1 / K, X = Math.round(cx * K), Y = Math.round(cy * K), R0 = Math.round(r * K);
  for (const RR of [R0, R0 - 1]) {
    if (RR < 1) continue;
    let x = RR, y = 0, err = 1 - RR;
    const p = (a, b) => ctx.fillRect((X + a) * inv, (Y + b) * inv, inv, inv);
    while (x >= y) {
      p(x, y); p(y, x); p(-y, x); p(-x, y); p(-x, -y); p(-y, -x); p(y, -x); p(x, -y);
      y++; if (err < 0) err += 2 * y + 1; else { x--; err += 2 * (y - x) + 1; }
    }
  }
}

/* imágenes de obstáculos y objetos según resolución */
function obsImg(o, biome, K) { const s = obsSprite(o, biome); return K > 1 ? hdOf('o|' + o.type + o.v + biome, () => s.c) : s.c; }
function itemImg(kind, K) { const c = itemSprite(kind); return K > 1 ? hdOf('i|' + kind, () => c) : c; }

/* escala de un canvas pixel art en CSS para que cada pixel ocupe un número entero de pixeles físicos */
function fitPixel(cv, targetCss) {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const n = Math.max(1, Math.round(targetCss * dpr / cv.width));
  cv.style.width = (cv.width * n / dpr) + 'px';
  cv.style.height = (cv.height * n / dpr) + 'px';
}

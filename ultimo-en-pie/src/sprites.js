/* ===== sprites pixel art procedurales =====
   Caja del personaje: 16 x 24 px, ancla en los pies (8, 23). Mira a la derecha por defecto. */
const SLEEVELESS = new Set(['tank', 'boxer', 'barbarian', 'scales']);
const EYE = '#1a1418';

function pal(d) {
  if (d.pal) return d.pal;
  const hc = d.hc || '#3a2a1e', gc = d.gc || '#555', xc = d.xc || '#555';
  d.pal = {
    sk: d.sk, skD: shade(d.sk, -0.2), skL: shade(d.sk, 0.18),
    hr: hc, hrD: shade(hc, -0.25), hrL: shade(hc, 0.25),
    g: gc, gD: shade(gc, -0.28), gL: shade(gc, 0.3),
    c1: d.c1, c1D: shade(d.c1, -0.25), c1L: shade(d.c1, 0.25),
    c2: d.c2, c2D: shade(d.c2, -0.25),
    c3: d.c3, c3D: shade(d.c3, -0.25),
    x: xc, xD: shade(xc, -0.28), xL: shade(xc, 0.25),
    fc: d.fc || hc
  };
  return d.pal;
}

function drawChar(ctx, d, o) {
  const P = pal(d), B = BUILDS[d.bd];
  const f = o.f < 0 ? -1 : 1;
  const ox = Math.round(o.x) - 8, oy = Math.round(o.y) - 23;
  const ub = o.bob || 0;
  const tc = o.tc;
  let cur = '';
  const R = (x, y, w, h, c) => {
    if (c !== cur) { ctx.fillStyle = tc ? tc(c) : c; cur = c; }
    ctx.fillRect(ox + (f > 0 ? x : 16 - x - w), oy + y, w, h);
  };
  const U = (x, y, w, h, c) => R(x, y + ub, w, h, c);
  if (d.dummy) return drawDummy(R, U);
  const tl = B.tl, tr = B.tr, tw = tr - tl + 1;
  const wk = o.walk;
  let lA = 0, lB = 0, sA = 0, sB = 0, swing = 0;
  if (wk >= 0) { const ph = wk < 0.5; lA = ph ? -1 : 0; lB = ph ? 0 : -1; sA = ph ? 1 : -1; sB = -sA; swing = ph ? -1 : 1; }

  /* --- extras traseros --- */
  for (const e of d.x) {
    if (e === 'cape') {
      U(tl - 1, 10, 3, 9, P.x); U(tl - 2, 12, 1, 8, P.xD); U(tl, 10, tw, 1, P.xD);
      if (wk >= 0) U(tl - 3, 16 + (swing > 0 ? 1 : 0), 1, 3, P.xD);
    } else if (e === 'quiver') {
      U(tl - 2, 8, 2, 8, P.x); U(tl - 2, 8, 1, 8, P.xD); U(tl - 2, 6, 1, 2, '#ffffff'); U(tl - 1, 7, 1, 1, '#e8402f'); U(tl - 1, 6, 1, 1, '#f2f2f2');
    } else if (e === 'backpack') {
      U(tl - 3, 11, 3, 5, P.x); U(tl - 3, 11, 3, 1, P.xL); U(tl - 3, 14, 3, 1, P.xD);
    } else if (e === 'delivery') {
      U(tl - 6, 7, 6, 8, P.x); U(tl - 6, 7, 6, 1, P.xL); U(tl - 6, 14, 6, 1, P.xD); U(tl - 5, 10, 4, 1, '#ffffff'); U(tl - 1, 9, 1, 5, '#1d1d24');
    } else if (e === 'fueltank') {
      U(tl - 3, 10, 3, 7, '#c0392b'); U(tl - 3, 10, 3, 1, '#e8705f'); U(tl - 2, 9, 1, 1, '#7d8792'); U(tl - 3, 16, 3, 1, '#7a1f1a');
    } else if (e === 'tail') {
      U(tl - 2, 15, 2, 1, P.x); U(tl - 3, 16, 1, 2, P.x); U(tl - 4, 17, 2, 1, P.x);
      if (d.g === 'horns2') { U(tl - 6, 16, 2, 1, P.xD); U(tl - 5, 15, 1, 3, P.xD); }
      else U(tl - 5, 16, 2, 2, P.xL);
    } else if (e === 'scarf') {
      U(tl - 3, 10, 3, 1, P.x); U(tl - 4, 11, 2, 1, P.x); if (wk >= 0) U(tl - 5, 11 + (swing > 0 ? 1 : 0), 1, 1, P.xD);
    }
  }

  /* --- brazo trasero --- */
  const sleeve = SLEEVELESS.has(d.b) ? P.sk : (d.b === 'crop' ? P.sk : P.c1);
  U(tl - 1, 11 + (swing > 0 ? 1 : 0), 2, 4, shade(sleeve, -0.22));
  U(tl - 1, 15 + (swing > 0 ? 1 : 0), 2, 1, P.skD);

  /* --- piernas --- */
  let pants = P.c2, shoe = '#2a2328', bare = false;
  switch (d.b) {
    case 'boxer': case 'barbarian': case 'jersey': case 'hawaii': pants = P.sk; break;
    case 'scales': pants = P.c1; shoe = P.skD; bare = true; break;
    case 'fur': pants = P.c1D; shoe = shade(P.c1, -0.45); break;
    case 'wraps': pants = P.c1; shoe = P.c2; break;
    case 'robot': pants = P.c2; shoe = P.c1D; break;
    case 'space': pants = P.c1; shoe = P.c2; break;
    case 'raincoat': shoe = P.c1D; break;
    case 'track': case 'firefighter': pants = P.c1; break;
    case 'clown': shoe = '#d22b2b'; break;
    case 'overall': pants = P.c1; shoe = '#4a3520'; break;
    case 'patched': pants = P.c2; shoe = '#5a3a1e'; break;
  }
  const pD = shade(pants, -0.22);
  const LA = B.legs[0], LB = B.legs[1];
  R(LA[0] + sA, 17 + lA, LA[1], 4, pD);
  R(LB[0] + sB, 17 + lB, LB[1], 4, pants);
  if (d.b === 'jersey') { R(LA[0] + sA, 19 + lA, LA[1], 2, P.c1D); R(LB[0] + sB, 19 + lB, LB[1], 2, P.c1); }
  if (d.b === 'barbarian') { R(LA[0] + sA, 19 + lA, LA[1], 2, P.c2); R(LB[0] + sB, 19 + lB, LB[1], 2, P.c2); }
  if (d.b === 'track' || d.b === 'firefighter') R(LB[0] + sB + LB[1] - 1, 17 + lB, 1, 4, P.c3);
  const big = d.b === 'clown' ? 1 : 0;
  R(LA[0] + sA - big, 21 + lA, LA[1] + big, 2, shade(shoe, -0.15));
  R(LB[0] + sB, 21 + lB, LB[1] + 1 + big, 2, shoe);
  if (bare) { R(LB[0] + sB + LB[1], 22 + lB, 1, 1, P.skL); }

  /* --- torso --- */
  torso(U, d, P, tl, tr, tw, wk);

  /* --- extras delanteros --- */
  for (const e of d.x) {
    if (e === 'pads') { U(tl - 1, 10, 3, 2, P.x); U(tr - 1, 10, 3, 2, P.xL); U(tr - 1, 11, 3, 1, P.x); }
    else if (e === 'bandolier') { for (let i = 0; i < 5; i++) U(tl + 1 + i, 11 + i, 1, 1, P.x); U(tl + 2, 12, 1, 1, '#4a4a56'); U(tl + 4, 14, 1, 1, '#4a4a56'); }
    else if (e === 'chain') { U(tr - 5, 11, 4, 1, P.x); U(tr - 3, 12, 2, 2, P.x); U(tr - 3, 12, 1, 1, '#fff3b0'); }
    else if (e === 'scarf') { U(tl, 10, tw, 2, P.x); U(tl, 11, tw, 1, P.xD); }
  }

  /* --- cabeza --- */
  head(U, d, P, o.dead);
}

function torso(U, d, P, tl, tr, tw, wk) {
  const c1 = P.c1, c1D = P.c1D, c1L = P.c1L;
  switch (d.b) {
    case 'tunic':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl, 15, tw, 1, P.c3); U(tr - 3, 10, 2, 1, P.sk); break;
    case 'armor':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl + 2, 11, tw - 4, 1, c1L); U(tl, 13, tw, 1, P.c2); U(tl, 15, tw, 1, P.c3);
      U(tl - 1, 10, 2, 2, c1L); U(tr, 10, 2, 2, c1L); break;
    case 'robe':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl, 14, tw, 1, P.c3);
      U(tl, 17, tw, 2, c1); U(tl - 1, 19, tw + 2, 2, c1D); U(tl - 1, 20, tw + 2, 1, P.c3); U(tr - 3, 10, 2, 1, P.c3); break;
    case 'bata':
      U(tl, 10, tw, 10, c1); U(tl, 10, 1, 10, c1D);
      for (let y = 11; y < 20; y += 3) for (let x = tl + ((y / 3) & 1); x <= tr; x += 2) U(x, y, 1, 1, P.c3);
      U(tr - 3, 10, 2, 1, '#f4f4f0'); break;
    case 'dress':
      U(tl, 10, tw, 5, c1); U(tl, 10, 1, 5, c1D);
      U(tl - 1, 15, tw + 2, 2, c1); U(tl - 2, 17, tw + 4, 2, c1); U(tl - 3, 19, tw + 6, 2, c1D);
      U(tl - 3, 20, tw + 6, 1, P.c3);
      for (let x = tl - 1; x < tr + 2; x += 3) U(x, 18, 1, 1, P.c3);
      U(tr - 2, 10, 2, 1, P.sk); break;
    case 'jacket':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tr - 2, 10, 2, 6, P.c2); U(tr - 3, 10, 1, 3, c1D); U(tr - 4, 12, 1, 1, P.c3); U(tl, 16, tw, 1, c1D); break;
    case 'tank':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl + 2, 10, tw - 4, 1, P.sk); U(tl, 15, tw, 1, P.c3); break;
    case 'boxer':
      U(tl, 10, tw, 6, P.sk); U(tl, 10, 1, 6, P.skD); U(tl + 2, 12, tw - 3, 1, P.skD); U(tl + 3, 14, 1, 1, P.skD); U(tl + 5, 14, 1, 1, P.skD);
      U(tl, 16, tw, 1, P.c3); U(tl, 17, tw, 2, c1); U(tl, 17, 1, 2, c1D); break;
    case 'barbarian':
      U(tl, 10, tw, 6, P.sk); U(tl, 10, 1, 6, P.skD); U(tl + 2, 12, tw - 3, 1, P.skD);
      for (let i = 0; i < tw - 1; i++) U(tl + i, 10 + Math.floor(i * 5 / tw), 1, 1, P.c2);
      U(tl, 16, tw, 1, P.c3); U(tl, 17, tw, 2, c1); U(tl + 1, 19, tw - 2, 1, c1D); break;
    case 'suit':
      U(tl, 10, tw, 7, c1); U(tr - 3, 10, 2, 3, '#f4f4f0'); U(tr - 3, 11, 1, 4, P.c3); U(tl, 10, 1, 7, shade(c1, 0.12)); break;
    case 'coat':
      U(tl, 10, tw, 10, c1); U(tl, 10, 1, 10, shade(c1, -0.12)); U(tr - 2, 10, 2, 5, P.c2); U(tl + 2, 13, 2, 1, shade(c1, -0.12)); U(tl + 3, 12, 1, 1, P.c3); break;
    case 'hoodie':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl + 2, 14, tw - 3, 2, c1D); U(tr - 3, 11, 1, 2, P.c3); U(tl - 1, 9, 3, 3, c1D); U(tl, 16, tw, 1, c1D); break;
    case 'kimono':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tr - 2, 10, 1, 1, P.c3); U(tr - 3, 11, 1, 1, P.c3); U(tr - 4, 12, 1, 1, P.c3); U(tl, 14, tw, 2, P.c3); break;
    case 'ninja':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl, 14, tw, 1, P.c3); break;
    case 'fur': {
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D);
      for (let y = 10; y < 17; y++) for (let x = tl; x <= tr; x++) if (hash2(x, y, 7) > 0.72) U(x, y, 1, 1, c1L);
      U(tl, 16, tw, 1, c1D); break;
    }
    case 'wraps':
      for (let y = 10; y < 17; y++) U(tl, y, tw, 1, (y & 1) ? c1 : P.c2);
      U(tl + 2, 13, 1, 1, P.c3); U(tr - 2, 11, 1, 1, P.c3); break;
    case 'apron':
      U(tl, 10, tw, 7, P.c2); U(tl, 10, 1, 7, P.c2D); U(tr - 4, 11, 3, 2, c1); U(tl + 1, 13, tw - 1, 6, c1); U(tl + 1, 13, tw - 1, 1, shade(c1, -0.1));
      U(tl + 3, 15, 1, 1, P.c3); U(tl + 4, 16, 2, 1, P.c3); U(tr - 2, 17, 1, 1, P.c3); U(tl + 2, 14, 1, 1, P.c3D); break;
    case 'chef':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, shade(c1, -0.1)); U(tr - 4, 10, 3, 1, P.c3);
      U(tr - 2, 12, 1, 1, P.c2); U(tr - 2, 14, 1, 1, P.c2); U(tr - 4, 12, 1, 1, P.c2); U(tr - 4, 14, 1, 1, P.c2); break;
    case 'space':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, shade(c1, -0.15)); U(tr - 4, 11, 3, 2, P.c3); U(tr - 3, 11, 1, 1, '#ffffff'); U(tl, 15, tw, 1, P.c2); break;
    case 'robot':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl + 1, 11, 1, 1, P.c2); U(tr - 1, 11, 1, 1, P.c2); U(tr - 4, 12, 3, 2, '#2a2f36'); U(tr - 3, 12, 1, 1, P.c3); U(tl, 15, tw, 1, P.c2); break;
    case 'rags':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl + 2, 13, 2, 2, P.sk); U(tr - 2, 12, 1, 2, P.c3);
      for (let x = tl; x <= tr; x += 2) U(x, 16, 1, 1, P.c2); break;
    case 'scales':
      U(tl, 10, tw, 6, P.sk); U(tl, 10, 1, 6, P.skD); U(tl + 2, 12, tw - 3, 1, P.skD); U(tl, 15, tw, 1, P.c3); U(tl, 16, tw, 1, c1); break;
    case 'clown':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl - 1, 10, tw + 2, 1, '#ffffff');
      U(tl + 2, 12, 1, 1, P.c3); U(tr - 2, 13, 1, 1, P.c3); U(tl + 4, 15, 1, 1, P.c3); U(tr - 3, 11, 2, 2, '#ffffff'); break;
    case 'jersey':
      U(tl, 10, tw, 6, c1); U(tl, 10, 1, 6, c1D); U(tl + 2, 12, 2, 3, P.c3); U(tl, 16, tw, 2, P.c2); U(tr - 3, 10, 2, 1, P.c3); break;
    case 'crop':
      U(tl, 10, tw, 3, c1); U(tl, 13, tw, 2, P.sk); U(tl, 13, 1, 2, P.skD); U(tl, 15, tw, 2, P.c2); U(tl + 1, 11, 2, 1, P.c3); break;
    case 'cardigan':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tr - 3, 10, 2, 1, '#f4f4f0');
      U(tr - 2, 12, 1, 1, P.c3); U(tr - 2, 14, 1, 1, P.c3); U(tl + 1, 15, 2, 1, c1D); break;
    case 'hawaii':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D);
      for (let y = 11; y < 16; y += 2) for (let x = tl + (y & 2 ? 1 : 0); x <= tr; x += 3) U(x, y, 1, 1, y % 4 === 1 ? P.c3 : '#ffffff');
      U(tl, 17, tw, 2, P.c2); break;
    case 'patched':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl + 2, 12, 2, 2, P.c2); U(tl + 2, 12, 1, 1, '#f2e6c0');
      U(tr, 10, 1, 1, P.c3); U(tl - 1, 15, 1, 2, P.c3); U(tl, 16, tw, 1, '#7a4a24'); break;
    case 'raincoat':
      U(tl, 10, tw, 10, c1); U(tl, 10, 1, 10, c1D); U(tr - 2, 11, 1, 1, P.c3); U(tr - 2, 14, 1, 1, P.c3); U(tr - 2, 17, 1, 1, P.c3); U(tl, 19, tw, 1, c1D); break;
    case 'kungfu':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); for (let y = 11; y < 16; y += 2) U(tr - 4, y, 3, 1, P.c3); U(tl, 16, tw, 1, P.c2); break;
    case 'firefighter':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tl, 13, tw, 1, P.c3); U(tl, 16, tw, 1, P.c3); U(tr - 3, 10, 2, 1, '#5a5f6b'); break;
    case 'overall':
      U(tl, 10, tw, 7, P.c2); U(tl, 10, 1, 7, P.c2D); U(tl + 1, 12, tw - 2, 5, c1); U(tl + 1, 10, 1, 2, c1); U(tr - 1, 10, 1, 2, c1); U(tr - 3, 13, 1, 1, P.c3); break;
    case 'scrubs':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D); U(tr - 3, 10, 2, 2, P.sk); U(tl + 1, 13, 2, 1, c1D); break;
    case 'flannel':
      U(tl, 10, tw, 7, c1); U(tl, 10, 1, 7, c1D);
      for (let y = 10; y < 17; y++) for (let x = tl; x <= tr; x++) if ((x % 3) === 0 || (y % 3) === 1) U(x, y, 1, 1, (x % 3 === 0 && y % 3 === 1) ? P.c3 : shade(c1, -0.3));
      U(tl, 16, tw, 1, '#4a3520'); break;
    default:
      U(tl, 10, tw, 7, c1);
  }
}

function head(U, d, P, dead) {
  const g = d.g;
  /* forma de la cabeza */
  if (g === 'robot') {
    U(4, 2, 8, 8, P.sk); U(4, 2, 1, 8, P.skD); U(5, 2, 6, 1, shade(P.sk, 0.2)); U(3, 5, 1, 2, P.g); U(8, 0, 1, 2, '#9aa0a6'); U(7, -1, 3, 1, P.c3);
  } else if (g === 'wolf') {
    U(4, 3, 8, 7, P.sk); U(4, 3, 1, 7, P.skD); U(10, 6, 3, 3, P.skL); U(13, 6, 1, 1, EYE); U(11, 9, 2, 1, '#ffffff');
    U(5, 1, 2, 2, P.sk); U(8, 1, 2, 2, P.sk); U(6, 2, 1, 1, '#e8a0a8');
  } else if (g === 'yeti') {
    U(3, 2, 10, 8, P.sk); U(3, 3, 1, 6, shade(P.sk, -0.12)); U(7, 5, 5, 4, '#9fb7cc'); U(2, 4, 1, 3, P.sk);
  } else {
    U(5, 3, 6, 7, P.sk); U(4, 4, 8, 5, P.sk); U(4, 4, 1, 5, P.skD); U(5, 9, 3, 1, P.skD); U(6, 6, 1, 2, P.skD); U(12, 7, 1, 1, P.sk);
  }
  /* ojos y boca */
  const hidesFace = g === 'helm' || g === 'moto';
  const fa = d.fa;
  if (!hidesFace) {
    if (dead) {
      U(7, 6, 2, 1, EYE); U(10, 6, 2, 1, EYE); U(9, 8, 2, 1, '#5a0a14'); U(10, 9, 1, 1, '#e86a8a');
    } else if (fa.includes('alien')) {
      U(7, 5, 2, 3, '#101014'); U(10, 5, 2, 3, '#101014'); U(7, 5, 1, 1, '#ffffff'); U(10, 5, 1, 1, '#ffffff');
    } else if (fa.includes('skull')) {
      U(7, 5, 2, 2, '#14101a'); U(10, 5, 2, 2, '#14101a'); U(8, 6, 1, 1, '#ff3b3b'); U(11, 6, 1, 1, '#ff3b3b'); U(9, 7, 1, 1, '#14101a'); U(8, 8, 4, 1, '#f4f0e0'); U(9, 8, 1, 1, '#14101a'); U(11, 8, 1, 1, '#14101a');
    } else if (fa.includes('glow')) {
      U(8, 6, 1, 1, P.c3 === '#7a6a4a' ? '#7dff6a' : P.c3); U(10, 6, 1, 1, P.c3 === '#7a6a4a' ? '#7dff6a' : P.c3);
      if (g !== 'wolf') U(9, 8, 2, 1, P.skD);
    } else if (fa.includes('buttoneyes')) {
      U(8, 5, 2, 2, EYE); U(11, 5, 1, 2, EYE); U(7, 8, 5, 1, '#5a3a1e'); U(8, 7, 1, 1, '#5a3a1e'); U(10, 9, 1, 1, '#5a3a1e');
    } else if (g !== 'yeti') {
      U(8, 6, 1, 1, EYE); U(10, 6, 1, 1, EYE); U(9, 8, 2, 1, P.skD);
    } else {
      U(8, 6, 1, 1, EYE); U(10, 6, 1, 1, EYE); U(9, 8, 2, 1, '#5a6f86');
    }
    if (!dead) for (const k of fa) {
      switch (k) {
        case 'angry': U(8, 5, 1, 1, P.hrD); U(10, 5, 2, 1, P.hrD); break;
        case 'eyepatch': U(9, 5, 3, 2, '#14101a'); U(4, 5, 5, 1, '#14101a'); break;
        case 'glasses': U(7, 6, 5, 1, '#2a2a33'); U(8, 6, 1, 1, '#bfe6ff'); U(10, 6, 1, 1, '#bfe6ff'); break;
        case 'shades': U(7, 5, 5, 2, '#101014'); U(10, 5, 1, 1, '#5a5a66'); U(4, 5, 3, 1, '#101014'); break;
        case 'goggles': U(7, 5, 5, 2, '#3a3a44'); U(8, 5, 1, 1, '#7fd3ff'); U(10, 5, 1, 1, '#7fd3ff'); U(4, 5, 3, 1, '#3a3a44'); break;
        case 'visor': U(6, 5, 6, 2, '#14101a'); U(7, 6, 5, 1, P.c3); U(11, 5, 1, 1, '#ff9a9a'); break;
        case 'beard': U(5, 8, 7, 2, P.fc); U(6, 10, 5, 1, P.fc); U(9, 8, 2, 1, shade(P.fc, -0.3)); break;
        case 'mustache': U(8, 8, 4, 1, P.fc); break;
        case 'scar': U(10, 4, 1, 1, '#b0303a'); U(9, 5, 1, 1, '#b0303a'); U(10, 7, 1, 1, '#b0303a'); break;
        case 'paint': U(7, 7, 5, 1, P.fc); break;
        case 'mask': U(7, 7, 5, 3, '#cfe8e0'); U(4, 7, 3, 1, '#9fc9be'); break;
        case 'menpo': U(7, 7, 5, 3, '#8a1f2b'); U(8, 8, 3, 1, '#f2f2f2'); break;
        case 'clown': U(12, 7, 1, 1, '#ff2a2a'); U(11, 7, 1, 1, '#ff2a2a'); U(8, 8, 3, 1, '#d12a2a'); U(7, 7, 1, 1, '#d12a2a'); U(8, 5, 1, 1, '#2f6fe8'); U(10, 5, 1, 1, '#2f6fe8'); break;
        case 'fangs': U(9, 8, 2, 1, '#5a0a14'); U(9, 9, 1, 1, '#ffffff'); U(11, 9, 1, 1, '#ffffff'); break;
        case 'stitch': U(7, 8, 5, 1, '#3a2a2a'); U(8, 7, 1, 3, '#3a2a2a'); U(10, 7, 1, 3, '#3a2a2a'); U(10, 6, 1, 1, '#d9d0b0'); break;
        case 'implant': U(10, 6, 1, 1, '#3df5ff'); U(10, 5, 2, 1, '#9aa0a6'); U(11, 7, 1, 1, '#9aa0a6'); break;
        case 'nosering': U(12, 8, 1, 1, '#f2c14e'); U(11, 8, 1, 1, '#f2c14e'); break;
      }
    }
  }
  /* pelo */
  const h = d.h;
  const short = () => { U(5, 2, 6, 1, P.hr); U(4, 3, 8, 2, P.hr); U(4, 5, 2, 2, P.hr); U(6, 2, 3, 1, P.hrL); };
  switch (h) {
    case 'short': short(); break;
    case 'long': short(); U(3, 4, 3, 8, P.hr); U(3, 11, 2, 1, P.hrD); U(3, 5, 1, 6, P.hrD); break;
    case 'ponytail': short(); U(2, 4, 2, 2, P.hr); U(1, 5, 2, 4, P.hr); U(1, 9, 1, 1, P.hrD); break;
    case 'braids': short(); U(3, 5, 2, 7, P.hr); U(3, 6, 1, 1, P.hrD); U(3, 8, 1, 1, P.hrD); U(3, 10, 1, 1, P.hrD); U(3, 12, 2, 1, '#c0392b'); break;
    case 'bun': short(); U(4, 0, 4, 3, P.hr); U(5, 0, 2, 1, P.hrL); break;
    case 'afro': U(3, 0, 10, 6, P.hr); U(2, 1, 12, 4, P.hr); U(4, 6, 2, 2, P.hr); U(5, 0, 4, 1, P.hrL); U(3, 4, 1, 2, P.hrD); break;
    case 'wild': short(); U(4, 0, 1, 2, P.hr); U(7, 0, 1, 2, P.hr); U(10, 1, 1, 1, P.hr); U(2, 2, 2, 2, P.hr); U(12, 2, 2, 1, P.hr); U(3, 6, 1, 2, P.hr); break;
    case 'spiky': short(); U(5, 1, 1, 1, P.hr); U(7, 0, 1, 2, P.hr); U(9, 1, 1, 1, P.hr); U(11, 2, 1, 1, P.hr); break;
    case 'messy': short(); U(3, 3, 1, 2, P.hr); U(10, 2, 2, 1, P.hr); U(12, 4, 1, 1, P.hr); break;
    case 'slick': U(4, 2, 8, 3, P.hr); U(4, 5, 2, 3, P.hr); U(9, 5, 1, 1, P.hr); U(6, 3, 3, 1, P.hrL); break;
    case 'side': U(4, 4, 2, 3, P.hrD); U(6, 2, 6, 2, P.hr); U(9, 4, 4, 1, P.hr); U(11, 5, 2, 1, P.hr); U(7, 2, 3, 1, P.hrL); break;
    case 'baldside': U(4, 5, 2, 3, P.hr); U(5, 4, 1, 1, P.hr); break;
  }
  /* tocado */
  switch (g) {
    case 'helm':
      U(4, 2, 8, 8, P.g); U(4, 2, 1, 8, P.gD); U(6, 3, 4, 1, P.gL); U(7, 6, 5, 1, '#14101a'); U(10, 8, 1, 1, P.gD); U(11, 8, 1, 1, P.gD);
      U(6, 0, 4, 2, d.c3); U(4, 1, 2, 2, shade(d.c3, -0.2)); break;
    case 'horns':
      U(4, 2, 8, 3, P.g); U(4, 4, 8, 1, P.gD); U(6, 2, 3, 1, P.gL); U(9, 5, 1, 2, P.g);
      U(2, 1, 2, 1, '#efe6d0'); U(2, 0, 1, 1, '#efe6d0'); U(12, 1, 2, 1, '#efe6d0'); U(13, 0, 1, 1, '#efe6d0'); break;
    case 'hood':
      U(4, 2, 8, 3, P.g); U(3, 3, 3, 8, P.g); U(4, 9, 4, 2, P.g); U(3, 4, 1, 6, P.gD); U(2, 2, 2, 2, P.g); U(6, 2, 4, 1, P.gL);
      if (d.id === 'raiz') { U(5, 1, 1, 1, '#a8d06a'); U(9, 2, 1, 1, '#a8d06a'); } break;
    case 'wolfhood':
      U(4, 2, 8, 3, P.g); U(3, 3, 3, 8, P.g); U(3, 4, 1, 6, P.gD); U(5, 0, 2, 2, P.g); U(9, 0, 2, 2, P.g); U(10, 2, 3, 2, P.gL); U(11, 2, 1, 1, EYE); U(13, 3, 1, 1, '#14101a'); break;
    case 'crown':
      U(5, 1, 6, 2, P.g); U(5, 0, 1, 1, P.g); U(7, -1, 2, 2, P.g); U(10, 0, 1, 1, P.g); U(7, 1, 2, 1, '#b0172e'); U(5, 2, 6, 1, P.gD); break;
    case 'cowboy':
      U(2, 3, 12, 1, P.gD); U(5, 0, 6, 3, P.g); U(5, 2, 6, 1, '#3a2414'); U(7, 0, 2, 1, P.gD); break;
    case 'cap':
      U(4, 2, 8, 3, P.g); U(11, 4, 3, 1, P.gD); U(7, 1, 2, 1, P.g); U(5, 2, 3, 1, P.gL); break;
    case 'capB':
      U(4, 2, 8, 3, P.g); U(2, 4, 3, 1, P.gD); U(7, 1, 2, 1, P.g); U(8, 3, 2, 1, '#1d1d24'); break;
    case 'ninja':
      U(4, 2, 8, 8, P.g); U(4, 2, 1, 8, shade(P.g, -0.2)); U(7, 5, 5, 2, P.sk); U(8, 6, 1, 1, EYE); U(10, 6, 1, 1, EYE); U(8, 5, 1, 1, '#14101a');
      U(2, 5, 2, 1, d.c3); U(1, 6, 2, 1, d.c3); break;
    case 'pirate':
      U(2, 3, 12, 1, P.g); U(4, 1, 8, 2, P.g); U(7, 0, 2, 1, P.g); U(7, 1, 2, 1, '#f4f0e0'); U(2, 3, 1, 1, '#f2c14e'); U(13, 3, 1, 1, '#f2c14e'); break;
    case 'antenna':
      U(8, -1, 1, 4, '#9aa0a6'); U(7, -2, 3, 2, P.g); U(7, -2, 1, 1, '#ffffff'); break;
    case 'headphones':
      U(5, 1, 6, 1, P.g); U(4, 2, 1, 2, P.g); U(4, 4, 3, 4, P.g); U(5, 5, 1, 2, d.c3); break;
    case 'luchador':
      U(4, 2, 8, 8, P.g); U(4, 2, 1, 8, shade(P.g, -0.2)); U(7, 5, 2, 2, '#ffffff'); U(10, 5, 2, 2, '#ffffff'); U(8, 6, 1, 1, EYE); U(10, 6, 1, 1, EYE);
      U(5, 3, 5, 1, d.c3); U(6, 4, 1, 1, d.c3); U(8, 4, 1, 1, d.c3); U(9, 8, 2, 1, P.sk); U(5, 7, 2, 1, d.c3); break;
    case 'chef':
      U(5, -3, 6, 5, '#ffffff'); U(4, -3, 8, 2, '#ffffff'); U(5, 2, 6, 1, '#d8d8d0'); U(4, -2, 1, 2, '#e4e4dc'); break;
    case 'beanie':
      U(4, 2, 8, 3, P.g); U(4, 4, 8, 1, P.gD); U(6, 0, 2, 2, '#ffffff'); U(5, 2, 2, 1, P.gL); break;
    case 'boina':
      U(4, 2, 8, 2, P.g); U(5, 1, 6, 1, P.g); U(8, 0, 1, 1, P.g); U(12, 3, 1, 1, P.g); U(4, 3, 8, 1, P.gD); break;
    case 'bucket':
      U(3, 3, 10, 1, P.g); U(5, 1, 6, 2, P.g); U(5, 2, 6, 1, '#d2283c'); U(3, 3, 1, 1, P.gD); break;
    case 'mummy':
      U(4, 4, 8, 1, P.g); U(4, 7, 3, 1, P.g); U(4, 2, 7, 1, P.g); U(2, 5, 2, 1, P.sk); U(1, 6, 2, 1, P.g); break;
    case 'kabuto':
      U(4, 1, 8, 4, P.g); U(3, 4, 3, 4, P.g); U(4, 1, 1, 4, shade(P.g, -0.2)); U(6, -1, 1, 2, d.c3); U(10, -1, 1, 2, d.c3); U(7, 0, 3, 1, d.c3); U(5, 2, 4, 1, shade(P.g, 0.2)); break;
    case 'space':
      U(3, 1, 10, 1, '#dfe8f0'); U(2, 2, 1, 8, '#dfe8f0'); U(13, 2, 1, 8, '#dfe8f0'); U(3, 10, 10, 1, '#b8c4d0'); U(11, 3, 1, 2, '#ffffff'); U(10, 2, 1, 1, '#ffffff'); break;
    case 'surgcap':
      U(4, 2, 8, 3, P.g); U(4, 4, 8, 1, P.gD); U(5, 2, 3, 1, P.gL); break;
    case 'firehelm':
      U(4, 1, 8, 3, P.g); U(3, 3, 10, 1, P.gD); U(1, 4, 4, 1, P.gD); U(10, 2, 1, 1, '#f2c14e'); U(6, 1, 3, 1, P.gL); break;
    case 'mining':
      U(4, 1, 8, 3, P.g); U(3, 3, 10, 1, P.gD); U(11, 1, 2, 2, '#fff3b0'); U(6, 1, 3, 1, P.gL); break;
    case 'moto':
      U(3, 2, 10, 8, P.g); U(4, 1, 8, 1, P.g); U(3, 2, 1, 8, P.gD); U(8, 4, 5, 3, '#1d2a3a'); U(11, 4, 1, 1, '#7fd3ff'); U(5, 2, 3, 1, P.gL); U(4, 8, 4, 1, '#ffffff'); break;
    case 'souwester':
      U(3, 3, 11, 1, P.g); U(4, 1, 8, 2, P.g); U(2, 4, 3, 3, P.g); U(2, 6, 3, 1, P.gD); U(5, 1, 3, 1, P.gL); break;
    case 'straw':
      U(1, 3, 14, 1, P.g); U(4, 1, 8, 2, P.g); U(4, 2, 8, 1, '#a0302a'); U(0, 3, 1, 1, '#c9a43a'); U(15, 3, 1, 1, '#c9a43a'); U(3, 4, 1, 1, '#c9a43a'); break;
    case 'horns2':
      U(5, 1, 1, 2, P.g); U(4, 0, 1, 1, P.g); U(10, 1, 1, 2, P.g); U(11, 0, 1, 1, P.g); break;
    case 'bullhorns':
      U(3, 2, 2, 1, P.g); U(1, 0, 2, 2, P.g); U(1, -1, 1, 1, P.g); U(11, 2, 3, 1, P.g); U(13, 0, 2, 2, P.g); U(14, -1, 1, 1, P.g); U(3, 4, 1, 2, P.sk); break;
    case 'flower':
      U(3, 2, 3, 3, P.g); U(4, 3, 1, 1, '#ffd65a'); U(6, 1, 1, 1, P.gD); break;
    case 'fins':
      U(3, 4, 2, 3, P.g); U(2, 3, 1, 2, P.g); U(2, 6, 1, 1, P.g); break;
    case 'elf':
      U(3, 5, 1, 1, P.sk); U(2, 4, 1, 1, P.sk); U(5, 2, 6, 1, P.g); U(10, 2, 1, 1, '#f2c14e'); break;
  }
}

function drawDummy(R, U) {
  R(7, 13, 2, 10, '#7a4a24'); R(5, 22, 6, 1, '#5a3418');
  U(2, 10, 12, 2, '#7a4a24'); U(4, 8, 8, 7, '#d9c48a'); U(4, 8, 1, 7, '#b9a46a');
  U(6, 10, 4, 3, '#d2283c'); U(7, 11, 2, 1, '#ffffff');
  U(5, 2, 6, 6, '#d9c48a'); U(5, 2, 1, 6, '#b9a46a'); U(7, 4, 1, 1, '#3a2a1e'); U(9, 4, 1, 1, '#3a2a1e'); U(7, 6, 3, 1, '#3a2a1e');
  U(4, 1, 8, 1, '#c9a43a');
}

/* ===== brazo delantero + arma (en espacio de mundo) ===== */
function shoulderPos(d, x, y, f, bob) {
  const B = BUILDS[d.bd];
  const ox = Math.round(x) - 8, oy = Math.round(y) - 23 + (bob || 0);
  return [f > 0 ? ox + B.tr + 0.5 : ox + 15 - B.tr + 0.5, oy + 11.5];
}

function drawFront(ctx, d, o) {
  if (d.dummy) return;
  const P = pal(d);
  const f = o.f < 0 ? -1 : 1;
  const [sx, sy] = shoulderPos(d, o.x, o.y, f, o.bob);
  const a = o.armAng, L = o.armLen || 4;
  const ca = Math.cos(a), sa = Math.sin(a);
  const sleeve = SLEEVELESS.has(d.b) ? P.sk : P.c1;
  const tc = o.tc;
  for (let t = 0; t <= L; t += 1) {
    ctx.fillStyle = tc ? tc(t < L - 1.5 ? sleeve : P.sk) : (t < L - 1.5 ? sleeve : P.sk);
    ctx.fillRect(Math.floor(sx + ca * t) - 1, Math.floor(sy + sa * t) - 1, 2, 2);
  }
  const hx = sx + ca * L, hy = sy + sa * L;
  const w = d.weapon;
  if (o.wAng !== undefined && w.shape && (w.shape.length || w.bow)) {
    drawWeaponAt(ctx, w, hx, hy, o.wAng, f < 0 && !isGun(w), o.wFrame || 0);
  }
  if (!w.fist || w.id === 'punos' || w.id === 'mordisco') {
    ctx.fillStyle = tc ? tc(P.sk) : P.sk;
    if (w.id !== 'guantes') ctx.fillRect(Math.floor(hx) - 1, Math.floor(hy) - 1, w.fist ? 3 : 2, w.fist ? 3 : 2);
  }
  return [hx, hy];
}
function isGun(w) { return w.k === 'proj' || w.k === 'beam' || w.k === 'cont' || w.k === 'lob' || w.k === 'wave'; }

const WCACHE = new Map();
const NB = 48;
function weaponCanvas(w, ang, flip, frame) {
  let b = Math.round(((ang % TAU) + TAU) % TAU / TAU * NB) % NB;
  const key = w.id + '|' + b + '|' + (flip ? 1 : 0) + '|' + frame;
  let e = WCACHE.get(key);
  if (e) return e;
  let ext = 4;
  for (const p of w.shape) ext = Math.max(ext, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2]), Math.abs(p[3]));
  if (w.bow) ext = 8;
  const Rr = Math.ceil(ext) + 3, size = Rr * 2 + 1;
  const c = makeCanvas(size, size);
  const x = c.getContext('2d');
  const A = b / NB * TAU, ca = Math.cos(A), sa = Math.sin(A);
  const plot = (u, v, col) => {
    const vv = flip ? -v : v;
    x.fillStyle = col;
    x.fillRect(Math.floor(Rr + 0.5 + ca * u - sa * vv), Math.floor(Rr + 0.5 + sa * u + ca * vv), 1, 1);
  };
  if (w.bow) {
    const pts = [[3, 0], [3, -1], [3, 1], [2, -2], [2, 2], [2, -3], [2, 3], [1, -4], [1, 4], [0, -5], [0, 5], [-1, -6], [-1, 6]];
    const pull = frame === 1 ? -3 : -1;
    for (let v = -6; v <= 6; v += 0.5) { const u = -1 + (pull + 1) * (1 - Math.abs(v) / 6); plot(u, v, '#e8e2d0'); }
    for (const p of pts) { plot(p[0], p[1], WC.W); plot(p[0] + 0.5, p[1], WC.D); }
    if (frame !== 2) { for (let u = pull; u <= 6; u += 0.5) plot(u, 0, '#c9a77a'); plot(7, 0, WC.S); plot(pull, 0, '#ffffff'); }
  } else {
    if (w.glow) {
      x.globalAlpha = 0.35;
      for (const p of w.shape) if (p[4] === w.glow) for (let u = p[0] - 1; u <= p[1] + 1; u += 0.5) for (let v = p[2] - 1; v <= p[3] + 1; v += 0.5) plot(u, v, w.glow);
      x.globalAlpha = 1;
    }
    for (const p of w.shape) {
      let col = p[4];
      for (let u = p[0]; u <= p[1]; u += 0.5) {
        for (let v = p[2]; v <= p[3]; v += 0.5) {
          let cc = WC[col] || col;
          if (col === 'CH') cc = (Math.floor(u) + frame) % 2 ? WC.s : WC.S;
          if (w.id === 'motosierra' && col === 'L' && (Math.floor(u) + frame) % 2) continue;
          plot(u, v, cc);
        }
      }
    }
  }
  e = { c, r: Rr };
  WCACHE.set(key, e);
  return e;
}
function drawWeaponAt(ctx, w, hx, hy, ang, flip, frame) {
  const e = weaponCanvas(w, ang, flip, frame);
  ctx.drawImage(e.c, Math.floor(hx) - e.r, Math.floor(hy) - e.r);
}

/* lienzo auxiliar (también funciona en tests sin DOM si existe OffscreenCanvas) */
function makeCanvas(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return new OffscreenCanvas(w, h);
}

/* retrato estático del personaje (selección, HUD, cadáveres) */
const STAFFS = new Set(['fuego', 'hielo', 'maldicion', 'espinas', 'rayo']);
function idlePose(d, f) {
  const w = d.weapon;
  const melee = !isGun(w) || STAFFS.has(w.id);
  return { armAng: Math.PI / 2 - f * (melee ? 0.5 : 0.9), armLen: 4, wAng: melee ? (f > 0 ? -1.15 : Math.PI + 1.15) : (f > 0 ? 0.25 : Math.PI - 0.25) };
}
function renderCharCanvas(d, opt) {
  opt = opt || {};
  const W = opt.w || 28, H = opt.h || 30;
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const ax = opt.ax || 12, ay = opt.ay || 27;
  const f = opt.f || 1;
  const pose = idlePose(d, f);
  drawChar(x, d, { x: ax, y: ay, f, walk: -1, bob: 0, dead: opt.dead });
  drawFront(x, d, { x: ax, y: ay, f, bob: 0, armAng: pose.armAng, armLen: pose.armLen, wAng: opt.noWeapon ? undefined : pose.wAng });
  return c;
}

/* ===== app: selección, batalla, resultados ===== */
const $ = (id) => document.getElementById(id);
const HOME = {
  escarcha: 'nieve', copo: 'nieve', ulf: 'nieve', valkyria: 'nieve', juan: 'nieve',
  pyra: 'volcan', azufre: 'volcan', parca: 'volcan', paco: 'volcan', lola: 'volcan', r7: 'volcan', gorgo: 'volcan',
  ramirez: 'desierto', ramses: 'desierto', guiri: 'desierto', zorg: 'desierto', sal: 'desierto', cosmo: 'desierto', toro: 'desierto',
  paja: 'pradera', abuela: 'pradera', anselmo: 'pradera', pichichi: 'pradera', sofi: 'pradera', risitas: 'pradera', tiopico: 'pradera', rider: 'pradera',
  raiz: 'bosque', nia: 'bosque', bruno: 'bosque', aullido: 'bosque', sombra: 'bosque', kenji: 'bosque',
  triton: 'pantano', pepe: 'pantano', voltio: 'pantano', lagzilla: 'pantano', bisturi: 'pantano',
  conde: 'ruinas', 'sir-oxido': 'ruinas', tomoe: 'ruinas', reina: 'ruinas', lin: 'ruinas', carmela: 'ruinas', gaston: 'ruinas', rocco: 'ruinas', lupe: 'ruinas', mcflow: 'ruinas', neon: 'ruinas', tano: 'ruinas'
};
const isMelee = (w) => w.k === 'melee' || w.k === 'thrust' || w.k === 'cont';
const KEY = 'ultimo-en-pie.v1';
let HIST = {};
try { HIST = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { HIST = {}; }
HIST.games = HIST.games || 0; HIST.wins = HIST.wins || 0; HIST.best = HIST.best || 0; HIST.c = HIST.c || {};
const saveHist = () => { try { localStorage.setItem(KEY, JSON.stringify(HIST)); } catch (e) { /* almacenamiento no disponible */ } };

const S = { sel: ROSTER[0], gore: 1, sound: true, filter: 'all', screen: 'select', cam: 'top', killcam: true, hd: true };
const NARROW = () => window.matchMedia('(max-width: 860px)').matches;
let PV = null, B = null, lastTs = 0, pvAcc = 0;

function show(name) {
  S.screen = name;
  for (const k of ['select', 'battle', 'results']) $('scr-' + k).hidden = k !== name;
}

/* ---------- parrilla ---------- */
function buildRoster() {
  const ol = $('roster');
  ol.innerHTML = '';
  for (const d of ROSTER) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.id = d.id; b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', d.n + ', ' + d.t + ', ' + d.weapon.n);
    const cv = charHD(d);
    fitPixel(cv, NARROW() ? 58 : 76);
    const num = document.createElement('span'); num.className = 'num'; num.textContent = String(d.num).padStart(2, '0');
    const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = d.n;
    b.append(num, cv, nm);
    const rec = HIST.c[d.id];
    if (rec && rec.w) { const wn = document.createElement('span'); wn.className = 'win'; wn.textContent = rec.w + ' V'; wn.title = rec.w + ' victorias'; b.append(wn); }
    b.addEventListener('click', () => select(d, true));
    li.append(b);
    li.dataset.kind = isMelee(d.weapon) ? 'melee' : 'range';
    ol.append(li);
  }
  applyFilter();
}
function applyFilter() {
  for (const li of $('roster').children) li.hidden = S.filter !== 'all' && li.dataset.kind !== S.filter;
  for (const c of document.querySelectorAll('.chip')) c.setAttribute('aria-pressed', String(c.dataset.f === S.filter));
}
function select(d, user) {
  S.sel = d;
  for (const b of document.querySelectorAll('.card')) b.setAttribute('aria-pressed', String(b.dataset.id === d.id));
  $('f-num').textContent = '#' + String(d.num).padStart(2, '0') + ' · ' + BUILDS[d.bd].n;
  $('f-name').textContent = d.n;
  $('f-title').textContent = d.t;
  $('f-bio').textContent = d.bio;
  const st = $('stats'); st.innerHTML = '';
  for (const [k, lab] of [['vida', 'Vida'], ['fuerza', 'Fuerza'], ['velocidad', 'Velocidad'], ['alcance', 'Alcance']]) {
    const dt = document.createElement('dt'); dt.textContent = lab;
    const dd = document.createElement('dd'); dd.setAttribute('aria-label', d.stats[k] + ' de 10');
    for (let i = 0; i < 10; i++) { const it = document.createElement('i'); if (i < d.stats[k]) it.className = 'on'; dd.append(it); }
    st.append(dt, dd);
  }
  $('f-wn').textContent = d.weapon.n;
  $('f-wd').textContent = weaponBlurb(d.weapon);
  const wc = $('f-wcv'), wx = wc.getContext('2d');
  wx.setTransform(1, 0, 0, 1, 0, 0); wx.clearRect(0, 0, wc.width, wc.height); wx.setTransform(2, 0, 0, 2, 0, 0);
  const wl = d.weapon.shape.reduce((m, p) => Math.max(m, p[1]), 0), wb = d.weapon.shape.reduce((m, p) => Math.min(m, p[0]), 0);
  if (d.weapon.shape.length || d.weapon.bow) drawWeaponHD(wx, d.weapon, d.weapon.bow ? 16 : Math.round(18 - (wl + wb) / 2), 9, 0, false, 0);
  else { wx.fillStyle = '#180e14'; wx.fillRect(14.5, 5.5, 7, 7); wx.fillStyle = d.sk; wx.fillRect(15, 6, 6, 6); wx.fillStyle = shade(d.sk, -0.25); wx.fillRect(15, 11, 6, 1); wx.fillStyle = shade(d.sk, 0.2); wx.fillRect(15, 6, 6, 0.5); }
  fitPixel(wc, NARROW() ? 64 : 80);
  $('f-pers').innerHTML = '';
  const pb = document.createElement('b'); pb.textContent = d.pers.n + '. '; $('f-pers').append(pb, document.createTextNode(d.pers.d));
  const rec = HIST.c[d.id];
  $('f-rec').textContent = rec ? 'Contigo: ' + rec.g + (rec.g === 1 ? ' partida' : ' partidas') + ' · ' + (rec.w || 0) + (rec.w === 1 ? ' victoria' : ' victorias') + (rec.best ? ' · mejor puesto #' + rec.best : '') : 'Aún no lo has llevado a la arena.';
  startPreview(d);
  if (user && window.matchMedia('(max-width: 860px)').matches) { /* en móvil la ficha ya está a la vista */ }
}
function startPreview(d) {
  const w = d.weapon;
  const world = genTrainingWorld(HOME[d.id] || BIOME_KEYS[d.num % BIOME_KEYS.length]);
  const gap = isMelee(w) ? 52 : clamp(w.rng * 0.62, 36, 74);
  const M = createMatch(4242, d.id, { training: true, world, defs: [d, DUMMY_DEF], spawns: [{ x: 80 - gap / 2, y: 50 }, { x: 80 + gap / 2, y: 50 }] });
  M.fighters[0].f = 1; M.fighters[1].f = -1; M.fighters[0].decT = 0.4; M.fighters[0].cd = 0.5;
  const R = createRenderer($('stage'), M, { preview: true, gore: S.gore, hd: true });
  R.follow = null; R.vw = 120; R.vh = 60; R.cam.x = 80; R.cam.y = 32;
  PV = { M, R };
  pvAcc = 0;
}

/* ---------- batalla ---------- */
function startBattle(def, seed) {
  SFX.unlock(); SFX.on = S.sound;
  show('battle');
  if (seed === undefined) seed = (Math.random() * 2147483647) | 0;
  const M = createMatch(seed, def.id, { onEvent });
  const R = createRenderer($('game'), M, { gore: S.gore, hd: S.hd, onSound: (n, v) => SFX.play(n, v) });
  attach3D(R);
  B = { M, R, speed: 1, acc: 0, results: false, deadT: -1, swapT: -1, hudT: 0, miniT: 0, ann: null, annQ: [], feed: [], introDone: false, scale: 3, kc: null, cut3d: true, perf: { n: 0, sum: 0, done: !S.hd },
    prep: true, fav: 2, favUsed: 0, aim: null, qte: null, hintT: 0 };
  resize();
  setKillcamUi();
  camButton();
  const fc = $('h-face'), fx = fc.getContext('2d'); fx.clearRect(0, 0, fc.width, fc.height); fx.drawImage(charHD(def), 0, 0); fitPixel(fc, NARROW() ? 40 : 48);
  $('h-cname').textContent = def.n;
  $('h-champ').classList.remove('dead');
  $('h-feed').innerHTML = '';
  $('ann').innerHTML = '';
  $('i-name').textContent = M.world.name; $('i-champ').textContent = def.n;
  $('intro').classList.remove('out'); $('intro').hidden = true;
  openPrep();
  setSpeed(1);
  $('b-snd').textContent = S.sound ? 'Sonido: sí' : 'Sonido: no';
  menu(false);
  updateHud(true);
}
function resize() {
  if (!B) return;
  const el = $('scr-battle'), w = el.clientWidth || innerWidth, h = el.clientHeight || innerHeight;
  const dpr = window.devicePixelRatio || 1, K = B.R.K || 1;
  /* zoom: pixeles físicos por unidad de mundo; cada pixel del canvas ocupa un número entero de pixeles físicos */
  const target = clamp(Math.round(Math.sqrt(w * h / 95000)), 2, 6) * dpr;
  const k = Math.max(1, Math.round(target / K));
  const vw = Math.ceil(w * dpr / (k * K)), vh = Math.ceil(h * dpr / (k * K)), cv = $('game');
  cv.width = vw * K; cv.height = vh * K;
  cv.style.width = (vw * K * k / dpr) + 'px'; cv.style.height = (vh * K * k / dpr) + 'px';
  B.R.vw = vw; B.R.vh = vh; B.scale = k * K / dpr;
}
/* ---------- preparación: punto de salto y ventaja ---------- */
const PP = { x: 0, y: 0, perk: null, offer: [], base: null };
function openPrep() {
  const M = B.M, C = M.champ;
  PP.x = C.x; PP.y = C.y;
  PP.offer = PERK_IDS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  PP.perk = PP.offer[0];
  PP.base = null;
  $('pp-isle').textContent = M.world.name + ' · ' + C.d.n;
  const box = $('pp-perks'); box.innerHTML = '';
  for (const id of PP.offer) {
    const b = document.createElement('button');
    b.className = 'perk'; b.setAttribute('role', 'radio'); b.dataset.id = id;
    const n = document.createElement('b'); n.textContent = PERKS[id].n;
    const d = document.createElement('span'); d.textContent = PERKS[id].d;
    b.append(n, d);
    b.addEventListener('click', () => { PP.perk = id; syncPerks(); });
    box.append(b);
  }
  syncPerks();
  $('prep').hidden = false;
  $('prep').scrollTop = 0;
  drawPrep();
}
function syncPerks() { for (const b of $('pp-perks').children) b.setAttribute('aria-checked', String(b.dataset.id === PP.perk)); }
function prepStats(x, y) {
  const M = B.M;
  let ch = 0, rv = 0;
  for (const c of M.world.chests) if (dist(x, y, c.x, c.y) < 70) ch++;
  for (const f of M.fighters) if (f !== M.champ && dist(x, y, f.x, f.y) < 110) rv++;
  const inZone = dist(x, y, M.zone.nx, M.zone.ny) < M.zone.nr;
  return { ch, rv, inZone, biome: BIOMES[M.world.biomeAt(x, y)].n };
}
function drawPrep() {
  const M = B.M, cv = $('pp-map'), x = cv.getContext('2d'), S2 = cv.width, k = S2 / MAP_W;
  if (!PP.base) {
    PP.base = makeCanvas(S2, S2);
    const b = PP.base.getContext('2d'); b.imageSmoothingEnabled = true; b.imageSmoothingQuality = 'high';
    b.drawImage(B.R.ground, 0, 0, B.R.ground.width, B.R.ground.height, 0, 0, S2, S2);
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  x.drawImage(PP.base, 0, 0);
  const Z = M.zone;
  x.beginPath(); x.rect(0, 0, S2, S2); x.arc(Z.nx * k, Z.ny * k, Z.nr * k, 0, TAU, true); x.fillStyle = 'rgba(40,14,70,0.35)'; x.fill('evenodd');
  x.setLineDash([6, 5]); x.lineWidth = 2; x.strokeStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(Z.nx * k, Z.ny * k, Z.nr * k, 0, TAU); x.stroke(); x.setLineDash([]);
  for (const c of M.world.chests) { x.fillStyle = '#0b0810'; x.fillRect(c.x * k - 3, c.y * k - 3, 7, 7); x.fillStyle = '#f2b43a'; x.fillRect(c.x * k - 2, c.y * k - 2, 5, 5); }
  for (const f of M.fighters) { if (f === M.champ) continue; x.fillStyle = '#0b0810'; x.beginPath(); x.arc(f.x * k, f.y * k, 3.5, 0, TAU); x.fill(); x.fillStyle = '#ff8a8a'; x.beginPath(); x.arc(f.x * k, f.y * k, 2.2, 0, TAU); x.fill(); }
  /* punto elegido */
  const px = PP.x * k, py = PP.y * k;
  x.strokeStyle = 'rgba(255,214,90,0.35)'; x.lineWidth = 1; x.beginPath(); x.arc(px, py, 110 * k, 0, TAU); x.stroke();
  x.fillStyle = '#0b0810'; x.beginPath(); x.arc(px, py, 13, 0, TAU); x.fill();
  x.strokeStyle = '#ffd65a'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 11, 0, TAU); x.stroke();
  x.imageSmoothingEnabled = false;
  const face = PP.face || (PP.face = charHD(M.champ.d));
  x.drawImage(face, px - 14, py - 18, 28, 30);
  /* información */
  const st = prepStats(PP.x, PP.y), info = $('pp-info');
  info.innerHTML = '';
  const b = document.createElement('b'); b.textContent = st.biome;
  const heat = st.rv >= 5 ? ['Caliente', '#ff8a8a'] : st.rv >= 2 ? ['Movido', '#f2b43a'] : ['Tranquilo', '#7dff6a'];
  const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = heat[0]; tag.style.background = heat[1];
  info.append(b, tag, document.createElement('br'), document.createTextNode(st.ch + (st.ch === 1 ? ' cofre' : ' cofres') + ' cerca · ' + st.rv + (st.rv === 1 ? ' rival' : ' rivales') + ' cerca · ' + (st.inZone ? 'dentro de la primera zona' : 'fuera de la primera zona')));
}
function prepPick(e) {
  const cv = $('pp-map'), r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width * MAP_W, y = (e.clientY - r.top) / r.height * MAP_H;
  const p = validDrop(B.M, x, y);
  PP.x = p.x; PP.y = p.y;
  drawPrep();
}
function jump(randomize) {
  if (!B || !B.prep) return;
  const M = B.M, C = M.champ;
  if (randomize) {
    PP.perk = PERK_IDS[(Math.random() * PERK_IDS.length) | 0];
    const p = validDrop(M, 80 + Math.random() * (MAP_W - 160), 80 + Math.random() * (MAP_H - 160)); PP.x = p.x; PP.y = p.y;
  }
  placeFighter(M, C, PP.x, PP.y);
  applyPerk(C, PP.perk);
  B.R.cam.x = C.x; B.R.cam.y = C.y; B.R.cam3.init = false;
  B.prep = false;
  $('prep').hidden = true;
  $('intro').hidden = false; $('intro').classList.remove('out');
  SFX.unlock();
  updateFavUi();
}

/* ---------- favores del público ---------- */
const FAV_MAX = 3, RING0 = 44, RINGT = 10, QTE_DUR = 1.0;
function hint(text, secs) { const h = $('h-hint'); h.textContent = text; h.hidden = false; B.hintT = secs || 0; }
function clearHint() { $('h-hint').hidden = true; B.hintT = 0; }
function gainFavor() {
  if (!B || !B.M.champ.alive) return;
  if (B.fav < FAV_MAX) { B.fav++; const p = $('fv-pips'); p.classList.remove('gain'); void p.offsetWidth; p.classList.add('gain'); SFX.play('pickup', 0.6); }
  updateFavUi();
}
function updateFavUi() {
  if (!B) return;
  const C = B.M.champ, off = B.prep || !C.alive || B.results;
  [...$('fv-pips').children].forEach((i, n) => i.classList.toggle('on', n < B.fav));
  for (const id of ['fv-heal', 'fv-bolt', 'fv-spin']) $(id).disabled = off || (B.fav <= 0 && !(id === 'fv-bolt' && B.aim));
  $('fv-bolt').setAttribute('aria-pressed', String(!!B.aim));
  $('fv-spin').setAttribute('aria-pressed', String(!!B.qte));
  $('favors').hidden = !C.alive && !B.prep;
}
function boltTargets() {
  const C = B.M.champ;
  return B.M.fighters.filter((f) => f !== C && f.alive && f.z <= 0 && dist(f.x, f.y, C.x, C.y) < 170);
}
function useFavor(kind) {
  if (!B || B.prep || B.results) return;
  const M = B.M, C = M.champ;
  if (!C.alive) return;
  if (kind === 'bolt' && B.aim) { B.aim = null; clearHint(); updateFavUi(); return; }
  if (B.fav <= 0 || B.qte) return;
  if (kind === 'heal') {
    if (C.hp >= C.maxHp * 0.97) { hint('Tu campeón ya tiene la vida llena', 1.6); return; }
    favorHeal(M, C); B.fav--; B.favUsed++;
  } else if (kind === 'bolt') {
    if (!boltTargets().length) { hint('No hay rivales cerca de tu campeón', 1.6); return; }
    B.aim = { t: 0 }; hint('Toca a un rival para lanzarle el rayo');
  } else if (kind === 'spin') {
    B.fav--; B.favUsed++;
    B.qte = { t: 0 }; hint('Toca cuando el anillo llegue al círculo dorado');
  }
  updateFavUi();
}
function aimBolt(e) {
  const M = B.M, C = M.champ, R = B.R, r = $('game').getBoundingClientRect(), sc = B.scale;
  const cands = boltTargets();
  let hit = null;
  if (R.view3d) {
    const px = (e.clientX - r.left) / sc, py = (e.clientY - r.top) / sc;
    for (const p of R.picks) if (cands.includes(p.f) && px >= p.x0 - 8 && px <= p.x1 + 8 && py >= p.y0 - 8 && py <= p.y1 + 8) hit = p.f;
  } else {
    const wx = R.cam.x - R.vw / 2 + (e.clientX - r.left) / sc, wy = R.cam.y - R.vh / 2 + (e.clientY - r.top) / sc;
    let bd = 22 * 22;
    for (const f of cands) { const d = dist2(wx, wy, f.x, f.y - 10); if (d < bd) { bd = d; hit = f; } }
  }
  if (!hit) return;
  favorBolt(M, C, hit); B.fav--; B.favUsed++;
  B.aim = null; clearHint(); updateFavUi();
}
function qteTap() {
  if (!B || !B.qte) return;
  const r = RING0 * (1 - B.qte.t / QTE_DUR), err = Math.abs(r - RINGT);
  finishQte(err <= 2.5 ? 2 : err <= 8 ? 1 : 0);
}
function finishQte(q) {
  const M = B.M, C = M.champ;
  B.qte = null; clearHint();
  if (C.alive) {
    favorSpin(M, C, q);
    announce(q === 2 ? '¡Perfecto!' : q === 1 ? '¡Bien!' : 'Flojo', 'Contraataque', q === 2 ? 'gold' : '', 3, 1.1);
  }
  updateFavUi();
}
/* capa sobre el lienzo: anillo del contraataque y miras del rayo */
function drawOverlay() {
  const R = B.R, ctx = R.ctx, C = B.M.champ;
  if (!R.proj || (!B.qte && !B.aim)) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (B.qte && C.alive) {
    const p = R.proj(C.x, C.y, 10); if (!p) return;
    const s = p[2], r = RING0 * (1 - B.qte.t / QTE_DUR), near = Math.abs(r - RINGT) <= 2.5;
    ctx.fillStyle = '#0b0810'; ringPx(ctx, p[0], p[1], Math.round(RINGT * s) + 2); ringPx(ctx, p[0], p[1], Math.round(RINGT * s) - 2);
    ctx.fillStyle = near ? '#ffffff' : '#ffd65a';
    for (let k = -1; k <= 1; k++) ringPx(ctx, p[0], p[1], Math.round(RINGT * s) + k);
    if (r > 0.5) { ctx.fillStyle = '#ffffff'; ringPx(ctx, p[0], p[1], Math.round(r * s)); ringPx(ctx, p[0], p[1], Math.round(r * s) - 1); }
  }
  if (B.aim) {
    const blink = (performance.now() / 160 | 0) % 2;
    for (const f of boltTargets()) {
      const p = R.proj(f.x, f.y, 11); if (!p) continue;
      const h = Math.max(6, Math.round(10 * p[2])), L = Math.max(3, h >> 1), t = Math.max(1, Math.round(p[2] / 2));
      const X = Math.round(p[0]), Y = Math.round(p[1]);
      ctx.fillStyle = blink ? '#ff3b3b' : '#ffd65a';
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.fillRect(sx < 0 ? X - h : X + h - L, Y + sy * h - (sy > 0 ? t : 0), L, t);
        ctx.fillRect(X + sx * h - (sx > 0 ? t : 0), sy < 0 ? Y - h : Y + h - L, t, L);
      }
    }
  }
}

/* si el dispositivo no llega a ~30 fps en HD, pasa a clásico sin cortar la partida */
function downgrade() {
  const old = B.R;
  const R = createRenderer($('game'), B.M, { gore: S.gore, hd: false, onSound: (n, v) => SFX.play(n, v) });
  attach3D(R);
  for (const k of ['follow', 'parts', 'nums', 'beams', 'rings', 'corpses', 'flashes', 'pools', 'shake', 'slowmo', 'time']) R[k] = old[k];
  R.cam.x = old.cam.x; R.cam.y = old.cam.y; Object.assign(R.cam3, old.cam3);
  B.R = R; B.cut3d = true; S.hd = false;
  resize();
  for (const b of $('opt-hd').children) b.setAttribute('aria-pressed', String(b.dataset.v === '0'));
  announce('Modo clásico', 'Píxel grande para que vaya fluido', '', 0, 1.6);
}
function perfWatch(dt) {
  const P = B.perf;
  if (P.done || B.M.t < 2.5 || dt > 0.25 || document.visibilityState !== 'visible') return;
  P.n++; P.sum += dt;
  if (P.n >= 120) { P.done = true; if (P.sum / P.n > 0.034) downgrade(); }
}
function setSpeed(v) {
  if (B) B.speed = v;
  $('b-spd').textContent = v + '×'; $('b-spd').setAttribute('aria-label', 'Velocidad: ' + v + '×');
}
function menu(open) { $('h-menu').hidden = !open; $('b-menu').setAttribute('aria-expanded', String(open)); }

/* ---------- cámara dron y killcam ---------- */
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, spread: Math.hypot(a.x - b.x, a.y - b.y) });
function headingOf(f) {
  if (!f) return null;
  if (f.state === 'fight' || f.atkT >= 0 || f.contT > 0) return f.aim;
  if (f.moving) return Math.atan2(f.vy, f.vx);
  return null;
}
function flashCut() {
  const c = $('cut');
  c.classList.remove('go'); void c.offsetWidth; c.classList.add('go');
}
function setKillcamUi() {
  const on = !!(B && B.kc);
  $('scr-battle').classList.toggle('kc', on);
  $('kc-label').textContent = on ? B.kc.label : '';
}
function camButton() {
  const b = $('b-cam');
  b.textContent = S.cam === 'drone' ? 'Dron' : 'Cenital';
  b.setAttribute('aria-label', 'Cámara: ' + (S.cam === 'drone' ? 'dron' : 'cenital'));
  b.setAttribute('aria-pressed', String(S.cam === 'drone'));
}
function startKillcam(focus, dur, label, opt) {
  if (!B || B.results || !S.killcam) return;
  opt = opt || {};
  if (B.kc && B.kc.hold && !opt.hold && !opt.force) return;
  const was3d = S.cam === 'drone' || !!B.kc;
  B.kc = { t: 0, dur, focus, label, hold: !!opt.hold, yaw0: opt.yaw0 === undefined ? null : opt.yaw0 };
  if (!was3d) { B.cut3d = true; flashCut(); }
  setKillcamUi();
}
function endKillcam() {
  if (!B || !B.kc) return;
  B.kc = null;
  if (S.cam !== 'drone') flashCut(); else B.cut3d = false;
  setKillcamUi();
}
function sideYaw(a, b) { return Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2; }

const MULTI = ['', '', '¡Doble baja!', '¡Triple baja!', '¡Masacre!', '¡Imparable!'];
function announce(big, sub, cls, prio, dur) {
  if (!B) return;
  const a = { big, sub, cls: cls || '', prio: prio || 0, dur: dur || 1.6 };
  if (!B.ann || a.prio >= B.ann.prio) { B.ann = a; B.annT = 0; drawAnn(); }
  else if (B.annQ.length < 3) B.annQ.push(a);
}
function drawAnn() {
  const el = $('ann'), a = B.ann;
  el.innerHTML = '';
  if (!a) return;
  const big = document.createElement('div'); big.className = 'big ' + a.cls; big.textContent = a.big;
  el.append(big);
  if (a.sub) { const s = document.createElement('div'); s.className = 'sub'; s.textContent = a.sub; el.append(s); }
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function addFeed(d) {
  const li = document.createElement('li');
  const span = (t, c) => { const s = document.createElement('span'); s.textContent = t; if (c) s.className = c; return s; };
  const champ = B.M.champ;
  if (d.killer) {
    li.append(span(d.killer.d.n, d.killer === champ ? 'c' : ''), document.createTextNode(' '), span(d.weapon, 'w'), document.createTextNode(' '), span(d.victim.d.n, d.victim === champ ? 'c x' : 'x'));
  } else {
    li.append(span(d.victim.d.n, d.victim === champ ? 'c x' : 'x'), document.createTextNode(' '), span('cae por ' + d.weapon, 'w'));
  }
  const ol = $('h-feed');
  ol.prepend(li);
  B.feed.push({ li, t: performance.now() });
  while (ol.children.length > 3) ol.lastChild.remove();
}
function onEvent(type, d) {
  if (!B) return;
  const M = B.M, champ = M.champ;
  switch (type) {
    case 'kill': {
      addFeed(d);
      if (d.victim === champ) {
        announce('Tu campeón ha caído', 'Puesto #' + d.victim.place + (d.killer ? ' · ' + d.killer.d.n + ' con ' + d.weapon : ' · ' + d.weapon), '', 4, 2.8);
        SFX.play('lose', 1);
        B.deadT = M.t; B.aim = null; if (B.qte) B.qte = null; clearHint(); updateFavUi();
        const k = d.killer, v = { x: champ.x, y: champ.y };
        startKillcam(() => (k && k.alive ? mid(k, v) : v), 3.0, 'Killcam · tu campeón cae', { yaw0: k ? sideYaw(k, v) : null, force: true });
      } else if (d.killer === champ) {
        gainFavor();
        announce(d.multi >= 2 ? MULTI[Math.min(5, d.multi)] : '¡Baja!', champ.d.n + ' elimina a ' + d.victim.d.n, 'gold', 3, 1.6);
        SFX.play('ann', 0.8);
        const v = { x: d.victim.x, y: d.victim.y };
        B.R.slowmo = Math.max(B.R.slowmo, 0.9);
        startKillcam(() => (champ.alive ? mid(champ, v) : v), 2.4, 'Killcam · ' + champ.d.n, { yaw0: sideYaw(champ, v) });
      } else if (d.first) {
        announce('¡Primera sangre!', (d.killer ? d.killer.d.n + ' elimina a ' : '') + d.victim.d.n, '', 2, 1.8);
        SFX.play('ann', 0.7);
      }
      if (B.R.follow === d.victim && d.victim !== champ) B.swapT = M.t + 1.6;
      break;
    }
    case 'remaining':
      if (d.n === 2) {
        announce('¡Duelo final!', 'Solo quedan dos', 'gold', 2, 2);
        const two = M.fighters.filter((f) => f.alive);
        if (two.length === 2) startKillcam(() => mid(two[0], two[1]), 999, 'Duelo final', { hold: true, force: true, yaw0: sideYaw(two[0], two[1]) });
      } else if (d.n === 10) announce('Quedan 10', '', '', 1, 1.4);
      if (d.n === 25 || d.n === 10) gainFavor();
      if (d.n === 2 || d.n === 10) SFX.play('ann', 0.7);
      break;
    case 'zone':
      if (d.mode === 'shrink') SFX.play('zone', 0.8);
      break;
    case 'airdrop': announce('¡Suministro!', 'Una reliquia cae del cielo', 'gold', 1, 1.6); SFX.play('ann', 0.6); break;
    case 'event': announce(d.kind === 'meteor' ? '¡Lluvia de meteoritos!' : '¡Tormenta eléctrica!', 'Nadie está a salvo', 'storm', 2, 2); break;
    case 'win': {
      const w = d.winner;
      if (!w) break;
      B.R.follow = w; B.R.slowmo = 1.6;
      startKillcam(() => w, 999, w === champ ? 'Victoria' : 'Último en pie', { hold: true, force: true });
      if (w === champ) { announce('¡Victoria!', champ.d.n + ' es el último en pie', 'gold', 9, 3.4); SFX.play('win', 1); }
      else { announce(w.d.n + ' gana', 'Tu campeón quedó #' + champ.place, '', 9, 3.4); SFX.play('win', 0.6); }
      break;
    }
  }
}
function updateHud(force) {
  const M = B.M, R = B.R, Z = M.zone, champ = M.champ;
  updateFavUi();
  $('h-alive').textContent = M.aliveN;
  const zt = $('h-zone-t'), ze = $('h-zone');
  if (Z.mode === 'wait') { zt.textContent = 'Tormenta ' + fmtTime(Z.t); ze.classList.toggle('hot', Z.t < 6); }
  else if (Z.mode === 'shrink') { zt.textContent = 'Se cierra'; ze.classList.add('hot'); }
  else { zt.textContent = 'Zona final'; ze.classList.add('hot'); }
  $('h-hp').style.width = (champ.alive ? clamp(champ.hp / champ.maxHp, 0, 1) * 100 : 0) + '%';
  $('h-ar').style.width = clamp(champ.armor / 100, 0, 1) * 100 + '%';
  const st = $('h-cstat');
  if (champ.alive) st.textContent = champ.kills + (champ.kills === 1 ? ' baja' : ' bajas') + (champ.relic ? ' · reliquia' : '');
  else { st.textContent = '#' + champ.place + ' · ' + champ.kills + (champ.kills === 1 ? ' baja' : ' bajas'); $('h-champ').classList.add('dead'); }
  const fo = $('h-follow'), now = performance.now();
  if (R.follow !== B.lastFollow) { B.lastFollow = R.follow; B.followT = now; }
  if (R.follow && R.follow !== champ && now - (B.followT || 0) < 3500) { fo.hidden = false; fo.textContent = 'Siguiendo a ' + R.follow.d.n; }
  else fo.hidden = true;
}
function nearestAlive(x, y, except) {
  let best = null, bd = 1e12;
  for (const o of B.M.fighters) if (o.alive && o !== except) { const d = dist2(x, y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
  return best;
}
function tickBattle(dt) {
  const { M, R } = B;
  if (B.prep) { R.frame(dt); return; }
  perfWatch(dt);
  if (B.qte) { B.qte.t += dt; if (B.qte.t > QTE_DUR + 0.12) finishQte(0); }
  if (B.aim) { B.aim.t += dt; if (B.aim.t > 8 || !M.champ.alive) { B.aim = null; clearHint(); updateFavUi(); } }
  if (B.hintT > 0) { B.hintT -= dt; if (B.hintT <= 0) clearHint(); }
  if (R.hitstop > 0) R.hitstop--;
  else {
    let sc = B.speed;
    if (B.qte) sc = 0.22; else if (B.aim) sc *= 0.45;
    if (R.slowmo > 0) { R.slowmo -= dt; sc *= 0.3; }
    B.acc += dt * sc;
    let n = 0;
    while (B.acc >= DT && n < 18) { stepMatch(M); R.step(); B.acc -= DT; n++; }
    if (n >= 18) B.acc = 0;
  }
  /* cámara: cambio de objetivo */
  const champ = M.champ;
  if (!champ.alive && R.follow === champ && B.deadT >= 0 && M.t - B.deadT > 2.4) {
    R.follow = champ.killer && champ.killer.alive ? champ.killer : nearestAlive(champ.x, champ.y);
  }
  if (B.swapT > 0 && M.t >= B.swapT) {
    B.swapT = -1;
    const v = R.follow;
    if (v && !v.alive) R.follow = v.killer && v.killer.alive ? v.killer : nearestAlive(v.x, v.y);
  }
  if (B.kc) { B.kc.t += dt; if (B.kc.t > B.kc.dur) endKillcam(); }
  if (S.cam === 'drone' || B.kc) {
    let focus, heading = null, mode = 'chase';
    if (B.kc) { mode = 'orbit'; focus = B.kc.focus(); heading = B.kc.yaw0; }
    else { const f = R.follow || champ; focus = f; heading = headingOf(f); if (B.cut3d && heading === null) heading = f.f > 0 ? 0 : Math.PI; }
    R.cam3Update(dt, mode, focus, heading, B.cut3d);
    B.cut3d = false;
    R.frame3d(dt);
  } else { R.view3d = null; R.frame(dt); }
  drawOverlay();
  if (!B.introDone && M.t > 1.6) { B.introDone = true; $('intro').classList.add('out'); setTimeout(() => { $('intro').hidden = true; }, 650); announce('¡A luchar!', 'Saltan 50 · sale 1', 'gold', 1, 1.5); }
  B.hudT -= dt; if (B.hudT <= 0) { B.hudT = 0.12; updateHud(); }
  B.miniT -= dt; if (B.miniT <= 0) { B.miniT = 0.15; R.drawMini($('minimap')); }
  if (B.ann) { B.annT += dt; if (B.annT > B.ann.dur) { B.ann = B.annQ.shift() || null; B.annT = 0; drawAnn(); } }
  const now = performance.now();
  for (let i = B.feed.length - 1; i >= 0; i--) if (now - B.feed[i].t > 5000) { B.feed[i].li.remove(); B.feed.splice(i, 1); }
  if (M.over && M.t - M.endT > 3.6 && !B.results) showResults();
}

/* ---------- resultados ---------- */
function showResults() {
  B.results = true;
  const M = B.M, champ = M.champ, win = M.winner;
  if (!M.over) runToEnd(M);
  const d = champ.d, place = champ.alive ? 1 : champ.place;
  HIST.games++; if (win === champ) HIST.wins++;
  HIST.best = HIST.best ? Math.min(HIST.best, place) : place;
  const c = HIST.c[d.id] || { g: 0, w: 0, best: 0 };
  c.g++; if (win === champ) c.w++; c.best = c.best ? Math.min(c.best, place) : place;
  HIST.c[d.id] = c; saveHist();
  $('r-kick').textContent = M.world.name + ' · ' + fmtTime(M.t);
  const t = $('r-title');
  t.textContent = win === champ ? '¡Victoria!' : win ? win.d.n + ' gana' : 'Nadie sobrevive';
  t.classList.toggle('win', win === champ);
  drawPodium(M);
  /* tu campeón */
  const mine = $('r-mine'); mine.innerHTML = '';
  const pl = document.createElement('div'); pl.className = 'place'; pl.textContent = '#' + place;
  const sm = document.createElement('small'); sm.textContent = 'de 50'; pl.append(sm);
  const info = document.createElement('div');
  const h3 = document.createElement('h3'); h3.textContent = d.n + (champ.perk ? ' · ' + PERKS[champ.perk].n : '');
  const p = document.createElement('p');
  if (win === champ) p.textContent = 'Último en pie. Nadie pudo con ' + (champ.kills > 4 ? 'esta máquina de matar.' : 'su instinto de supervivencia.');
  else if (champ.killer) p.textContent = 'Cayó ante ' + champ.killer.d.n + ' (' + champ.killW + ') en el minuto ' + fmtTime(champ.deathT) + '.';
  else p.textContent = 'Lo mató ' + (champ.killW || 'la isla') + ' en el minuto ' + fmtTime(champ.deathT) + '.';
  const kv = document.createElement('div'); kv.className = 'kv';
  const add = (v, l) => { const x = document.createElement('div'); const b = document.createElement('b'); b.textContent = v; const s = document.createElement('span'); s.textContent = l; x.append(b, s); kv.append(x); };
  add(champ.kills, champ.kills === 1 ? 'baja' : 'bajas');
  add(Math.round(champ.dmgDealt), 'daño causado');
  add(fmtTime(champ.alive ? M.t : champ.deathT), 'sobrevivió');
  add(B.favUsed, B.favUsed === 1 ? 'favor usado' : 'favores usados');
  info.append(h3, p, kv);
  mine.append(pl, info);
  /* tabla de bajas */
  const top = $('r-top'); top.innerHTML = '';
  const ranked = M.fighters.slice().sort((a, b) => b.kills - a.kills || (a.place || 1) - (b.place || 1)).slice(0, 5);
  for (const f of ranked) {
    const li = document.createElement('li'); if (f === champ) li.className = 'c';
    const nm = document.createElement('span'); nm.textContent = f.d.n + ' ';
    const em = document.createElement('em'); em.textContent = f.alive ? 'ganador' : '#' + f.place; nm.append(em);
    const k = document.createElement('b'); k.textContent = f.kills;
    li.append(nm, k); top.append(li);
  }
  $('r-hist').textContent = 'Tu historial: ' + HIST.games + (HIST.games === 1 ? ' partida' : ' partidas') + ' · ' + HIST.wins + (HIST.wins === 1 ? ' victoria' : ' victorias') + ' · mejor puesto #' + HIST.best;
  const box = $('r-sharebox'); box.classList.remove('show');
  box.value = (win === champ ? 'Mi campeón ' + d.n + ' ganó Último en Pie: el último de 50 en pie (' + champ.kills + ' bajas).' : 'Mi campeón ' + d.n + ' quedó #' + place + ' de 50 en Último en Pie (' + champ.kills + (champ.kills === 1 ? ' baja' : ' bajas') + ').') + ' ¿El tuyo aguanta más?';
  $('r-share').textContent = 'Copiar resultado';
  show('results');
  $('scr-results').scrollTop = 0;
  const card = document.querySelector('.card[data-id="' + d.id + '"]');
  if (card) { let wn = card.querySelector('.win'); if (c.w) { if (!wn) { wn = document.createElement('span'); wn.className = 'win'; card.append(wn); } wn.textContent = c.w + ' V'; } }
}
function drawPodium(M) {
  const cv = $('podium'), x = cv.getContext('2d');
  x.setTransform(2, 0, 0, 2, 0, 0);
  x.imageSmoothingEnabled = false;
  for (let y = 0; y < 80; y++) { x.fillStyle = mix('#2a1f3d', '#0b0810', y / 80); x.fillRect(0, y, 160, 1); }
  x.fillStyle = '#efe6d6'; for (let i = 0; i < 60; i++) x.fillRect(((i * 53) % 320) / 2, ((i * 29) % 80) / 2, 0.5, 0.5);
  const first = M.winner, second = M.placements[0], third = M.placements[1];
  const slots = [[second, 44, 58, 18, '2'], [first, 80, 52, 24, '1'], [third, 116, 62, 14, '3']];
  for (const [f, cx, top, h, n] of slots) {
    x.fillStyle = '#5a5068'; x.fillRect(cx - 15, top, 30, 80 - top);
    x.fillStyle = '#7a6e8a'; x.fillRect(cx - 15, top, 30, 2);
    x.fillStyle = '#3a3248'; x.fillRect(cx + 12, top + 2, 3, 80 - top);
    drawText3(x, n, cx, top + 6, n === '1' ? '#ffd65a' : '#efe6d6', 2, '#1a0f14');
    if (!f) continue;
    const fa = cx < 80 ? 1 : cx > 80 ? -1 : 1;
    x.drawImage(bodyHD(f.d, fa, -1, 0, null, ''), cx - BODY_AX, top - BODY_AY, BODY_W, BODY_H);
    const p = idlePose(f.d, fa);
    drawFrontHD(x, f.d, { x: cx, y: top, f: fa, bob: 0, armAng: n === '1' ? -Math.PI / 2 + fa * 0.3 : p.armAng, armLen: 4, wAng: n === '1' ? -Math.PI / 2 + fa * 0.2 : p.wAng });
    drawText3(x, f.d.n.split(' ')[0], cx, top - 33, f === M.champ ? '#ffd65a' : '#efe6d6', 1, '#1a0f14');
  }
  if (first) { x.fillStyle = '#ffd65a'; for (let i = 0; i < 26; i++) x.fillRect(40 + (i * 37) % 80, 4 + (i * 13) % 26, 1, 2); x.fillStyle = '#d2283c'; for (let i = 0; i < 18; i++) x.fillRect(46 + (i * 23) % 70, 6 + (i * 17) % 24, 2, 1); }
}

/* ---------- arranque ---------- */
function loop(ts) {
  const dt = Math.min(0.1, lastTs ? (ts - lastTs) / 1000 : 0.016);
  lastTs = ts;
  try {
    if (S.screen === 'battle' && B) tickBattle(dt);
    else if (S.screen === 'select' && PV) {
      pvAcc += dt; let n = 0;
      while (pvAcc >= DT && n < 4) { stepMatch(PV.M); PV.R.step(); pvAcc -= DT; n++; }
      PV.R.frame(dt);
    }
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function boot(data) {
  data = data || {};
  if (data.sel && ROSTER_BY_ID[data.sel]) S.sel = ROSTER_BY_ID[data.sel];
  else S.sel = ROSTER[(Math.random() * ROSTER.length) | 0];
  if (data.gore !== undefined) S.gore = data.gore;
  if (data.sound !== undefined) S.sound = data.sound;
  if (data.cam) S.cam = data.cam;
  if (data.hd !== undefined) S.hd = data.hd;
  if (data.killcam !== undefined) S.killcam = data.killcam;
  buildRoster();
  for (const b of $('opt-gore').children) b.setAttribute('aria-pressed', String(+b.dataset.v === S.gore));
  for (const b of $('opt-snd').children) b.setAttribute('aria-pressed', String(!!+b.dataset.v === S.sound));
  const segSync = () => { for (const b of $('opt-cam').children) b.setAttribute('aria-pressed', String(b.dataset.v === S.cam)); for (const b of $('opt-kc').children) b.setAttribute('aria-pressed', String(!!+b.dataset.v === S.killcam)); for (const b of $('opt-hd').children) b.setAttribute('aria-pressed', String(!!+b.dataset.v === S.hd)); };
  for (const b of $('opt-hd').children) b.addEventListener('click', () => { S.hd = !!+b.dataset.v; segSync(); });
  segSync();
  for (const b of $('opt-cam').children) b.addEventListener('click', () => { S.cam = b.dataset.v; segSync(); });
  for (const b of $('opt-kc').children) b.addEventListener('click', () => { S.killcam = !!+b.dataset.v; segSync(); });
  const toggleCam = () => { if (!B) return; S.cam = S.cam === 'drone' ? 'top' : 'drone'; if (!B.kc) { B.cut3d = true; flashCut(); } camButton(); segSync(); };
  $('b-cam').addEventListener('click', toggleCam);
  addEventListener('keydown', (e) => {
    if (S.screen !== 'battle' || !B) return;
    if (B.prep) { if (e.key === 'Enter') jump(false); return; }
    if (e.key === 'c' || e.key === 'C') toggleCam();
    else if (e.key === '1') useFavor('heal');
    else if (e.key === '2') useFavor('bolt');
    else if (e.key === '3') { if (B.qte) qteTap(); else useFavor('spin'); }
    else if (e.key === ' ') { if (B.qte) { e.preventDefault(); qteTap(); } }
    else if (e.key === 'Escape') { if (B.aim) { B.aim = null; clearHint(); updateFavUi(); } menu(false); }
  });
  for (const id of ['fv-heal', 'fv-bolt', 'fv-spin']) $(id).addEventListener('click', () => { if (B && B.qte && id === 'fv-spin') { qteTap(); return; } useFavor($(id).dataset.k); });
  $('pp-map').addEventListener('pointerdown', (e) => { if (B && B.prep) prepPick(e); });
  $('pp-map').addEventListener('pointermove', (e) => { if (B && B.prep && e.buttons) prepPick(e); });
  $('pp-go').addEventListener('click', () => jump(false));
  $('pp-rand').addEventListener('click', () => jump(true));
  select(S.sel);
  for (const c of document.querySelectorAll('.chip')) c.addEventListener('click', () => { S.filter = c.dataset.f; applyFilter(); });
  $('go').addEventListener('click', () => startBattle(S.sel));
  $('rand').addEventListener('click', () => { const pool = ROSTER.filter((d) => S.filter === 'all' || (isMelee(d.weapon) ? 'melee' : 'range') === S.filter); const d = pool[(Math.random() * pool.length) | 0]; select(d, true); const card = document.querySelector('.card[data-id="' + d.id + '"]'); if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  $('more').addEventListener('click', () => { const open = $('ficha').classList.toggle('open'); $('more').setAttribute('aria-expanded', String(open)); $('more').textContent = open ? 'Cerrar' : 'Ficha'; });
  for (const b of $('opt-gore').children) b.addEventListener('click', () => { S.gore = +b.dataset.v; for (const o of $('opt-gore').children) o.setAttribute('aria-pressed', String(o === b)); if (PV) PV.R.gore = S.gore; });
  for (const b of $('opt-snd').children) b.addEventListener('click', () => { S.sound = !!+b.dataset.v; SFX.on = S.sound; for (const o of $('opt-snd').children) o.setAttribute('aria-pressed', String(o === b)); });
  $('b-spd').addEventListener('click', () => { if (B) setSpeed(B.speed === 1 ? 2 : B.speed === 2 ? 4 : 1); });
  $('b-menu').addEventListener('click', () => menu($('h-menu').hidden));
  $('b-skip').addEventListener('click', () => { menu(false); if (!B || B.results) return; B.M.onEvent = null; runToEnd(B.M); showResults(); });
  $('b-snd').addEventListener('click', () => { S.sound = !S.sound; SFX.on = S.sound; $('b-snd').textContent = S.sound ? 'Sonido: sí' : 'Sonido: no'; });
  $('b-exit').addEventListener('click', () => { menu(false); B = null; show('select'); select(S.sel); });
  $('r-again').addEventListener('click', () => startBattle(S.sel));
  $('r-pick').addEventListener('click', () => { B = null; show('select'); select(S.sel); });
  $('r-share').addEventListener('click', () => {
    const box = $('r-sharebox'), txt = box.value;
    const fallback = () => { box.classList.add('show'); box.focus(); box.select(); $('r-share').textContent = 'Selecciona y copia'; };
    try { navigator.clipboard.writeText(txt).then(() => { $('r-share').textContent = 'Copiado'; }, fallback); } catch (e) { fallback(); }
  });
  $('game').addEventListener('pointerdown', (e) => {
    if (!B) return;
    if (!$('h-menu').hidden) { menu(false); return; }
    if (B.prep) return;
    if (B.qte) { qteTap(); return; }
    if (B.aim) { aimBolt(e); return; }
    const r = $('game').getBoundingClientRect(), sc = B.scale;
    if (B.R.view3d) {
      const px = (e.clientX - r.left) / sc, py = (e.clientY - r.top) / sc;
      let hit = null;
      for (const p of B.R.picks) if (px >= p.x0 - 4 && px <= p.x1 + 4 && py >= p.y0 - 4 && py <= p.y1 + 4) hit = p.f;
      if (hit) { B.R.follow = hit; if (B.kc && !B.kc.hold) endKillcam(); updateHud(); }
      return;
    }
    const wx = B.R.cam.x - B.R.vw / 2 + (e.clientX - r.left) / sc, wy = B.R.cam.y - B.R.vh / 2 + (e.clientY - r.top) / sc;
    const f = nearestAlive(wx, wy + 10);
    if (f && dist(wx, wy + 10, f.x, f.y) < 26) { B.R.follow = f; updateHud(); }
  });
  addEventListener('resize', resize);
  try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ sel: S.sel.id, gore: S.gore, sound: S.sound, cam: S.cam, killcam: S.killcam, hd: S.hd })); } catch (e) { /* sin recarga en caliente */ }
  requestAnimationFrame(loop);
}
window.__UEP = { start: (id, seed, prep) => { startBattle(ROSTER_BY_ID[id] || S.sel, seed); if (!prep) jump(false); }, jump, useFavor, qteTap, get B() { return B; }, setSpeed, select: (id) => select(ROSTER_BY_ID[id]), S };
if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(boot);
else boot((window.claude && window.claude.hot && window.claude.hot.data) || {});

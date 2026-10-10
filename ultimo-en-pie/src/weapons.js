/* ===== armas =====
   k: melee (barrido), thrust (estocada), cont (continuo), proj (proyectil), beam (impacto instantáneo),
      lob (parábola con explosión), wave (onda en cono)
   shape: piezas [u0,u1,v0,v1,color] en coordenadas del arma (u: a lo largo desde la mano, v: perpendicular) */
const WC = {
  W: '#8a5a2b', D: '#5a3418', S: '#d9e0e6', s: '#8d99a6', L: '#ffffff', G: '#f2c14e', g: '#b08a2a',
  K: '#24212b', k: '#3a3644', R: '#d2283c'
};
const WEAPONS = {
  espada:     { n: 'Espada', k: 'melee', dmg: 14, rng: 15, cd: 0.55, arc: 1.9, knock: 60,
    shape: [[-1, -1, 0, 0, 'G'], [0, 2, 0, 0, 'D'], [3, 3, -2, 2, 'G'], [4, 12, -1, 0, 'S'], [4, 11, -1, -1, 'L'], [13, 13, -1, -1, 'S']] },
  espadon:    { n: 'Espadón', k: 'melee', dmg: 24, rng: 19, cd: 1.1, arc: 2.4, knock: 110, multi: 1,
    shape: [[0, 3, 0, 0, 'D'], [4, 4, -3, 3, 'G'], [5, 18, -1, 1, 'S'], [5, 17, -1, -1, 'L'], [6, 17, 1, 1, 's'], [19, 19, 0, 0, 'S']] },
  estoque:    { n: 'Estoque', k: 'thrust', dmg: 10, rng: 19, cd: 0.34, knock: 30, bleed: 1,
    shape: [[0, 2, 0, 0, 'K'], [2, 3, -2, 1, 'G'], [4, 17, 0, 0, 'L']] },
  katana:     { n: 'Katana', k: 'melee', dmg: 16, rng: 16, cd: 0.48, arc: 2.0, knock: 50, bleed: 1,
    shape: [[0, 3, 0, 0, 'K'], [1, 1, 0, 0, 'R'], [4, 4, -1, 1, 'G'], [5, 15, -1, 0, 'S'], [5, 15, -1, -1, 'L'], [16, 16, -1, -1, 'L']] },
  katanaL:    { n: 'Katana láser', k: 'melee', dmg: 15, rng: 17, cd: 0.42, arc: 2.0, knock: 40, burn: 1, glow: '#3df5ff',
    shape: [[0, 3, 0, 0, 's'], [4, 4, -1, 1, 'K'], [5, 16, -1, 0, '#3df5ff'], [5, 16, -1, -1, '#e8ffff']] },
  hacha:      { n: 'Hacha', k: 'melee', dmg: 20, rng: 14, cd: 0.85, arc: 2.0, knock: 90, bleed: 1,
    shape: [[0, 11, 0, 0, 'W'], [7, 10, -3, -1, 's'], [6, 11, -4, -4, 'S'], [11, 11, -1, 0, 's']] },
  hachaD:     { n: 'Hacha doble', k: 'melee', dmg: 23, rng: 15, cd: 1.0, arc: 2.6, knock: 110, multi: 1,
    shape: [[0, 14, 0, 0, 'D'], [9, 12, -4, -1, 's'], [9, 12, 1, 4, 's'], [8, 13, -5, -5, 'S'], [8, 13, 5, 5, 'S'], [14, 15, 0, 0, 'G']] },
  martillo:   { n: 'Martillo de guerra', k: 'melee', dmg: 28, rng: 15, cd: 1.25, arc: 1.8, knock: 160, stun: 0.7,
    shape: [[0, 12, 0, 0, 'W'], [11, 15, -3, 3, 's'], [11, 15, -3, -3, 'S'], [13, 13, -3, 3, 'K']] },
  mazo:       { n: 'Mazo de goma', k: 'melee', dmg: 20, rng: 15, cd: 1.05, arc: 1.8, knock: 220, stun: 0.5, sfx: 'boing',
    shape: [[0, 11, 0, 0, '#e8402f'], [11, 16, -4, 4, '#f2d23a'], [13, 14, -4, 4, '#2f6fe8'], [11, 16, -4, -4, '#fff09a']] },
  sarten:     { n: 'Sartén', k: 'melee', dmg: 15, rng: 12, cd: 0.7, arc: 1.8, knock: 80, stun: 0.4, sfx: 'clang',
    shape: [[0, 6, 0, 0, 'K'], [7, 13, -3, 3, '#3a3a44'], [7, 13, -3, -3, '#6a6a78'], [8, 12, -2, 2, '#26262e']] },
  cuchilla:   { n: 'Cuchilla de carnicero', k: 'melee', dmg: 17, rng: 12, cd: 0.6, arc: 1.8, knock: 50, bleed: 1,
    shape: [[0, 3, 0, 0, 'D'], [4, 9, -3, 0, 'S'], [4, 9, -3, -3, 's'], [8, 8, -2, -2, 'K'], [4, 9, 0, 0, 'L']] },
  bisturi:    { n: 'Bisturís', k: 'melee', dmg: 6, rng: 11, cd: 0.2, arc: 1.2, knock: 15, bleed: 1,
    shape: [[0, 3, 0, 0, '#c9d1dc'], [4, 6, 0, 0, 'L']] },
  guadana:    { n: 'Guadaña', k: 'melee', dmg: 17, rng: 21, cd: 0.95, arc: 2.8, knock: 70, multi: 1, leech: 0.4,
    shape: [[0, 20, 0, 0, 'D'], [17, 20, -1, -1, 's'], [15, 19, -2, -2, 'S'], [12, 17, -3, -3, 'S'], [10, 14, -4, -4, 'S'], [9, 11, -5, -5, 'L']] },
  naginata:   { n: 'Naginata', k: 'melee', dmg: 15, rng: 22, cd: 0.75, arc: 2.2, knock: 60, multi: 1,
    shape: [[0, 17, 0, 0, 'K'], [17, 17, -1, 1, 'G'], [18, 23, -1, 0, 'S'], [18, 23, -1, -1, 'L']] },
  tridente:   { n: 'Tridente', k: 'thrust', dmg: 14, rng: 23, cd: 0.72, knock: 70, bleed: 1,
    shape: [[0, 18, 0, 0, 'G'], [19, 19, -3, 3, 'G'], [20, 23, -3, -3, 'G'], [20, 24, 0, 0, '#fff09a'], [20, 23, 3, 3, 'G']] },
  horca:      { n: 'Horca', k: 'thrust', dmg: 12, rng: 22, cd: 0.65, knock: 60,
    shape: [[0, 18, 0, 0, 'W'], [19, 19, -2, 2, 's'], [20, 23, -2, -2, 'S'], [20, 23, 0, 0, 'S'], [20, 23, 2, 2, 'S']] },
  sombrilla:  { n: 'Sombrilla de playa', k: 'thrust', dmg: 10, rng: 22, cd: 0.55, knock: 90,
    shape: [[0, 18, 0, 0, 'L'], [9, 17, -2, 2, '#e8402f'], [11, 12, -2, 2, '#ffffff'], [15, 16, -2, 2, '#ffffff'], [18, 19, -1, 1, '#e8402f'], [20, 21, 0, 0, 's']] },
  palo:       { n: 'Palo selfie', k: 'melee', dmg: 9, rng: 24, cd: 0.5, arc: 2.0, knock: 50,
    shape: [[0, 20, 0, 0, 's'], [21, 23, -2, 2, 'K'], [22, 22, -1, 1, '#7fd3ff']] },
  bo:         { n: 'Bastón bo', k: 'melee', dmg: 10, rng: 19, cd: 0.4, arc: 2.2, knock: 70, stun: 0.25,
    shape: [[-8, 14, 0, 0, 'W'], [-8, -7, 0, 0, 'K'], [13, 14, 0, 0, 'K']] },
  baston:     { n: 'Bastón de abuelo', k: 'melee', dmg: 11, rng: 16, cd: 0.6, arc: 1.8, knock: 80,
    shape: [[0, 13, 0, 0, 'D'], [14, 14, -3, 0, 'D'], [12, 13, -3, -3, 'D'], [0, 0, 0, 0, 'K']] },
  pico:       { n: 'Pico', k: 'melee', dmg: 19, rng: 14, cd: 0.8, arc: 1.9, knock: 70, bleed: 1,
    shape: [[0, 12, 0, 0, 'W'], [11, 12, -4, 4, 's'], [10, 10, -5, -5, 'S'], [10, 10, 5, 5, 'S'], [12, 12, -4, -4, 'S']] },
  teclado:    { n: 'Teclado mecánico', k: 'melee', dmg: 14, rng: 14, cd: 0.6, arc: 2.0, knock: 70, sfx: 'clack',
    shape: [[0, 1, 0, 0, '#2b2b33'], [2, 14, -2, 2, '#2b2b33'], [3, 13, -1, 1, '#4a4a56'], [4, 4, -1, -1, '#3df57a'], [7, 7, 0, 0, '#3df5ff'], [10, 10, 1, 1, '#ff3df0'], [12, 12, -1, -1, '#3df57a'], [6, 9, 1, 1, '#6a6a78']] },
  punos:      { n: 'Puños', k: 'thrust', dmg: 9, rng: 10, cd: 0.3, knock: 70, fist: 1, shape: [] },
  guantes:    { n: 'Guantes de boxeo', k: 'thrust', dmg: 11, rng: 11, cd: 0.34, knock: 110, stun: 0.2, fist: 1,
    shape: [[0, 3, -2, 2, '#d23b3b'], [1, 2, -2, -2, '#ff8a80'], [0, 0, -2, 2, '#9a1f1f']] },
  garras:     { n: 'Garras', k: 'melee', dmg: 9, rng: 10, cd: 0.28, arc: 1.6, knock: 30, bleed: 1, leech: 0.3,
    shape: [[1, 4, -1, -1, 'L'], [1, 5, 0, 0, 'L'], [1, 4, 1, 1, 'L']] },
  mordisco:   { n: 'Mordisco', k: 'thrust', dmg: 10, rng: 9, cd: 0.5, knock: 20, bleed: 1, leech: 0.6, fist: 1, shape: [] },
  motosierra: { n: 'Motosierra', k: 'cont', dps: 40, rng: 14, cone: 0.8, knock: 6, bleed: 1, sfx: 'saw',
    shape: [[0, 5, -2, 2, '#e8762b'], [1, 3, -3, -3, 'K'], [6, 15, -1, 1, 's'], [6, 15, -2, -2, 'L'], [6, 15, 2, 2, 'L'], [16, 16, 0, 0, 's']] },
  lanzallamas:{ n: 'Lanzallamas', k: 'cont', dps: 28, rng: 34, cone: 0.5, burn: 1, sfx: 'fire',
    shape: [[0, 8, -1, 1, '#4a525b'], [1, 2, 2, 3, 'K'], [9, 11, -1, 0, 'K'], [2, 6, -1, -1, '#7d8792']] },
  cadena:     { n: 'Cadena de candado', k: 'melee', dmg: 11, rng: 26, cd: 0.65, arc: 1.6, knock: 60,
    shape: [[0, 23, 0, 0, 'CH'], [24, 26, -1, 1, 'G'], [25, 25, -2, -2, 's']] },
  chancla:    { n: 'La Chancla', k: 'proj', p: 'chancla', dmg: 12, spd: 200, rng: 105, cd: 0.95, boomer: 1, sfx: 'zas',
    shape: [[0, 6, -1, 1, '#3fa8e0'], [1, 1, -1, 1, '#2a7fb0'], [3, 3, -1, 1, '#f2f2f2'], [4, 4, 0, 0, '#f2f2f2']] },
  shuriken:   { n: 'Shurikens', k: 'proj', p: 'star', dmg: 5, spd: 300, rng: 120, cd: 0.7, count: 3, spread: 0.32, bleed: 1,
    shape: [[1, 3, -1, 1, 's'], [2, 2, -2, 2, 'S'], [0, 4, 0, 0, 'S']] },
  rayo:       { n: 'Varita de rayos', k: 'beam', dmg: 13, rng: 95, cd: 1.1, chain: 2, tracer: '#8ff7ff',
    shape: [[0, 9, 0, 0, 'K'], [10, 11, -1, 1, 'G'], [12, 12, 0, 0, '#8ff7ff']], glow: '#8ff7ff' },
  fuego:      { n: 'Bastón de fuego', k: 'proj', p: 'fireball', dmg: 11, spd: 170, rng: 130, cd: 1.0, aoe: 13, burn: 1,
    shape: [[0, 14, 0, 0, 'D'], [14, 15, -2, 2, 'K'], [15, 17, -1, 1, '#ff7a1a'], [16, 16, 0, 0, '#fff3b0']], glow: '#ff7a1a' },
  hielo:      { n: 'Bastón de hielo', k: 'proj', p: 'ice', dmg: 10, spd: 220, rng: 130, cd: 0.8, slow: 1,
    shape: [[0, 14, 0, 0, '#c9d1dc'], [15, 18, -1, 1, '#9fe3ff'], [19, 19, 0, 0, '#e8ffff'], [15, 15, -2, 2, '#7fc8ff']], glow: '#9fe3ff' },
  revolver:   { n: 'Revólver', k: 'proj', p: 'bullet', dmg: 10, spd: 330, rng: 120, cd: 0.66,
    shape: [[0, 1, 0, 2, 'D'], [0, 5, -1, 0, 's'], [6, 8, -1, -1, 'S'], [3, 4, -1, 0, 'K']] },
  trabuco:    { n: 'Trabuco', k: 'proj', p: 'pellet', dmg: 5, spd: 280, rng: 70, cd: 1.25, count: 6, spread: 0.55,
    shape: [[-3, 0, 0, 1, 'W'], [1, 6, -1, 0, 'D'], [7, 11, -1, 0, 'G'], [11, 12, -2, 1, 'G']] },
  laser:      { n: 'Pistola de rayos', k: 'proj', p: 'laser', dmg: 7, spd: 360, rng: 125, cd: 0.28,
    shape: [[0, 5, -1, 0, '#8a5bd6'], [6, 7, -1, -1, '#c7f464'], [2, 3, -2, -2, '#c7f464'], [0, 1, 1, 2, '#4b3285']] },
  rifle:      { n: 'Rifle de francotirador', k: 'beam', dmg: 22, rng: 210, cd: 2.9, tracer: '#fff7b0',
    shape: [[-4, 1, 0, 1, 'K'], [2, 10, -1, 0, 'K'], [11, 18, -1, -1, 's'], [3, 7, -3, -2, 'k'], [7, 7, -3, -3, '#ff3b3b']] },
  arco:       { n: 'Arco', k: 'proj', p: 'arrow', dmg: 13, spd: 210, rng: 150, cd: 0.85, bow: 1, shape: [] },
  ballesta:   { n: 'Ballesta', k: 'proj', p: 'bolt', dmg: 20, spd: 260, rng: 160, cd: 1.35, pierce: 1,
    shape: [[-2, 8, 0, 0, 'W'], [6, 6, -5, 5, 's'], [5, 5, -4, -4, 's'], [5, 5, 4, 4, 's'], [3, 10, -1, -1, 'S']] },
  bombas:     { n: 'Bombas caseras', k: 'lob', p: 'bomb', dmg: 26, rng: 115, cd: 2.1, aoe: 24,
    shape: [[1, 4, -2, 1, 'K'], [2, 2, -2, -2, '#5a5a66'], [5, 6, -2, -2, 'D'], [7, 7, -2, -2, '#ffd65a']] },
  maldicion:  { n: 'Báculo maldito', k: 'proj', p: 'curse', dmg: 12, spd: 110, rng: 130, cd: 1.4, homing: 1,
    shape: [[0, 14, 0, 0, '#7a6a4a'], [15, 17, -1, 1, 'G'], [16, 16, 0, 0, '#c06aff'], [14, 14, -2, 2, 'G']], glow: '#c06aff' },
  plasma:     { n: 'Rifle de plasma', k: 'proj', p: 'plasma', dmg: 6, spd: 280, rng: 135, cd: 1.2, burst: 3,
    shape: [[-2, 9, -1, 1, '#eef1f5'], [0, 6, -1, -1, '#e8762b'], [10, 13, 0, 0, '#57c7ff'], [2, 3, 2, 2, '#9aa4b0']] },
  balon:      { n: 'Balón reglamentario', k: 'proj', p: 'ball', dmg: 13, spd: 230, rng: 130, cd: 1.1, bounce: 3, knock: 140,
    shape: [[1, 4, -2, 1, '#ffffff'], [2, 2, -1, -1, 'K'], [3, 3, 0, 0, 'K'], [4, 4, -2, -2, 'K']] },
  altavoz:    { n: 'Altavoz', k: 'wave', dmg: 11, rng: 54, cd: 1.4, cone: 1.2, knock: 200, stun: 0.3,
    shape: [[0, 8, -3, 2, '#2b2b33'], [1, 3, -2, 1, '#5a5a66'], [5, 7, -2, 1, '#5a5a66'], [2, 2, -1, 0, 'K'], [6, 6, -1, 0, 'K'], [2, 6, -4, -4, 's'], [4, 4, 0, 0, '#f2c14e']] },
  espinas:    { n: 'Bastón de espinas', k: 'proj', p: 'thorn', dmg: 6, spd: 220, rng: 120, cd: 0.75, count: 2, spread: 0.22, bleed: 1, poison: 1,
    shape: [[0, 14, 0, 0, '#5a4a2a'], [10, 10, -1, -1, '#a8d06a'], [13, 13, 1, 1, '#a8d06a'], [15, 16, -1, 0, '#6fd36a']], glow: '#6fd36a' },
  abanico:    { n: 'Abanico de acero', k: 'proj', p: 'fan', dmg: 11, spd: 200, rng: 110, cd: 0.9, boomer: 1, bleed: 1,
    shape: [[0, 2, 0, 0, 'K'], [3, 7, -3, 3, '#e8402f'], [3, 7, -3, -3, 'K'], [3, 7, 0, 0, 'K'], [3, 7, 3, 3, 'K'], [6, 6, -2, -2, '#ffffff'], [5, 5, 2, 2, '#ffffff']] },
  arpon:      { n: 'Arpón', k: 'proj', p: 'harpoon', dmg: 22, spd: 240, rng: 130, cd: 1.6, pierce: 1,
    shape: [[-2, 4, 0, 1, 'W'], [0, 10, -1, -1, 's'], [11, 13, -1, -1, 'S'], [11, 11, -2, 0, 'S']] }
};
for (const id in WEAPONS) WEAPONS[id].id = id;

/* descripción corta para la ficha */
function weaponBlurb(w) {
  const kind = { melee: 'Cuerpo a cuerpo', thrust: 'Estocada', cont: 'Daño continuo', proj: 'A distancia', beam: 'Impacto instantáneo', lob: 'Explosivo', wave: 'Onda expansiva' }[w.k];
  const tags = [];
  if (w.multi) tags.push('golpea a varios');
  if (w.bleed && !w.poison) tags.push('sangrado');
  if (w.poison) tags.push('veneno');
  if (w.burn) tags.push('quema');
  if (w.slow) tags.push('ralentiza');
  if (w.stun) tags.push('aturde');
  if (w.leech) tags.push('roba vida');
  if (w.pierce) tags.push('atraviesa');
  if (w.boomer) tags.push('vuelve a la mano');
  if (w.bounce) tags.push('rebota');
  if (w.chain) tags.push('salta entre enemigos');
  if (w.aoe) tags.push('daño en área');
  if (w.count) tags.push(w.count + ' a la vez');
  if (w.burst) tags.push('ráfaga de ' + w.burst);
  if (w.homing) tags.push('teledirigido');
  return kind + (tags.length ? ' · ' + tags.join(' · ') : '');
}
function weaponDps(w) {
  if (w.k === 'cont') return w.dps;
  let d = w.dmg * (w.count ? w.count * 0.6 : 1) * (w.burst || 1) * (w.aoe ? 1.3 : 1) * (w.chain ? 1.6 : 1);
  if (w.stun) d *= 1.1;
  return d / w.cd;
}

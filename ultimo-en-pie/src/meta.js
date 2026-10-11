/* ===== metajuego: reto diario, medallas, logros y tarjeta para compartir ===== */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function dayKey(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function dayLabel(key) { const p = key.split('-'); return (+p[2]) + ' ' + MESES[+p[1] - 1]; }
function prevDay(key) { const p = key.split('-'); return dayKey(new Date(+p[0], +p[1] - 1, +p[2] - 1)); }
/* misma semilla para todos los jugadores el mismo día */
function daySeed(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 2147483646) + 1;
}
/* días seguidos con el reto terminado; si hoy aún no se ha jugado, la racha de ayer sigue viva */
function dailyStreak(daily, today) {
  let k = daily[today] && daily[today].p ? today : prevDay(today), n = 0;
  while (daily[k] && daily[k].p) { n++; k = prevDay(k); }
  return n;
}

/* medalla por campeón según su mejor puesto */
const MEDAL = [null, { n: 'Bronce', c: '#c8814a', d: 'top 10' }, { n: 'Plata', c: '#cfd8e2', d: 'top 3' }, { n: 'Oro', c: '#f2b43a', d: 'victoria' }];
function medalOf(rec) { if (!rec || !rec.best) return 0; return rec.best === 1 ? 3 : rec.best <= 3 ? 2 : rec.best <= 10 ? 1 : 0; }

/* logros: casi todos dependen de decisiones del jugador, no de la suerte */
const ACH = [
  { id: 'victoria', n: 'Último en pie', d: 'Gana una partida.' },
  { id: 'primera', n: 'Primera sangre', d: 'Tu campeón hace la primera baja de la partida.' },
  { id: 'perfecto', n: 'Ojo de halcón', d: 'Haz un contraataque perfecto.' },
  { id: 'anillo3', n: 'Pulso de cirujano', d: 'Tres contraataques perfectos en la misma partida.' },
  { id: 'rayo', n: 'Castigo divino', d: 'Remata a un rival con el Rayo del público.' },
  { id: 'masacre', n: 'Masacre', d: 'Tu campeón encadena tres bajas en pocos segundos.' },
  { id: 'sinayuda', n: 'Sin ayuda', d: 'Gana sin usar ningún favor.' },
  { id: 'pelos', n: 'Por los pelos', d: 'Gana con menos del 10 % de vida.' },
  { id: 'pacifista', n: 'Pacifista', d: 'Llega al top 10 sin hacer ninguna baja.' },
  { id: 'caliente', n: 'A la boca del lobo', d: 'Salta en una zona caliente y llega al top 10.' },
  { id: 'matagigantes', n: 'David contra Goliat', d: 'Gana con un luchador de vida 3 o menos.' },
  { id: 'coleccion', n: 'Coleccionista', d: 'Consigue medalla con 10 campeones distintos.' },
  { id: 'leyenda', n: 'Leyenda', d: 'Gana con 5 campeones distintos.' },
  { id: 'racha', n: 'Constante', d: 'Termina el reto diario 3 días seguidos.' },
  { id: 'podio', n: 'Podio del día', d: 'Queda entre los 3 primeros en el reto diario.' }
];
const ACH_BY_ID = Object.fromEntries(ACH.map((a) => [a.id, a]));

/* ---------- tarjeta para compartir (1080 x 1350, formato vertical de redes) ---------- */
function shareText(o) {
  let t = o.win ? o.d.n + ' ganó: último en pie de 50' : o.d.n + ' quedó #' + o.place + ' de 50';
  t += ' (' + o.kills + (o.kills === 1 ? ' baja)' : ' bajas)');
  if (o.daily) t = 'Reto diario ' + dayLabel(o.daily) + ': ' + t + (o.streak > 1 ? ', racha de ' + o.streak + ' días' : '');
  return 'Último en Pie · ' + t + '. ¿Tu campeón aguanta más?' + (o.url ? ' ' + o.url : '');
}
async function drawShareCard(o) {
  try { await Promise.all(["100px 'Jersey 10'", "30px 'Silkscreen'"].map((f) => document.fonts.load(f))); } catch (e) { /* sin fuentes web: usa las de respaldo */ }
  const W = 1080, H = 1350, c = makeCanvas(W, H), x = c.getContext('2d');
  const gold = '#f2b43a', bone = '#efe6d6', blood = '#d2283c', dk = '#6e0c1c', dim = '#a89bb8';
  const D = "'Jersey 10', 'Pixelify Sans', monospace", L = "'Silkscreen', ui-monospace, monospace";
  const txt = (s, X, Y, font, col, shadow) => {
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    if (shadow) for (const [dx, dy, cc] of shadow) { x.fillStyle = cc; x.fillText(s, X + dx, Y + dy); }
    x.fillStyle = col; x.fillText(s, X, Y);
  };
  /* fondo */
  x.fillStyle = '#14101b'; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 0; y < H; y += 12) for (let i = (y / 12) % 2 ? 6 : 0; i < W; i += 12) x.fillRect(i, y, 6, 6);
  x.fillStyle = o.win ? gold : '#3b3149';
  x.fillRect(24, 24, W - 48, 8); x.fillRect(24, H - 32, W - 48, 8); x.fillRect(24, 24, 8, H - 48); x.fillRect(W - 32, 24, 8, H - 48);
  /* cabecera */
  txt(o.daily ? 'RETO DIARIO · ' + dayLabel(o.daily).toUpperCase() : (o.island || 'BATTLE ROYALE').toUpperCase(), W / 2, 104, '34px ' + L, gold);
  txt('ÚLTIMO EN PIE', W / 2, 236, '150px ' + D, bone, [[12, 12, dk], [6, 6, blood]]);
  /* escenario del campeón */
  const sx = 150, sy = 290, sw = W - 300, sh = 520;
  x.fillStyle = '#0b0810'; x.fillRect(sx, sy, sw, sh);
  x.fillStyle = o.win ? 'rgba(242,180,58,0.10)' : 'rgba(176,125,255,0.08)';
  x.beginPath(); x.moveTo(W / 2 - 60, sy); x.lineTo(W / 2 + 60, sy); x.lineTo(W / 2 + 230, sy + sh); x.lineTo(W / 2 - 230, sy + sh); x.closePath(); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) x.fillRect(sx + ((i * 97) % sw), sy + ((i * 53) % (sh - 120)), 6, 6);
  x.fillStyle = '#2a2236'; x.fillRect(sx, sy + sh - 70, sw, 70);
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(W / 2 - 150, sy + sh - 82, 300, 24);
  x.imageSmoothingEnabled = false;
  const sp = charHD(o.d), s = 8;
  x.drawImage(sp, Math.round(W / 2 - 24 * s), sy + sh - 70 - 54 * s, sp.width * s, sp.height * s);
  if (o.medal) {
    const M = MEDAL[o.medal], mx = sx + sw - 110, my = sy + 40;
    x.fillStyle = '#0b0810'; x.fillRect(mx - 6, my - 6, 82, 82);
    x.fillStyle = M.c; x.fillRect(mx, my, 70, 70);
    x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(mx, my, 70, 10); x.fillRect(mx, my, 10, 70);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(mx + 22, my + 22, 26, 26);
  }
  /* resultado */
  txt(o.d.n, W / 2, 900, '96px ' + D, bone);
  txt(o.win ? '¡GANÓ!' : '#' + o.place, W / 2, 1100, '230px ' + D, o.win ? gold : bone, [[10, 10, '#000000']]);
  txt(o.win ? 'ULTIMO EN PIE DE 50' : 'DE 50 LUCHADORES', W / 2, 1160, '34px ' + L, dim);
  const bits = [o.kills + (o.kills === 1 ? ' BAJA' : ' BAJAS')];
  if (o.medal) bits.push('MEDALLA DE ' + MEDAL[o.medal].n.toUpperCase());
  if (o.streak > 1) bits.push('RACHA ' + o.streak);
  txt(bits.join(' · '), W / 2, 1228, '34px ' + L, gold);
  if (o.url) txt(o.url.replace(/^https?:\/\//, '').replace(/\/$/, ''), W / 2, 1296, '28px ' + L, dim);
  return c;
}

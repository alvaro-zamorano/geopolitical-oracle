/* ===== agente de reglas (sin modelo de lenguaje) =====
   Sirve de referencia, de relleno en pruebas y de vara de medir: si un modelo no supera a esto, algo falla.
   Decide como entrenador: estilo, rival preferido, destino y cuándo gastar los favores. */

export function prepararReglas(info, opciones = {}) {
  const libres = info.luchadores.filter((l) => l.libre);
  const quiere = opciones.luchador && libres.find((l) => l.id === opciones.luchador);
  const l = quiere || libres.slice().sort((a, b) => (b.vida + b.fuerza) - (a.vida + a.fuerza))[0];
  // punto de salto: cerca de cofres, lejos de rivales y cerca de la primera zona (como la prueba de favores)
  const M = info.mapa, Z = M.primera_zona;
  const sitios = [];
  for (let gx = 80; gx <= M.ancho - 80; gx += 20) for (let gy = 80; gy <= M.alto - 80; gy += 20) {
    let s = 0;
    for (const c of M.cofres) { const d = Math.hypot(gx - c.x, gy - c.y); if (d < 70) s += 3; }
    for (const r of M.caidas_rivales) { const d = Math.hypot(gx - r.x, gy - r.y); if (d < 60) s -= 10; else if (d < 120) s -= 5; }
    s -= Math.hypot(gx - Z.x, gy - Z.y) / 60;
    sitios.push({ x: gx, y: gy, s });
  }
  // varios agentes con las mismas reglas acabarían cayendo en el mismo sitio: cada uno elige uno de los 12 mejores, separados entre sí
  sitios.sort((a, b) => b.s - a.s);
  const top = [];
  for (const p of sitios) { if (top.every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= 90)) top.push(p); if (top.length >= 12) break; }
  let h = 2166136261; for (const ch of String(opciones.semilla || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const best = top[h % top.length];
  return { luchador: l ? l.id : null, salto: { x: best.x, y: best.y }, ventaja: 'tanque', estilo: 'prudente' };
}

export function decidirReglas(o, opciones = {}) {
  const yo = o.yo, R = o.rivales || [], tarde = o.vivos <= 8, pronto = o.vivos > 30;
  const r = { estilo: tarde ? 'agresivo' : pronto ? 'prudente' : 'normal' };
  const conFavores = opciones.favores !== false;
  // favores
  const rivalActual = yo.peleando_con != null ? R.find((x) => x.id === yo.peleando_con) : null;
  if (conFavores && yo.favores > 0 && !yo.cayendo) {
    if (yo.vida < 30 && (yo.dano_recibido > 0 || o.me_golpean.length)) r.favor = { tipo: 'pocion' };
    else if (o.me_golpean.length >= 2 && yo.vida < 75) r.favor = { tipo: 'contraataque' };
    else if (rivalActual && rivalActual.dist < 150 && (rivalActual.vida < 45 || (o.vivos <= 12 && yo.favores >= 2))) r.favor = { tipo: 'rayo', objetivo: rivalActual.id };
  }
  // rival preferido: alguien herido que ya pelea con otro
  const presa = R.filter((x) => x.ataca != null && x.ataca !== 'a ti' && x.vida < 55 && x.dist < 110).sort((a, b) => a.vida - b.vida)[0];
  r.objetivo = presa ? presa.id : null;
  // destino: ponerse a salvo antes de que cierre la tormenta
  const Z = o.zona;
  r.destino = !Z.dentro_de_la_siguiente && (Z.modo === 'se_cierra' || Z.segundos < 12) ? 'zona' : null;
  r.pensamiento = r.favor ? (r.favor.tipo === 'pocion' ? 'Me curo antes de que me rematen.' : r.favor.tipo === 'rayo' ? 'Rayo a ' + rivalActual.nombre + ', está tocado.' : 'Me rodean: contraataque.')
    : presa ? 'Voy a por ' + presa.nombre + ', está herido y ocupado.' : r.destino ? 'A la zona antes de que cierre.' : null;
  return r;
}

/* ===== prueba de determinismo entre motores (V8, JavaScriptCore, SpiderMonkey) =====
   Rehace la partida de demostración desde su registro, juega varias partidas solo con la IA y pasa las
   matemáticas deterministas por miles de valores. Cada paso deja una huella; si coinciden con las del
   servidor, este navegador ve exactamente las mismas partidas que se jugaron. Sin DOM: corre igual en Node. */
const PRUEBA_SEMILLAS = [11, 222, 3333, 44444, 555555];
function pruebaFnv(s, h) {
  h = h === undefined ? 0x811c9dc5 : h;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
function pruebaHex(h) { return (h >>> 0).toString(16).padStart(8, '0'); }
/* huella bit a bit de las funciones de mathdet.js */
function pruebaMates() {
  const f = new Float64Array(1), u = new Uint32Array(f.buffer);
  let h = 0x811c9dc5, s = 12345;
  const rnd = () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; };
  const mete = (v) => { f[0] = v; h = pruebaFnv(u[0] + ':' + u[1] + ';', h); };
  for (let i = 0; i < 4000; i++) {
    const a = (rnd() - 0.5) * (i < 3000 ? 14 : 2000);
    mete(msin(a)); mete(mcos(a));
    const y = (rnd() - 0.5) * 1600, x = (rnd() - 0.5) * 1600;
    mete(matan2(y, x)); mete(mhypot(x, y));
    mete(mexp((rnd() - 0.8) * 30));
  }
  return pruebaHex(h);
}
/* misma lógica que replayLog en arena/core.mjs */
function pruebaRepetir(L) {
  const M = createMatch(L.semilla, null, {});
  ligaPreparar(M, L.agentes);
  let w = 0, n = 0;
  const V = L.ventanas || [];
  while (!M.over && M.t < 400) {
    while (w < V.length && V[w].n === n) { for (const inp of V[w].in) ligaAplicar(M, inp); w++; }
    if (L.fin && n >= L.fin.n) break;
    stepMatch(M); n++;
  }
  return ligaHuella(M);
}
function pruebaSoloIA(semilla) {
  const M = createMatch(semilla, null, {});
  while (!M.over && M.t < 400) stepMatch(M);
  return ligaHuella(M);
}
/* generador: cada paso devuelve { paso, valor } y al final { fin: true, ... } */
function* pruebaPasos(demo) {
  const r = { mates: '', demo: '', demo_esperada: demo && demo.fin ? demo.fin.hash : '', semillas: [] };
  r.mates = pruebaMates();
  yield { paso: 'mates', valor: r.mates };
  if (demo) { r.demo = pruebaRepetir(demo); yield { paso: 'demo', valor: r.demo }; }
  for (const s of PRUEBA_SEMILLAS) { const v = pruebaSoloIA(s); r.semillas.push(v); yield { paso: 'semilla', semilla: s, valor: v }; }
  r.codigo = pruebaHex(pruebaFnv([r.mates, r.demo].concat(r.semillas).join('|')));
  return r;
}
function pruebaTodo(demo) {
  const g = pruebaPasos(demo);
  let x = g.next();
  while (!x.done) x = g.next();
  return x.value;
}

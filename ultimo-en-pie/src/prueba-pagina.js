/* ===== página de la prueba de determinismo (build.py incrusta la demo y las huellas del servidor) ===== */
const PRUEBA_DEMO = /*DEMO*/null;
const PRUEBA_ESPERADO = /*ESPERADO*/null;
const PRUEBA_SIM = '__SIM_VERSION__';
function pruebaMotor() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'Safari en iOS · WebKit / JavaScriptCore';
  if (/Firefox\//.test(ua)) return 'Firefox · SpiderMonkey';
  if (/Edg\//.test(ua)) return 'Edge · V8';
  if (/Chrome\/|Chromium\//.test(ua)) return 'Chrome · V8';
  if (/Safari\//.test(ua)) return 'Safari · WebKit / JavaScriptCore';
  return ua.slice(0, 80);
}
function pruebaFila(txt) {
  const li = document.createElement('li');
  li.innerHTML = '<span class="i">…</span><span class="n"></span><span class="v"></span>';
  li.querySelector('.n').textContent = txt;
  document.getElementById('filas').appendChild(li);
  return li;
}
function pruebaMarca(li, valor, esperado) {
  const ok = esperado == null ? null : valor === esperado;
  li.className = ok === null ? '' : ok ? 'ok' : 'bad';
  li.querySelector('.i').textContent = ok === null ? '·' : ok ? '✓' : '✗';
  li.querySelector('.v').textContent = ok === false ? valor + ' ≠ ' + esperado : valor;
  return ok;
}
function pruebaArrancar() {
  document.getElementById('motor').textContent = pruebaMotor();
  const E = PRUEBA_ESPERADO && PRUEBA_ESPERADO.sim === PRUEBA_SIM ? PRUEBA_ESPERADO : null;
  const g = pruebaPasos(PRUEBA_DEMO);
  const t0 = performance.now();
  let fallos = 0, sinRef = 0, iSem = 0, fila = pruebaFila('Matemáticas (seno, coseno, arcotangente, exponencial)');
  const cuenta = (ok) => { if (ok === false) fallos++; else if (ok === null) sinRef++; };
  function paso() {
    const x = g.next();
    if (x.done) return terminar(x.value);
    const s = x.value;
    if (s.paso === 'mates') cuenta(pruebaMarca(fila, s.valor, E ? E.mates : null));
    else if (s.paso === 'demo') cuenta(pruebaMarca(fila, s.valor, PRUEBA_DEMO.fin ? PRUEBA_DEMO.fin.hash : null));
    else { cuenta(pruebaMarca(fila, s.valor, E ? E.semillas[iSem] : null)); iSem++; }
    const sig = s.paso === 'mates' && PRUEBA_DEMO ? 'Partida de demostración rehecha desde su registro'
      : iSem < PRUEBA_SEMILLAS.length ? 'Partida solo IA · semilla ' + PRUEBA_SEMILLAS[iSem] : null;
    if (sig) fila = pruebaFila(sig);
    setTimeout(paso, 30);
  }
  function terminar(r) {
    const V = document.getElementById('veredicto'), seg = ((performance.now() - t0) / 1000).toFixed(1);
    if (fallos) { V.className = 'veredicto bad'; V.querySelector('.t').textContent = 'Distinto'; }
    else if (sinRef) { V.className = 'veredicto'; V.querySelector('.t').textContent = 'Sin referencia'; }
    else { V.className = 'veredicto ok'; V.querySelector('.t').textContent = 'Idéntico al servidor'; }
    V.querySelector('.s').textContent = 'código ' + r.codigo + (E ? ' · servidor ' + E.codigo : '') + ' · ' + seg + ' s';
    document.getElementById('pie').textContent = 'Simulación ' + PRUEBA_SIM + '. ' + (fallos ? fallos + ' huella(s) no coinciden: este navegador no reproduciría bien las partidas.' : sinRef ? 'Falta la referencia del servidor para comparar algunas huellas.' : 'Todas las huellas coinciden con las del servidor.');
    document.documentElement.dataset.resultado = fallos ? 'distinto' : sinRef ? 'sin-referencia' : 'identico';
    document.documentElement.dataset.codigo = r.codigo;
  }
  setTimeout(paso, 50);
}
pruebaArrancar();

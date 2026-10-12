/* ===== matemáticas de la simulación: versión determinista (liga de agentes) =====
   El estándar de JavaScript no obliga a que Math.sin, cos, atan2, hypot o exp den el mismo resultado en
   todos los motores. Estas versiones (adaptadas de fdlibm/musl) solo usan suma, resta, multiplicación,
   división y raíz cuadrada, que IEEE 754 fija al bit: el servidor y cualquier navegador calculan lo mismo. */
const DM_TOINT = 1.5 / 2.220446049250313e-16;
const DM_INVPIO2 = 6.36619772367581382433e-01, DM_PIO2_1 = 1.57079632673412561417e+00, DM_PIO2_1T = 6.07710050650619224932e-11;
const DM_S1 = -1.66666666666666324348e-01, DM_S2 = 8.33333333332248946124e-03, DM_S3 = -1.98412698298579493134e-04,
  DM_S4 = 2.75573137070700676789e-06, DM_S5 = -2.50507602534068634195e-08, DM_S6 = 1.58969099521155010221e-10;
const DM_C1 = 4.16666666666666019037e-02, DM_C2 = -1.38888888888741095749e-03, DM_C3 = 2.48015872894767294178e-05,
  DM_C4 = -2.75573143513906633035e-07, DM_C5 = 2.08757232129817482790e-09, DM_C6 = -1.13596475577881948265e-11;
function dmKSin(x, y, iy) {
  const z = x * x, w = z * z, r = DM_S2 + z * (DM_S3 + z * DM_S4) + z * w * (DM_S5 + z * DM_S6), v = z * x;
  return iy === 0 ? x + v * (DM_S1 + z * r) : x - ((z * (0.5 * y - v * r) - y) - v * DM_S1);
}
function dmKCos(x, y) {
  const z = x * x, w = z * z, r = z * (DM_C1 + z * (DM_C2 + z * DM_C3)) + w * w * (DM_C4 + z * (DM_C5 + z * DM_C6));
  const hz = 0.5 * z, u = 1.0 - hz;
  return u + (((1.0 - u) - hz) + (z * r - x * y));
}
/* reducción a [-pi/4, pi/4]: devuelve el cuadrante y el resto en dos partes (alto + bajo) */
const DM_RED = [0, 0];
function dmReduce(x) {
  const fn = (x * DM_INVPIO2 + DM_TOINT) - DM_TOINT;
  const r = x - fn * DM_PIO2_1, w = fn * DM_PIO2_1T, y0 = r - w;
  DM_RED[0] = y0; DM_RED[1] = (r - y0) - w;
  return fn;
}
function msin(x) {
  if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
  if (x <= 0.7853981633974483 && x >= -0.7853981633974483) return x === 0 ? x : dmKSin(x, 0, 0);
  const n = dmReduce(x) & 3, a = DM_RED[0], b = DM_RED[1];
  if (n === 0) return dmKSin(a, b, 1);
  if (n === 1) return dmKCos(a, b);
  if (n === 2) return -dmKSin(a, b, 1);
  return -dmKCos(a, b);
}
function mcos(x) {
  if (!(x === x) || x === Infinity || x === -Infinity) return NaN;
  if (x <= 0.7853981633974483 && x >= -0.7853981633974483) return dmKCos(x, 0);
  const n = dmReduce(x) & 3, a = DM_RED[0], b = DM_RED[1];
  if (n === 0) return dmKCos(a, b);
  if (n === 1) return -dmKSin(a, b, 1);
  if (n === 2) return -dmKCos(a, b);
  return dmKSin(a, b, 1);
}
const DM_ATANHI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const DM_ATANLO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const DM_AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
  9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
  4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
function dmAtan(x) {
  if (!(x === x)) return NaN;
  const neg = x < 0;
  let ax = neg ? -x : x, id;
  if (ax >= 7.378697629483821e19) { const r = DM_ATANHI[3] + DM_ATANLO[3]; return neg ? -r : r; }
  if (ax < 0.4375) {
    if (ax < 7.450580596923828e-9) return x;
    id = -1;
  } else if (ax < 1.1875) {
    if (ax < 0.6875) { id = 0; ax = (2.0 * ax - 1.0) / (2.0 + ax); } else { id = 1; ax = (ax - 1.0) / (ax + 1.0); }
  } else if (ax < 2.4375) { id = 2; ax = (ax - 1.5) / (1.0 + 1.5 * ax); } else { id = 3; ax = -1.0 / ax; }
  const z = ax * ax, w = z * z, A = DM_AT;
  const s1 = z * (A[0] + w * (A[2] + w * (A[4] + w * (A[6] + w * (A[8] + w * A[10])))));
  const s2 = w * (A[1] + w * (A[3] + w * (A[5] + w * (A[7] + w * A[9]))));
  if (id < 0) { const r = ax - ax * (s1 + s2); return neg ? -r : r; }
  const r = DM_ATANHI[id] - ((ax * (s1 + s2) - DM_ATANLO[id]) - ax);
  return neg ? -r : r;
}
const DM_PI = 3.1415926535897931160E+00, DM_PI_LO = 1.2246467991473531772E-16;
function matan2(y, x) {
  if (!(x === x) || !(y === y)) return NaN;
  if (x === 1.0) return dmAtan(y);
  const m = ((y < 0 || (y === 0 && 1 / y < 0)) ? 1 : 0) | ((x < 0 || (x === 0 && 1 / x < 0)) ? 2 : 0);
  if (y === 0) return m === 0 || m === 1 ? y : m === 2 ? DM_PI : -DM_PI;
  if (x === 0) return (m & 1) ? -DM_PI / 2 : DM_PI / 2;
  const z = dmAtan(Math.abs(y / x));
  if (m === 0) return z;
  if (m === 1) return -z;
  if (m === 2) return DM_PI - (z - DM_PI_LO);
  return (z - DM_PI_LO) - DM_PI;
}
function mhypot(x, y) { return Math.sqrt(x * x + y * y); }
const DM_LN2HI = 6.93147180369123816490e-01, DM_LN2LO = 1.90821492927058770002e-10, DM_INVLN2 = 1.44269504088896338700e+00;
const DM_P1 = 1.66666666666666019037e-01, DM_P2 = -2.77777777770155933842e-03, DM_P3 = 6.61375632143793436117e-05,
  DM_P4 = -1.65339022054652515390e-06, DM_P5 = 4.13813679705723846039e-08;
function mexp(x) {
  if (!(x === x)) return NaN;
  if (x > 709.78) return Infinity;
  if (x < -745.13) return 0;
  let k = 0, hi = x, lo = 0;
  const ax = x < 0 ? -x : x;
  if (ax > 0.34657359027997264) {
    k = Math.trunc(DM_INVLN2 * x + (x < 0 ? -0.5 : 0.5));
    hi = x - k * DM_LN2HI; lo = k * DM_LN2LO; x = hi - lo;
  } else if (ax < 3.725290298461914e-9) return 1 + x;
  else { hi = x; lo = 0; }
  const xx = x * x, c = x - xx * (DM_P1 + xx * (DM_P2 + xx * (DM_P3 + xx * (DM_P4 + xx * DM_P5))));
  let y = 1 + (x * c / (2 - c) - lo + hi);
  /* multiplicar por 2^k es exacto (no hay subnormales en los rangos del juego) */
  while (k > 0) { y *= 2; k--; }
  while (k < 0) { y *= 0.5; k++; }
  return y;
}

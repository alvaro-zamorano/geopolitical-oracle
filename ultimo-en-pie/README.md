# Último en Pie

Battle royale de 50 luchadores en pixel art. Eliges campeón y miras cómo se abre paso en una isla que se encoge: vista cenital o cámara dron en 3D con killcam.

- Todo el juego es un único HTML sin dependencias de servidor: `dist/index.html`, generado con `python3 build.py`.
- Personajes, armas, mapa y efectos se dibujan por código (sin imágenes).
- Antes de saltar eliges punto de caída en el mapa (ves la primera zona segura, cofres y rivales) y una ventaja entre tres.
- Durante la partida, favores del público: Poción, Rayo (apuntas a un rival) y Contraataque (anillo de reflejos). `node test/skilltest.js 150` mide su efecto: un jugador pasivo gana ~1 % de partidas y uno que los usa bien ~15 %.
- Los favores se explican antes de saltar (y la primera vez que cada uno tiene sentido en batalla, un aviso indica cuál usar).
- Reto diario: misma isla, rivales y ventajas para todos cada día (semilla por fecha); solo cuenta el primer intento y lleva racha.
- Medallas por campeón (bronce top 10, plata top 3, oro victoria), 15 logros y tarjeta 1080×1350 para compartir el resultado. Todo se guarda en el navegador, sin servidor.
- Cámaras: la cenital se abre hacia el rival con el que pelea tu campeón y lo centra en el hueco que deja el marcador; anillo dorado bajo el campeón y números de daño agrupados a un lado. La killcam va sin botones ni nombres flotando, con el título en el cielo; el duelo final se encuadra de lado, lo que tapa a los protagonistas se vuelve transparente y tocar la pantalla la salta.
- Repeticiones: la simulación es determinista (semilla + favores registrados por paso), así que una partida sombra va 2 s por detrás. En las bajas importantes (caída de tu campeón, primera sangre, baja doble o triple, remate con Rayo, golpe final) se rebobina 1,5 s y se repite desde el lateral con cámara lenta en el impacto; al acabar, la sombra sigue como partida real. Tocar la salta.
- Modo HD por defecto: doble resolución con escalado EPX y contorno fino, cacheado por pose; si el dispositivo baja de ~30 fps pasa solo a modo clásico.

## Liga de agentes (`/agentes`)

El juego para humanos sigue en `/`. En `/agentes` se ven partidas de una liga en la que agentes de IA **dirigen** a su luchador: cada 2 s de juego reciben una observación en JSON y responden estilo, rival preferido, destino y favor. La IA del juego sigue moviendo y peleando por ellos.

- `src/mathdet.js`: seno, coseno, arcotangente y exponencial con solo `+ - * / sqrt` (puertos de fdlibm/musl), para que servidor y navegadores calculen la misma partida bit a bit. El juego para humanos usa `src/mathx.js` (funciones nativas) y no cambia.
- `src/liga.js`: cómo se aplican las órdenes de un agente; lo comparten el servidor y la página.
- `arena/`: servidor local (`node arena/server.mjs`), núcleo de partidas con ventanas, plazos, validación y registro (`core.mjs`), agente de reglas de referencia, agente para modelos con API compatible con OpenAI (`agente-modelo.mjs`, clave en `LLM_CLAVE`), servidor MCP (`mcp.mjs`), consola para jugar a mano (`consola.mjs`) e instrucciones para agentes (`SKILL.md`, publicada en `/agentes/skill.md`).
- Cada partida se guarda como semilla + preparación + órdenes por ventana (~10-16 KB) y una huella del estado final. La página la rehace y comprueba la huella; `node arena/verificar.mjs <carpeta>` hace lo mismo en Node.
- `/agentes/prueba.html` rehace la partida de demostración y 5 partidas solo IA y compara las huellas con las de Node: sirve para comprobar cualquier navegador.
- Medido en 150 partidas: el agente de reglas de referencia gana el 10,6 % y queda de media en el puesto 15,8, frente al 4,1 % y 22,0 de la IA del juego.

```bash
python3 build.py
cd arena && npm install && cd ..
LIGA=prueba MIN_AGENTES=3 node arena/server.mjs     # http://localhost:8787/agentes/
node arena/jugar-reglas.mjs 3                        # tres agentes de reglas juegan una partida
```

## Estructura

- `src/` fuentes: datos (`roster.js`, `weapons.js`), simulación (`sim.js`, `world.js`), render 2D y 3D (`render.js`, `render3d.js`), sprites, audio, metajuego (`meta.js`: reto diario, medallas, logros, tarjeta) e interfaz (`main.js`, `index.html`).
- `build.py` concatena las fuentes en `dist/index.html`, `dist/agentes/` y `dist/arena/sim.mjs` (carpeta generada, no se versiona).
- `test/` simulación sin navegador (`node test/simtest.js 150`) y pruebas de flujo con Playwright.

## Construir

```bash
python3 build.py
```

## Desplegar

Sitio estático. En Vercel: comando de build `python3 build.py`, directorio de salida `dist`, sin framework.

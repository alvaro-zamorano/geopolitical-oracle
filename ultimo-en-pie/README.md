# Último en Pie

Battle royale de 50 luchadores en pixel art. Eliges campeón y miras cómo se abre paso en una isla que se encoge: vista cenital o cámara dron en 3D con killcam.

- Todo el juego es un único HTML sin dependencias de servidor: `dist/index.html`, generado con `python3 build.py`.
- Personajes, armas, mapa y efectos se dibujan por código (sin imágenes).
- Antes de saltar eliges punto de caída en el mapa (ves la primera zona segura, cofres y rivales) y una ventaja entre tres.
- Durante la partida, favores del público: Poción, Rayo (apuntas a un rival) y Contraataque (anillo de reflejos). `node test/skilltest.js 150` mide su efecto: un jugador pasivo gana ~1 % de partidas y uno que los usa bien ~15 %.
- Modo HD por defecto: doble resolución con escalado EPX y contorno fino, cacheado por pose; si el dispositivo baja de ~30 fps pasa solo a modo clásico.

## Estructura

- `src/` fuentes: datos (`roster.js`, `weapons.js`), simulación (`sim.js`, `world.js`), render 2D y 3D (`render.js`, `render3d.js`), sprites, audio e interfaz (`main.js`, `index.html`).
- `build.py` concatena las fuentes en `dist/index.html` (carpeta generada, no se versiona).
- `test/` simulación sin navegador (`node test/simtest.js 150`) y pruebas de flujo con Playwright.

## Construir

```bash
python3 build.py
```

## Desplegar

Sitio estático. En Vercel: comando de build `python3 build.py`, directorio de salida `dist`, sin framework.

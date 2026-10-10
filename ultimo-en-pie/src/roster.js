/* ===== personalidades y roster ===== */
const PERS = {
  agresivo:  { n: 'Agresivo',  d: 'Busca pelea desde el primer segundo.',              aggr: 0.9,  flee: 0.15, loot: 0.35, skill: 0.55 },
  cazador:   { n: 'Cazador',   d: 'Huele la sangre y persigue a los heridos.',          aggr: 0.75, flee: 0.25, loot: 0.45, skill: 0.7, weak: 1 },
  tactico:   { n: 'Táctico',   d: 'Elige sus combates y apunta mejor que nadie.',       aggr: 0.6,  flee: 0.3,  loot: 0.6,  skill: 0.88, weak: 0.6 },
  cauto:     { n: 'Cauto',     d: 'Evita el lío hasta que le conviene.',                aggr: 0.4,  flee: 0.38, loot: 0.7,  skill: 0.72 },
  saqueador: { n: 'Saqueador', d: 'Primero el botín. Luego, si eso, los golpes.',       aggr: 0.45, flee: 0.35, loot: 1,    skill: 0.6 },
  caotico:   { n: 'Caótico',   d: 'Nadie sabe qué va a hacer. Ni él.',                  aggr: 0.6,  flee: 0.15, loot: 0.4,  skill: 0.45, chaos: 1 },
  berserker: { n: 'Berserker', d: 'No huye jamás. Pega más fuerte cuanto más herido.',  aggr: 1,    flee: 0,    loot: 0.25, skill: 0.5,  rage: 1 },
  honorable: { n: 'Honorable', d: 'Acepta cualquier duelo y nunca se mete en peleas ajenas.', aggr: 0.65, flee: 0.2, loot: 0.5, skill: 0.78, duel: 1 }
};

const BUILDS = {
  s: { tl: 5, tr: 10, legs: [[5, 2], [9, 2]], hp: 92,  spd: 50, mass: 0.85, n: 'Ligero' },
  n: { tl: 4, tr: 11, legs: [[5, 2], [9, 2]], hp: 105, spd: 46, mass: 1,    n: 'Normal' },
  h: { tl: 3, tr: 12, legs: [[4, 3], [9, 3]], hp: 122, spd: 41, mass: 1.3,  n: 'Pesado' }
};

const SKIN = { p: '#f3cfa8', l: '#e2aa7e', m: '#c68a55', d: '#8d5a32', k: '#5e3b24' };

/* sk piel · h pelo · hc color de pelo · g tocado · gc color del tocado · fa rasgos · fc color barba
   b ropa · c1 c2 c3 colores · bd complexión · x extras · xc color extra · w arma · p personalidad · m modificadores */
const ROSTER = [
  { id: 'sir-oxido', n: 'Sir Óxido', t: 'El caballero chirriante', sk: SKIN.l, h: 'none', g: 'helm', gc: '#9097a0', b: 'armor', c1: '#9aa0a6', c2: '#5b5f66', c3: '#c0392b', bd: 'n', x: ['cape'], xc: '#7a1f2b', w: 'espada', p: 'honorable', m: { hp: 12, spd: -3 },
    bio: 'Lleva cuarenta años dentro de la armadura. Nadie sabe si queda alguien ahí.' },
  { id: 'valkyria', n: 'Valkyria', t: 'La que vino del norte', sk: SKIN.p, h: 'braids', hc: '#f1d36b', g: 'horns', gc: '#8a8f96', b: 'tunic', c1: '#3d6fa8', c2: '#6b4a2b', c3: '#c9a227', bd: 'n', x: ['pads'], xc: '#b9b2a6', w: 'hacha', p: 'agresivo', m: { hp: 6 },
    bio: 'Juró no volver a casa sin cincuenta cabezas. Lleva treinta y siete.' },
  { id: 'abuela', n: 'Abuela Remedios', t: 'Terror del mercadillo', sk: SKIN.l, h: 'bun', hc: '#d8d8d8', g: 'none', fa: ['glasses'], b: 'bata', c1: '#5b3a7a', c2: '#3a2850', c3: '#f2a6c8', bd: 's', w: 'chancla', p: 'cazador', m: { luck: 0.05 },
    bio: 'Ha criado a nueve hijos y catorce nietos. Esto es un paseo.' },
  { id: 'kenji', n: 'Kenji', t: 'Ronin sin amo', sk: SKIN.m, h: 'ponytail', hc: '#1d1a1f', g: 'none', fa: ['scar', 'angry'], b: 'kimono', c1: '#2f4f8a', c2: '#1e2a44', c3: '#e8e2d0', bd: 'n', w: 'katana', p: 'tactico',
    bio: 'Habla poco. Corta mucho.' },
  { id: 'sombra', n: 'Sombra', t: 'Nadie la ve venir', sk: SKIN.m, h: 'none', g: 'ninja', gc: '#2a2731', b: 'ninja', c1: '#2a2731', c2: '#1c1a21', c3: '#c0392b', bd: 's', x: ['scarf'], xc: '#c0392b', w: 'shuriken', p: 'cazador', m: { spd: 4 },
    bio: 'Si la ves, ya es tarde. Si no la ves, también.' },
  { id: 'voltio', n: 'Dr. Voltio', t: 'Científico sin licencia', sk: SKIN.p, h: 'wild', hc: '#f4f4f4', g: 'none', fa: ['goggles'], b: 'coat', c1: '#f0f0ea', c2: '#3a3f4b', c3: '#57c7ff', bd: 'n', w: 'rayo', p: 'caotico',
    bio: 'Su tesis fue sobre electrocutar cosas. Sacó matrícula de honor.' },
  { id: 'pyra', n: 'Pyra', t: 'Hechicera de ceniza', sk: SKIN.p, h: 'long', hc: '#e5462c', g: 'none', fa: ['paint'], fc: '#2a1414', b: 'robe', c1: '#a3202a', c2: '#5e1018', c3: '#f2b33d', bd: 's', w: 'fuego', p: 'agresivo',
    bio: 'Le pidieron que encendiera la barbacoa. Ardió medio pueblo.' },
  { id: 'escarcha', n: 'Escarcha', t: 'El último invierno', sk: '#cfe3f0', h: 'long', hc: '#e8f6ff', g: 'hood', gc: '#7fb7e0', fa: ['glow'], b: 'robe', c1: '#5d9fd1', c2: '#2f5f8a', c3: '#e8f6ff', bd: 'n', w: 'hielo', p: 'cauto',
    bio: 'No ha sudado en su vida. Ni una gota.' },
  { id: 'tano', n: 'Gordo Tano', t: 'Carnicero de barrio', sk: SKIN.l, h: 'short', hc: '#3a2a1e', g: 'none', fa: ['mustache'], fc: '#3a2a1e', b: 'apron', c1: '#ece7de', c2: '#7a2f2f', c3: '#b0302a', bd: 'h', w: 'cuchilla', p: 'agresivo', m: { hp: 8 },
    bio: 'Cuarto y mitad de lo que haga falta.' },
  { id: 'parca', n: 'La Parca', t: 'Viene a por todos', sk: '#e8e0c8', h: 'none', g: 'hood', gc: '#1d1a22', fa: ['skull'], b: 'robe', c1: '#1d1a22', c2: '#0f0d12', c3: '#3a3445', bd: 'n', w: 'guadana', p: 'cazador',
    bio: 'Técnicamente está de vacaciones. Técnicamente.' },
  { id: 'bruno', n: 'Bruno', t: 'Leñador con prisas', sk: SKIN.l, h: 'short', hc: '#5a3a1e', g: 'beanie', gc: '#c0392b', fa: ['beard'], fc: '#6b3d1e', b: 'flannel', c1: '#b8352f', c2: '#3b4a6b', c3: '#2a1f1f', bd: 'h', w: 'motosierra', p: 'agresivo', m: { hp: 6, spd: -2 },
    bio: 'Vino a talar un árbol. Le dijeron que había premio.' },
  { id: 'ramirez', n: 'Sheriff Ramírez', t: 'La ley del desierto', sk: SKIN.m, h: 'short', hc: '#2b211b', g: 'cowboy', gc: '#8a5a2b', fa: ['mustache'], fc: '#2b211b', b: 'jacket', c1: '#a86f3a', c2: '#3c4a6a', c3: '#f2c14e', bd: 'n', w: 'revolver', p: 'tactico',
    bio: 'Desenfunda antes de pensar. Por eso sigue vivo.' },
  { id: 'sal', n: 'Capitana Sal', t: 'Reina de los siete mares', sk: SKIN.m, h: 'long', hc: '#3b1f12', g: 'pirate', gc: '#23202a', fa: ['eyepatch'], b: 'jacket', c1: '#7a1f2b', c2: '#2e2a35', c3: '#f2c14e', bd: 'n', w: 'trabuco', p: 'saqueador',
    bio: 'Huele a pólvora y a sardina. Dispara a todo lo que brilla.' },
  { id: 'zorg', n: 'Zorg', t: 'Turista intergaláctico', sk: '#7cc96b', h: 'none', g: 'antenna', gc: '#c7f464', fa: ['alien'], b: 'space', c1: '#8a5bd6', c2: '#4b3285', c3: '#c7f464', bd: 's', w: 'laser', p: 'caotico',
    bio: 'Vino a estudiar a los humanos. Ya ha estudiado a seis.' },
  { id: 'r7', n: 'Unidad R-7', t: 'Exterminador de serie', sk: '#a9b2bb', h: 'none', g: 'robot', gc: '#7d8792', fa: ['visor'], b: 'robot', c1: '#7d8792', c2: '#4a525b', c3: '#ff3b3b', bd: 'n', w: 'rifle', p: 'tactico', m: { hp: 8, spd: -4 },
    bio: 'Programado para ganar. Le falta la actualización de empatía.' },
  { id: 'rocco', n: 'Rocco', t: 'Cuarenta combates, cero dientes', sk: SKIN.l, h: 'short', hc: '#2a1d14', g: 'none', fa: ['scar', 'angry'], b: 'boxer', c1: '#d23b3b', c2: '#d23b3b', c3: '#f2c14e', bd: 'n', w: 'guantes', p: 'agresivo', m: { hp: 10, spd: 3 },
    bio: 'Sigue esperando a que suene la campana.' },
  { id: 'lupe', n: 'Lupe La Furia', t: 'Luchadora enmascarada', sk: SKIN.m, h: 'none', g: 'luchador', gc: '#1fa3a3', b: 'tank', c1: '#1fa3a3', c2: '#1d4f6b', c3: '#f2c14e', bd: 'n', x: ['cape'], xc: '#f2c14e', w: 'punos', p: 'berserker', m: { hp: 14, spd: 3, str: 1.15 },
    bio: 'Nunca se ha quitado la máscara. Ni para dormir.' },
  { id: 'nia', n: 'Nía', t: 'Arquera del bosque', sk: SKIN.p, h: 'long', hc: '#e8d7a0', g: 'elf', gc: '#3f7a3a', b: 'tunic', c1: '#4f8a3e', c2: '#5a3d24', c3: '#c9a227', bd: 's', x: ['quiver'], xc: '#7a4a24', w: 'arco', p: 'cauto', m: { spd: 3 },
    bio: 'Acierta a una manzana a doscientos metros. Y a lo que no es manzana.' },
  { id: 'ulf', n: 'Ulf', t: 'Cazador de lobos', sk: SKIN.l, h: 'none', g: 'wolfhood', gc: '#8b8b92', fa: ['beard'], fc: '#8a6a3a', b: 'fur', c1: '#6b4a2b', c2: '#4a3520', c3: '#9a9a9a', bd: 'h', w: 'ballesta', p: 'cazador',
    bio: 'Lleva puesto a su último rival.' },
  { id: 'paco', n: 'Paco Petardo', t: 'Pirotécnico fallero', sk: SKIN.l, h: 'short', hc: '#3a2a1e', g: 'cap', gc: '#e8762b', fa: ['goggles', 'mustache'], fc: '#3a2a1e', b: 'jacket', c1: '#e8762b', c2: '#33303a', c3: '#f2c14e', bd: 'n', x: ['bandolier'], xc: '#24212b', w: 'bombas', p: 'caotico',
    bio: 'Perdió dos dedos en las Fallas. Le quedan ocho.' },
  { id: 'gaston', n: 'Chef Gastón', t: 'Estrella Michelin caída', sk: SKIN.p, h: 'short', hc: '#1d1a1f', g: 'chef', gc: '#ffffff', fa: ['mustache'], fc: '#1d1a1f', b: 'chef', c1: '#f4f4f0', c2: '#2e2e36', c3: '#c0392b', bd: 'n', w: 'sarten', p: 'tactico',
    bio: 'Te va a servir un plato. Frío. Como la venganza.' },
  { id: 'reina', n: 'Reina Carmesí', t: 'Colecciona cabezas', sk: SKIN.p, h: 'long', hc: '#1a1012', g: 'crown', gc: '#f2c14e', b: 'dress', c1: '#b0172e', c2: '#5e0a18', c3: '#f2c14e', bd: 's', x: ['cape'], xc: '#5e0a18', w: 'estoque', p: 'cazador',
    bio: 'Su frase favorita es «que le corten la cabeza». La dice en serio.' },
  { id: 'triton', n: 'Tritón', t: 'Hijo de la marea', sk: '#4fa3c7', h: 'long', hc: '#2e6e6e', g: 'fins', gc: '#7fe0d8', fa: ['beard'], fc: '#2e6e6e', b: 'scales', c1: '#2f8f8a', c2: '#1f5e5c', c3: '#f2c14e', bd: 'n', w: 'tridente', p: 'tactico',
    bio: 'Fuera del agua se pone de muy mal humor.' },
  { id: 'toro', n: 'El Toro', t: 'Media tonelada de enfado', sk: '#7a4a2c', h: 'none', g: 'bullhorns', gc: '#efe6d0', fa: ['nosering', 'angry'], b: 'fur', c1: '#5e3a22', c2: '#3a2414', c3: '#c9a227', bd: 'h', w: 'hachaD', p: 'berserker', m: { hp: 16, spd: -2 },
    bio: 'No ve bien. Embiste a todo lo que se mueve. Y a lo que no.' },
  { id: 'azufre', n: 'Azufre', t: 'Diablillo del sótano', sk: '#c43c2c', h: 'short', hc: '#2a1f1f', g: 'horns2', gc: '#2a1f1f', fa: ['fangs', 'angry'], b: 'tank', c1: '#2a1f1f', c2: '#1a1414', c3: '#ff8a1a', bd: 's', x: ['tail', 'fueltank'], xc: '#c43c2c', w: 'lanzallamas', p: 'agresivo',
    bio: 'Lo echaron del infierno por pirómano.' },
  { id: 'lagzilla', n: 'Lagzilla', t: 'Campeón de partidas igualadas', sk: '#f0d6c0', h: 'messy', hc: '#3a2a1e', g: 'headphones', gc: '#2b2b33', fa: ['glasses'], b: 'hoodie', c1: '#2b2b33', c2: '#1e1e24', c3: '#3df57a', bd: 's', w: 'teclado', p: 'caotico', m: { luck: 0.06 },
    bio: 'No ve la luz del sol desde 2019. Hoy le da igual.' },
  { id: 'sofi', n: 'Selfie Sofi', t: '2,3 millones de seguidores', sk: SKIN.l, h: 'ponytail', hc: '#f28ac0', g: 'none', fa: ['shades'], b: 'crop', c1: '#ffffff', c2: '#7a4fd1', c3: '#f28ac0', bd: 's', w: 'palo', p: 'saqueador', m: { spd: 4 },
    bio: 'Si no lo sube a stories, no ha pasado.' },
  { id: 'anselmo', n: 'Don Anselmo', t: 'Inspector de obras jubilado', sk: SKIN.l, h: 'baldside', hc: '#cfcfcf', g: 'boina', gc: '#2e2e36', fa: ['glasses', 'mustache'], fc: '#cfcfcf', b: 'cardigan', c1: '#8a7a5a', c2: '#5a5048', c3: '#d8cfb0', bd: 'n', w: 'baston', p: 'cauto', m: { hp: -6, luck: 0.08 },
    bio: 'Ha visto de todo. Esto le parece una tontería.' },
  { id: 'guiri', n: 'Mister Guiri', t: 'Vacaciones todo incluido', sk: '#f08a7a', h: 'short', hc: '#f2d38a', g: 'bucket', gc: '#f2e6c0', fa: ['shades'], b: 'hawaii', c1: '#2fb5a8', c2: '#efe2bd', c3: '#f2c14e', bd: 'h', w: 'sombrilla', p: 'saqueador',
    bio: 'Vino a por sangría. Encontró sangre.' },
  { id: 'ramses', n: 'Ramsés', t: 'Momia con resaca', sk: '#e3d9bd', h: 'none', g: 'mummy', gc: '#bfb391', fa: ['glow'], b: 'wraps', c1: '#d8cdae', c2: '#bfb391', c3: '#7a6a4a', bd: 's', w: 'maldicion', p: 'cauto', m: { hp: 6, spd: -4 },
    bio: 'Durmió tres mil años. Se ha levantado de muy mal humor.' },
  { id: 'conde', n: 'Conde Nocturno', t: 'Solo bebe zumo de tomate', sk: '#e9e3e6', h: 'slick', hc: '#14101a', g: 'none', fa: ['fangs'], b: 'suit', c1: '#1b1720', c2: '#14101a', c3: '#b0172e', bd: 'n', x: ['cape'], xc: '#b0172e', w: 'garras', p: 'cazador',
    bio: 'Solo bebe zumo de tomate. Eso dice él.' },
  { id: 'pepe', n: 'Pepe Zombi', t: 'Murió en 2009', sk: '#8fae7a', h: 'messy', hc: '#3a3328', g: 'none', fa: ['stitch'], b: 'rags', c1: '#6b7a8a', c2: '#4a4038', c3: '#8a2a2a', bd: 'n', w: 'mordisco', p: 'berserker', m: { hp: 18, spd: -7 },
    bio: 'Murió en 2009 y nadie se lo ha dicho.' },
  { id: 'aullido', n: 'Aullido', t: 'Hombre lobo a media jornada', sk: '#8c8c94', h: 'none', g: 'wolf', gc: '#6e6e78', fa: ['glow'], b: 'fur', c1: '#6e6e78', c2: '#3a3f5a', c3: '#ff4040', bd: 'h', x: ['tail'], xc: '#6e6e78', w: 'garras', p: 'agresivo', m: { spd: 4 },
    bio: 'Los martes es contable. Hoy no es martes.' },
  { id: 'copo', n: 'Copo', t: 'Yeti de la sierra', sk: '#f2f6fa', h: 'none', g: 'yeti', gc: '#dfe7ef', b: 'fur', c1: '#e8eef4', c2: '#cbd8e4', c3: '#7fb7e0', bd: 'h', w: 'punos', p: 'cauto', m: { hp: 22, spd: -3, str: 1.25 },
    bio: 'Tímido. Muy tímido. Pesa trescientos kilos.' },
  { id: 'paja', n: 'Paja', t: 'Espantapájaros del trigal', sk: '#d9c48a', h: 'none', g: 'straw', gc: '#e2c15a', fa: ['buttoneyes'], b: 'patched', c1: '#6a7f3a', c2: '#5a6aa0', c3: '#e2c15a', bd: 's', w: 'horca', p: 'cazador', m: { hp: -4, spd: 2 },
    bio: 'Los cuervos le tienen miedo. Los humanos deberían.' },
  { id: 'risitas', n: 'Risitas', t: 'Payaso de cumpleaños', sk: '#f4f4f4', h: 'afro', hc: '#ff7a1a', g: 'none', fa: ['clown'], b: 'clown', c1: '#e8402f', c2: '#2f6fe8', c3: '#f2d23a', bd: 'n', w: 'mazo', p: 'caotico',
    bio: 'Animó quinientos cumpleaños. Nadie le pagó ninguno.' },
  { id: 'cosmo', n: 'Cosmo', t: 'Astronauta extraviado', sk: SKIN.l, h: 'short', hc: '#7a4a24', g: 'space', gc: '#dfe8f0', b: 'space', c1: '#eef1f5', c2: '#c9d1dc', c3: '#e8762b', bd: 'n', x: ['backpack'], xc: '#c9d1dc', w: 'plasma', p: 'tactico',
    bio: 'Despegó en 1998. Aterrizó aquí. Sigue confuso.' },
  { id: 'tomoe', n: 'Tomoe', t: 'Samurái de hierro', sk: SKIN.m, h: 'none', g: 'kabuto', gc: '#2a2a33', fa: ['menpo'], b: 'armor', c1: '#8a1f2b', c2: '#2a2a33', c3: '#f2c14e', bd: 'n', w: 'naginata', p: 'honorable',
    bio: 'Su honor es inquebrantable. Su naginata, también.' },
  { id: 'gorgo', n: 'Gorgo', t: 'Bárbaro de las estepas', sk: SKIN.m, h: 'long', hc: '#1a1410', g: 'none', fa: ['paint', 'angry'], fc: '#2f6fe8', b: 'barbarian', c1: '#6b4a2b', c2: '#4a3520', c3: '#9aa0a6', bd: 'h', w: 'espadon', p: 'berserker', m: { hp: 8 },
    bio: 'Sabe contar hasta tres. Con eso le basta.' },
  { id: 'bisturi', n: 'Doctora Bisturí', t: 'Cirujana de urgencias', sk: SKIN.l, h: 'none', g: 'surgcap', gc: '#3fa38a', fa: ['mask'], b: 'scrubs', c1: '#3fa38a', c2: '#2e7a68', c3: '#ffffff', bd: 's', w: 'bisturi', p: 'cazador', m: { spd: 3 },
    bio: 'Te deja como nuevo. O en piezas. Depende del día.' },
  { id: 'pichichi', n: 'El Pichichi', t: 'Delantero de regional', sk: SKIN.m, h: 'spiky', hc: '#1d1a1f', g: 'none', b: 'jersey', c1: '#e8402f', c2: '#1d1d24', c3: '#ffffff', bd: 's', w: 'balon', p: 'agresivo', m: { spd: 5 },
    bio: 'Dos goles en diez temporadas. Hoy va a por más.' },
  { id: 'mcflow', n: 'MC Flow', t: 'Rimas que rompen tímpanos', sk: SKIN.d, h: 'short', hc: '#1b1410', g: 'capB', gc: '#f2c14e', fa: ['shades'], b: 'hoodie', c1: '#7a4fd1', c2: '#1d1d24', c3: '#f2c14e', bd: 'n', x: ['chain'], xc: '#f2c14e', w: 'altavoz', p: 'caotico',
    bio: 'Su última maqueta dejó sordo a un barrio entero.' },
  { id: 'raiz', n: 'Raíz', t: 'Druida del bosque viejo', sk: SKIN.m, h: 'none', g: 'hood', gc: '#5a4a2a', fa: ['beard'], fc: '#e8e8e0', b: 'robe', c1: '#4a6b2f', c2: '#3a2f1e', c3: '#a8d06a', bd: 'n', w: 'espinas', p: 'cauto',
    bio: 'Habla con los árboles. Los árboles le dicen a quién matar.' },
  { id: 'neon', n: 'Neón', t: 'Cyborg de la ciudad baja', sk: SKIN.l, h: 'side', hc: '#3df5ff', g: 'none', fa: ['implant'], b: 'jacket', c1: '#1d1d2b', c2: '#2b2b3f', c3: '#ff3df0', bd: 's', w: 'katanaL', p: 'cazador', m: { spd: 3 },
    bio: 'Mitad humana, mitad tostadora. Toda peligro.' },
  { id: 'carmela', n: 'Carmela', t: 'Bailaora de tablao', sk: SKIN.m, h: 'bun', hc: '#14101a', g: 'flower', gc: '#e8402f', b: 'dress', c1: '#e8402f', c2: '#9a1a1a', c3: '#ffffff', bd: 's', w: 'abanico', p: 'tactico',
    bio: 'Taconea a doscientos golpes por minuto. Su abanico corta.' },
  { id: 'juan', n: 'Marinero Juan', t: 'Lobo de mar', sk: SKIN.l, h: 'none', g: 'souwester', gc: '#f2c81a', fa: ['beard'], fc: '#e8e8e0', b: 'raincoat', c1: '#f2c81a', c2: '#2e3a4a', c3: '#14101a', bd: 'h', w: 'arpon', p: 'cauto', m: { hp: 6 },
    bio: 'Ha pescado tiburones a mano. El arpón es por comodidad.' },
  { id: 'lin', n: 'Maestra Lin', t: 'Kung-fu de barrio', sk: SKIN.p, h: 'bun', hc: '#14101a', g: 'none', fa: ['angry'], b: 'kungfu', c1: '#e8402f', c2: '#14101a', c3: '#f2c14e', bd: 's', w: 'bo', p: 'tactico', m: { spd: 4 },
    bio: 'Da clases los jueves. Hoy da clases gratis.' },
  { id: 'lola', n: 'Lola', t: 'Bombera de guardia', sk: SKIN.l, h: 'ponytail', hc: '#7a3a1e', g: 'firehelm', gc: '#d63a2a', b: 'firefighter', c1: '#3a3f4b', c2: '#3a3f4b', c3: '#f2d23a', bd: 'n', w: 'hacha', p: 'honorable', m: { hp: 6 },
    bio: 'Apaga incendios. Y a quien los provoca.' },
  { id: 'tiopico', n: 'Tío Pico', t: 'Minero de los de antes', sk: SKIN.l, h: 'none', g: 'mining', gc: '#f2c81a', fa: ['beard'], fc: '#2a1f14', b: 'overall', c1: '#3a5a8a', c2: '#8a6a4a', c3: '#c9a227', bd: 'h', w: 'pico', p: 'tactico', m: { hp: 8 },
    bio: 'Treinta años bajo tierra. Aquí arriba hay demasiada luz.' },
  { id: 'rider', n: 'Rider Exprés', t: 'Entrega en 15 minutos', sk: SKIN.m, h: 'none', g: 'moto', gc: '#2fc46a', b: 'jacket', c1: '#2fc46a', c2: '#1d1d24', c3: '#ffffff', bd: 'n', x: ['delivery'], xc: '#2fc46a', w: 'cadena', p: 'saqueador', m: { spd: 6, hp: -4 },
    bio: 'Tu pedido llega. Tú no.' }
];

/* stats derivados */
for (let i = 0; i < ROSTER.length; i++) {
  const d = ROSTER[i];
  d.num = i + 1;
  d.weapon = WEAPONS[d.w];
  d.pers = PERS[d.p];
  d.fa = d.fa || [];
  d.x = d.x || [];
  d.m = d.m || {};
  const B = BUILDS[d.bd];
  d.hp = B.hp + (d.m.hp || 0);
  d.spd = B.spd + (d.m.spd || 0);
  d.str = d.m.str || 1;
  d.luck = d.m.luck || 0;
  d.mass = B.mass;
  d.stats = {
    vida: clamp(Math.round((d.hp - 80) / 64 * 10), 1, 10),
    fuerza: clamp(Math.round(weaponDps(d.weapon) * d.str / 46 * 10), 1, 10),
    velocidad: clamp(Math.round((d.spd - 32) / 22 * 10), 1, 10),
    alcance: clamp(Math.round(Math.sqrt(d.weapon.rng / 230) * 10), 1, 10)
  };
}
const ROSTER_BY_ID = Object.fromEntries(ROSTER.map((d) => [d.id, d]));

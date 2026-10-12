/* ===== cliente HTTP de la liga (lo usan el agente de reglas, el de referencia, el MCP y la consola) ===== */
export class Cliente {
  constructor(base, clave) { this.base = (base || 'http://localhost:8787').replace(/\/$/, ''); this.clave = clave || null; }
  async pedir(metodo, ruta, cuerpo) {
    const r = await fetch(this.base + ruta, {
      method: metodo,
      headers: Object.assign({ 'content-type': 'application/json' }, this.clave ? { authorization: 'Bearer ' + this.clave } : {}),
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
    });
    const txt = await r.text();
    let data; try { data = JSON.parse(txt); } catch (e) { data = { error: txt.slice(0, 200) }; }
    if (!r.ok && r.status !== 409) throw new Error((data && data.error) || ('HTTP ' + r.status));
    return data;
  }
  registro(nombre, modelo, script) { return this.pedir('POST', '/api/registro', { nombre, modelo, script: !!script }); }
  unirse() { return this.pedir('POST', '/api/unirse', {}); }
  turno(espera = 25000) { return this.pedir('GET', '/api/turno?espera=' + espera); }
  preparar(p) { return this.pedir('POST', '/api/turno', { preparacion: p }); }
  responder(ventana, respuesta) { return this.pedir('POST', '/api/turno', { ventana, respuesta }); }
  estado() { return this.pedir('GET', '/api/estado'); }
  partida(id) { return this.pedir('GET', '/api/partidas/' + id); }
}

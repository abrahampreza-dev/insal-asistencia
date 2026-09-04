export function aMayusculas(texto) {
  if (typeof texto !== 'string') return texto;
  return texto.toUpperCase();
}

export function sanearTextoUTF8(texto) {
  if (typeof texto !== 'string') return texto;

  let limpio = texto;

  // Reparar únicamente secuencias de mojibake reales (UTF-8 leído como Latin1).
  // IMPORTANTE 1: patrones multi-carácter ANTES que la regla genérica "Ã",
  // si no, la regla corta consume la primera letra y corrompe É/Ó/Ú/Ñ.
  // IMPORTANTE 2: se preserva mayúscula/minúscula (ya no hay toUpperCase global).
  const mapaReemplazos = [
    [/\uFFFD/g, ''],
    [/Â¿/g, '¿'],
    [/Â¡/g, '¡'],
    [/Âº/g, '°'],
    [/Ã‰/g, 'É'],
    [/Ã“/g, 'Ó'],
    [/Ãš/g, 'Ú'],
    [/Ã‘/g, 'Ñ'],
    [/Ã¡/g, 'á'],
    [/Ã©/g, 'é'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ãº/g, 'ú'],
    [/Ã±/g, 'ñ'],
    [/Ã¼/g, 'ü'],
    [/Ã\x81/g, 'Á'],
    [/Ã\x8d/gi, 'Í'],
    [/Ã/g, 'Á'],
  ];

  mapaReemplazos.forEach(([patron, reemplazo]) => {
    limpio = limpio.replace(patron, reemplazo);
  });

  return limpio;
}

export function sanearObjetoExamen(objeto) {
  if (!objeto || typeof objeto !== 'object') return objeto;

  const clon = JSON.parse(JSON.stringify(objeto));

  if (typeof clon.titulo === 'string') clon.titulo = sanearTextoUTF8(clon.titulo);
  if (typeof clon.descripcion === 'string') clon.descripcion = sanearTextoUTF8(clon.descripcion);
  if (typeof clon.creadoPor === 'string') clon.creadoPor = sanearTextoUTF8(clon.creadoPor);

  if (Array.isArray(clon.preguntas)) {
    clon.preguntas = clon.preguntas.map((p) => {
      if (typeof p.enunciado === 'string') p.enunciado = sanearTextoUTF8(p.enunciado);
      // Opciones pueden ser strings o {id,texto}
      if (Array.isArray(p.opciones)) {
        p.opciones = p.opciones.map((o) =>
          typeof o === 'string' ? sanearTextoUTF8(o) : typeof o?.texto === 'string' ? { ...o, texto: sanearTextoUTF8(o.texto) } : o
        );
      }
      // ORDENAR
      if (Array.isArray(p.items)) {
        p.items = p.items.map((it) => (typeof it === 'string' ? sanearTextoUTF8(it) : it));
      }
      // EMPAREJAR
      if (Array.isArray(p.pares)) {
        p.pares = p.pares.map((par) => ({
          ...par,
          izquierda: typeof par.izquierda === 'string' ? sanearTextoUTF8(par.izquierda) : par.izquierda,
          derecha: typeof par.derecha === 'string' ? sanearTextoUTF8(par.derecha) : par.derecha,
        }));
      }
      if (Array.isArray(p.opcionesDerecha)) {
        p.opcionesDerecha = p.opcionesDerecha.map((o) => (typeof o === 'string' ? sanearTextoUTF8(o) : o));
      }
      return p;
    });
  }

  return clon;
}

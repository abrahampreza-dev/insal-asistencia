import { generarId } from './rubricaService';

/** Limpia texto: quita caracteres de control, colapsa espacios, recorta y normaliza acentos (NFC). */
export function limpiarTexto(s) {
  const limpio = String(s ?? '')
    .split('')
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code !== 127 && !(code >= 0 && code <= 31);
    })
    .join('');
  return limpio.replace(/\s+/g, ' ').trim().normalize('NFC');
}

/** Convierte "1,0" o "1.0" a número. Devuelve null si no es numérico. */
export function parsearNumero(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim().replace(/\s+/g, '').replace(/,/g, '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Detecta el delimitador más usado fuera de comillas en la primera línea. */
function detectarDelimitador(texto) {
  const primera = String(texto).split(/\r?\n/, 1)[0];
  let fuera = true;
  const conteos = { ';': 0, ',': 0, '\t': 0 };
  for (const ch of primera) {
    if (ch === '"') fuera = !fuera;
    else if (fuera && conteos[ch] !== undefined) conteos[ch] += 1;
  }
  let mejor = ';';
  let max = 0;
  for (const d of [';', ',', '\t']) {
    if (conteos[d] > max) {
      max = conteos[d];
      mejor = d;
    }
  }
  return mejor;
}

/** Divide el texto en filas de celdas respetando comillas y saltos de línea internos. */
function csvALineas(texto, delim) {
  const t = String(texto).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const filas = [];
  let fila = [];
  let campo = '';
  let dentro = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dentro) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          campo += '"';
          i += 1;
        } else {
          dentro = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      dentro = true;
    } else if (c === delim) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

const CLAVES_META = new Set(['TITULO', 'DESCRIPCION', 'MATERIA', 'CRITERIO', 'CRITERIA', 'NOMBRE']);

/** Genera la plantilla CSV (UTF-8 con BOM) que los docentes llenan en Excel. */
export function plantillaRubricaCSV() {
  const filas = [
    ['TITULO', 'Presentación de Idea de Negocio'],
    ['DESCRIPCION', 'Rúbrica para evaluar la exposición grupal de la idea de negocio.'],
    ['MATERIA', ''],
    [],
    ['CRITERIO', 'PTS MAX', 'NIVEL 1', 'PTS 1', 'NIVEL 2', 'PTS 2', 'NIVEL 3', 'PTS 3'],
    ['Introducción del Proyecto', '1.0', 'Alto', '1.0', 'Medio', '0.8', 'Bajo', '0.5'],
    ['Objetivos SMART', '1.0', 'Alto', '1.0', 'Medio', '0.8', 'Bajo', '0.5'],
    ['Idea de Negocio + Teoría', '1.0', 'Alto', '1.0', 'Medio', '0.8', 'Bajo', '0.5'],
  ];
  const esc = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + filas.map((f) => f.map(esc).join(';')).join('\r\n');
}

/**
 * Interpreta el contenido de una plantilla y devuelve la rúbrica.
 * @returns {{ ok: true, data: { titulo, descripcion, materia, criterios }, delimitador } | { ok: false, errores: string[] }}
 */
export function parsearPlantillaRubrica(texto, materias = []) {
  const errores = [];
  let t = String(texto ?? '');
  t = t.replace(/^\uFEFF/, '');
  if (!t.trim()) return { ok: false, errores: ['El archivo está vacío.'] };

  const delimitador = detectarDelimitador(t);
  const filas = csvALineas(t, delimitador);
  if (filas.length === 0) return { ok: false, errores: ['El archivo no contiene filas.'] };

  let titulo = '';
  let descripcion = '';
  let materia = '';
  const criterios = [];

  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const primer = limpiarTexto(fila[0]);
    if (!primer) continue;

    const clave = primer.toUpperCase();
    if (clave === 'TITULO') {
      titulo = limpiarTexto(fila[1]);
      continue;
    }
    if (clave === 'DESCRIPCION') {
      descripcion = limpiarTexto(fila[1]);
      continue;
    }
    if (clave === 'MATERIA') {
      materia = limpiarTexto(fila[1]);
      continue;
    }
    if (clave.startsWith('#') || CLAVES_META.has(clave)) continue;

    if (fila.length < 2) {
      errores.push(`Fila ${i + 1}: se esperaba "CRITERIO; PTS MAX" pero solo se encontró "${primer}".`);
      continue;
    }

    const nombre = limpiarTexto(fila[0]);
    if (!nombre) {
      errores.push(`Fila ${i + 1}: el criterio no tiene nombre.`);
      continue;
    }
    if (nombre.length > 120) {
      errores.push(`Fila ${i + 1}: el nombre del criterio es demasiado largo (máx. 120).`);
      continue;
    }
    const maxPuntos = parsearNumero(fila[1]);
    if (maxPuntos === null || maxPuntos <= 0 || maxPuntos > 100) {
      errores.push(`Fila ${i + 1} ("${nombre}"): el puntaje máximo "${fila[1]}" no es válido.`);
      continue;
    }

    const niveles = [];
    for (let j = 2; j + 1 < fila.length; j += 2) {
      const etiqueta = limpiarTexto(fila[j]);
      if (!etiqueta) continue;
      const puntos = parsearNumero(fila[j + 1]);
      if (puntos === null || puntos < 0) {
        errores.push(`Fila ${i + 1} ("${nombre}"): los puntos del nivel "${etiqueta}" no son válidos.`);
        continue;
      }
      if (puntos > maxPuntos) {
        errores.push(`Fila ${i + 1} ("${nombre}"): el nivel "${etiqueta}" supera el puntaje máximo (${maxPuntos}).`);
        continue;
      }
      niveles.push({ etiqueta, puntos });
    }
    if (niveles.length === 0) {
      niveles.push(
        { etiqueta: 'Alto', puntos: maxPuntos },
        { etiqueta: 'Medio', puntos: Math.round(maxPuntos * 8) / 10 },
        { etiqueta: 'Bajo', puntos: Math.round(maxPuntos * 5) / 10 }
      );
    }

    criterios.push({ id: generarId('c'), nombre, maxPuntos, niveles });
  }

  if (criterios.length === 0) errores.push('No se encontró ningún criterio válido en la plantilla.');
  if (criterios.length > 50) errores.push('La plantilla tiene más de 50 criterios. Reduce la cantidad.');

  if (errores.length > 0) return { ok: false, errores };

  if (materia) {
    const norm = materia.toLowerCase();
    const encontrada = materias.find((m) => m.label.toLowerCase() === norm);
    materia = encontrada ? encontrada.id : '';
  }

  return {
    ok: true,
    delimitador,
    data: { titulo, descripcion, materia, criterios },
  };
}

/** Lee el archivo con codificación inteligente (UTF-8 con respaldo a Windows-1252 para tildes). */
export function leerArchivoRubrica(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se seleccionó ningún archivo.'));
      return;
    }
    if (file.size > 512 * 1024) {
      reject(new Error('El archivo supera los 512 KB.'));
      return;
    }
    const nombre = (file.name || '').toLowerCase();
    if (!/\.(csv|txt)$/.test(nombre)) {
      reject(new Error('Solo se permiten archivos .csv o .txt (Excel: guardar como "CSV UTF-8").'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      try {
        const buf = reader.result;
        let texto = new TextDecoder('utf-8').decode(buf);
        if (texto.includes('\uFFFD')) {
          texto = new TextDecoder('windows-1252').decode(buf);
        }
        resolve(texto);
      } catch {
        reject(new Error('No se pudo decodificar el archivo.'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}
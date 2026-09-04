import { TIPOS_PREGUNTA } from '../constants';

export const CABECERAS_PLANTILLA = [
  'tipo',
  'enunciado',
  'puntaje',
  'opciones',
  'opciones_correctas',
  'respuesta_correcta',
  'rubrica',
  'items',
  'orden_correcto',
  'pares_izquierda',
  'pares_derecha',
  'formula',
];

const TIPOS_ALIAS = {
  'opcion_multiple': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'opcion multiple': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'opción multiple': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'opción múltiple': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'multiple': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'opciones': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'seleccion multiple': TIPOS_PREGUNTA.OPCION_MULTIPLE,
  'verdadero_falso': TIPOS_PREGUNTA.VERDADERO_FALSO,
  'verdadero falso': TIPOS_PREGUNTA.VERDADERO_FALSO,
  'verdadero': TIPOS_PREGUNTA.VERDADERO_FALSO,
  'falso': TIPOS_PREGUNTA.VERDADERO_FALSO,
  'vf': TIPOS_PREGUNTA.VERDADERO_FALSO,
  'abierto': TIPOS_PREGUNTA.ABIERTO,
  'abierta': TIPOS_PREGUNTA.ABIERTO,
  'desarrollo': TIPOS_PREGUNTA.ABIERTO,
  'respuesta corta': TIPOS_PREGUNTA.ABIERTO,
  'ordenar': TIPOS_PREGUNTA.ORDENAR,
  'orden': TIPOS_PREGUNTA.ORDENAR,
  'secuencia': TIPOS_PREGUNTA.ORDENAR,
  'emparejar': TIPOS_PREGUNTA.EMPAREJAR,
  'emparejamiento': TIPOS_PREGUNTA.EMPAREJAR,
  'relacionar': TIPOS_PREGUNTA.EMPAREJAR,
  'relacion': TIPOS_PREGUNTA.EMPAREJAR,
  'formula': TIPOS_PREGUNTA.FORMULA,
  'fórmula': TIPOS_PREGUNTA.FORMULA,
  'resultado': TIPOS_PREGUNTA.FORMULA,
};

function _csvEscape(valor) {
  const s = String(valor ?? '');
  if (/[",;\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function _csvParse(texto, delimitador = ',') {
  const filas = [];
  let fila = [];
  let campo = '';
  let enComillas = false;
  const chars = String(texto || '').split('');

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (enComillas) {
      if (c === '"') {
        if (chars[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          enComillas = false;
        }
      } else {
        campo += c;
      }
    } else if (c === '"') {
      enComillas = true;
    } else if (c === delimitador) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n') {
      fila.push(campo);
      campo = '';
      filas.push(fila);
      fila = [];
    } else if (c === '\r') {
      // ignorar
    } else {
      campo += c;
    }
  }
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((v) => String(v).trim() !== ''));
}

function _detectarDelimitador(texto) {
  const primeras = String(texto || '').split(/\r?\n/).slice(0, 5).join('\n');
  const conComa = (primeras.match(/,/g) || []).length;
  const conPuntoComa = (primeras.match(/;/g) || []).length;
  return conPuntoComa > conComa ? ';' : ',';
}

function _limpiarTipo(tipo) {
  return String(tipo || '').trim().toLowerCase().replace(/\s+/g, ' ').replace(/_/g, ' ');
}

function _mapTipo(tipo) {
  const normalizado = _limpiarTipo(tipo);
  return TIPOS_ALIAS[normalizado] || TIPOS_ALIAS[normalizado.replace(/\s+/g, '')] || null;
}

function _splitLista(valor) {
  return String(valor || '')
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function _letraDesdeTexto(texto) {
  const m = String(texto || '').trim().match(/^([a-d])\s*[.)-]?\s*(.*)$/i);
  if (m) return { letra: m[1].toLowerCase(), texto: m[2].trim() };
  return { letra: null, texto: String(texto || '').trim() };
}

export function esPlantilla(texto) {
  const primerLinea = String(texto || '').split(/\r?\n/)[0] || '';
  const delimitador = _detectarDelimitador(primerLinea);
  const celdas = primerLinea.split(delimitador).map((c) => c.trim().toLowerCase());
  return celdas.includes('tipo') && celdas.includes('enunciado');
}

export function generarPlantillaCSV() {
  const filas = [
    CABECERAS_PLANTILLA,
    [
      'opcion_multiple',
      '¿Cuál es la capital de El Salvador?',
      '1',
      'a) San Miguel | b) San Salvador | c) Santa Ana | d) Sonsonate',
      'b',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'verdadero_falso',
      'El volcán de San Salvador se llama también Quetzaltepec.',
      '1',
      '',
      '',
      'verdadero',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'abierto',
      'Explica brevemente el ciclo del agua.',
      '2',
      '',
      '',
      '',
      'Menciona evaporación, condensación y precipitación.',
      '',
      '',
      '',
      '',
      '',
    ],
    [
      'ordenar',
      'Ordena los pasos del ciclo del agua.',
      '2',
      '',
      '',
      '',
      '',
      'Evaporación | Condensación | Precipitación | Infiltración',
      '1,3,2,4',
      '',
      '',
      '',
    ],
    [
      'emparejar',
      'Relaciona cada país con su capital.',
      '2',
      '',
      '',
      '',
      '',
      '',
      '',
      'El Salvador | Guatemala | Honduras | Costa Rica',
      'San Salvador | Ciudad de Guatemala | Tegucigalpa | San José',
      '',
    ],
    [
      'formula',
      'Resuelve: 2x + 4 = 10',
      '2',
      '',
      '',
      '3',
      '',
      '',
      '',
      '',
      '',
      '2x + 4 = 10',
    ],
  ];

  return filas.map((fila) => fila.map(_csvEscape).join(';')).join('\r\n');
}

export function descargarPlantilla(nombre = 'plantilla_examen.csv') {
  const csv = generarPlantillaCSV();
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parsearPlantillaCSV(texto) {
  const delimitador = _detectarDelimitador(texto);
  const filas = _csvParse(texto, delimitador);
  if (filas.length === 0) throw new Error('La plantilla está vacía.');
  const cabecera = filas[0].map((c) => c.trim().toLowerCase());
  const datos = filas.slice(1);

  const get = (fila, nombre) => {
    const idx = cabecera.indexOf(nombre.toLowerCase());
    return idx >= 0 ? String(fila[idx] || '').trim() : '';
  };

  const preguntas = [];
  let contador = 0;

  datos.forEach((fila) => {
    const tipo = _mapTipo(get(fila, 'tipo'));
    const enunciado = get(fila, 'enunciado');
    if (!tipo || !enunciado) return;

    contador += 1;
    const pregunta = {
      id: `plantilla-${Date.now()}-${contador}`,
      tipo,
      enunciado,
      puntaje: Number(get(fila, 'puntaje')) || (tipo === TIPOS_PREGUNTA.ABIERTO || tipo === TIPOS_PREGUNTA.EMPAREJAR ? 2 : 1),
      orden: contador - 1,
    };

    if (tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE) {
      const opciones = _splitLista(get(fila, 'opciones')).map((raw) => {
        const { letra, texto } = _letraDesdeTexto(raw);
        return { id: letra || String.fromCharCode(97 + (pregunta.opciones?.length || 0)), texto };
      });
      if (opciones.length < 2) {
        pregunta.opciones = [
          { id: 'a', texto: '' },
          { id: 'b', texto: '' },
          { id: 'c', texto: '' },
          { id: 'd', texto: '' },
        ];
      } else {
        pregunta.opciones = opciones;
      }
      pregunta.opcionesCorrectas = String(get(fila, 'opciones_correctas'))
        .split(',')
        .map((c) => c.trim().toLowerCase())
        .filter((c) => /^[a-d]$/.test(c));
    }

    if (tipo === TIPOS_PREGUNTA.VERDADERO_FALSO) {
      const rc = get(fila, 'respuesta_correcta');
      pregunta.respuestaCorrecta = /true|v|verdadero|si|sí|1/i.test(rc) ? true : /false|f|falso|no|0/i.test(rc) ? false : null;
    }

    if (tipo === TIPOS_PREGUNTA.ABIERTO) {
      pregunta.rubrica = get(fila, 'rubrica');
    }

    if (tipo === TIPOS_PREGUNTA.ORDENAR) {
      pregunta.items = _splitLista(get(fila, 'items'));
      pregunta.ordenCorrecto = String(get(fila, 'orden_correcto'))
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0);
    }

    if (tipo === TIPOS_PREGUNTA.EMPAREJAR) {
      const izquierdas = _splitLista(get(fila, 'pares_izquierda'));
      const derechas = _splitLista(get(fila, 'pares_derecha'));
      const n = Math.max(izquierdas.length, derechas.length);
      pregunta.pares = Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        izquierda: izquierdas[i] || '',
        derecha: derechas[i] || '',
      }));
    }

    if (tipo === TIPOS_PREGUNTA.FORMULA) {
      pregunta.formula = get(fila, 'formula');
      pregunta.respuestaCorrecta = get(fila, 'respuesta_correcta');
    }

    preguntas.push(pregunta);
  });

  return preguntas;
}
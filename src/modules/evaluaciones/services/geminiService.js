import { TIPOS_PREGUNTA, NIVELES_ACADEMICOS } from '../constants';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODELO = import.meta.env.VITE_GEMINI_MODELO || 'gemini-flash-latest';
const GEMINI_ENDPOINT = (modelo = GEMINI_MODELO) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;

const MAX_LOTE = 10;
const MAX_OUTPUT_TOKENS = 8192;
const INTENTOS_MAX = 4;

const MODELOS_FALLBACK = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
];

const ESQUEMA_TIPOS = `
Estructura EXACTA de cada tipo de pregunta (usa solo estas):

1. opcion_multiple:
{"enunciado":"texto de la pregunta","tipo":"opcion_multiple","puntaje":1,"opciones":[{"id":"a","texto":"opción A"},{"id":"b","texto":"opción B"},{"id":"c","texto":"opción C"},{"id":"d","texto":"opción D"}],"opcionesCorrectas":["b"]}

2. verdadero_falso:
{"enunciado":"afirmación","tipo":"verdadero_falso","puntaje":1,"respuestaCorrecta":true,"justificacionCorrecta":"explicación breve de por qué es verdadero/falso"}

3. abierto:
{"enunciado":"pregunta de desarrollo","tipo":"abierto","puntaje":2,"rubrica":"criterios de evaluación esperados en la respuesta"}

4. ordenar:
{"enunciado":"instrucción de ordenar","tipo":"ordenar","puntaje":2,"items":["paso 1","paso 2","paso 3","paso 4"],"ordenCorrecto":[0,1,2,3]}

5. emparejar:
{"enunciado":"instrucción de unir columnas","tipo":"emparejar","puntaje":2,"pares":[{"id":1,"izquierda":"concepto A","derecha":"definición A"},{"id":2,"izquierda":"concepto B","derecha":"definición B"},{"id":3,"izquierda":"concepto C","derecha":"definición C"}]}

6. formula (solo si el tema es matemáticas/ciencias):
{"enunciado":"pregunta de fórmula","tipo":"formula","puntaje":2,"formula":"\\\\frac{-b\\\\pm \\\\sqrt{b^2-4ac}}{2a}","respuestaCorrecta":"la fórmula general cuadrática"}
`;

const REGLAS_CALIDAD = `
Reglas de calidad profesional:
- Las preguntas deben ser 100% ESPECÍFICAS del tema indicado: usa nombres, datos, fechas, fórmulas, cifras, autores o situaciones concretas propias de ese tema.
- PROHIBIDO generar preguntas genéricas que podrían servir para cualquier tema (por ejemplo "¿Qué es X?", "Menciona un ejemplo de X", "¿Cuál es la definición de X?"). Si el tema lo permite, usa casos, cálculos o contextos reales.
- Las preguntas deben medir COMPRENSIÓN y APLICACIÓN, no solo memorización.
- Incluye preguntas variadas: conceptuales, de análisis, de aplicación y de resolución.
- Sin respuestas ambiguas ni opciones absurdas. Las opciones incorrectas deben ser plausibles y específicas del tema.
- En opcion_multiple usa SIEMPRE 4 opciones (a-d). Marca todas las correctas en "opcionesCorrectas".
- Nivel de dificultad apropiado y progresivo (fáciles primero).
- Ortografía y redacción impecables en español.
`;

const PROMPT_GENERACION_PREGUNTAS = (tema, nivel, cantidad, tipoFoco, plan = null) => `
Eres un experto en evaluación educativa y diseño de exámenes profesionales de nivel ${nivel}.
Genera exactamente ${cantidad} preguntas de alta calidad académica sobre el tema: "${tema}".

${
  tipoFoco
    ? `TODAS las preguntas deben ser del tipo "${tipoFoco}".`
    : plan
    ? `Distribución EXACTA de tipos obligatoria — genera EXACTAMENTE esta cantidad por tipo, incluyendo TODOS los tipos listados y cumpliendo la cantidad al pie de la letra:
${Object.entries(plan)
  .filter(([, n]) => n > 0)
  .map(([tipo, n]) => `- ${tipo}: ${n} pregunta(s)`)
  .join('\n')}`
    : `Distribuye las preguntas de forma profesional y equilibrada según lo que mejor evalúe cada concepto: opcion_multiple (la mayoría), verdadero_falso, abierto, ordenar y emparejar. Usa formula solo si el tema es de matemáticas o ciencias exactas.`
}

${ESQUEMA_TIPOS}
${REGLAS_CALIDAD}

Formato de salida: JSON estricto (arreglo). No incluyas texto, comentarios ni markdown fuera del arreglo. Devuelve SOLO el arreglo JSON válido.
`;

const TIPOS_VARIADOS_BASE = ['opcion_multiple', 'verdadero_falso', 'abierto', 'ordenar', 'emparejar'];

const REGEX_CIENCIAS = /matem|fisic|quim|biolog|cienc|algebra|calculo|geometr|trigonometr|estadist/i;

function _planDistribucionVariada(cantidad, tema) {
  const esCiencia = REGEX_CIENCIAS.test(String(tema || ''));
  const tipos = esCiencia ? [...TIPOS_VARIADOS_BASE, 'formula'] : TIPOS_VARIADOS_BASE;
  const n = tipos.length;
  const plan = {};
  tipos.forEach((t) => (plan[t] = 0));

  if (cantidad >= n * 2) {
    tipos.forEach((t) => (plan[t] = 2));
    let restante = cantidad - n * 2;
    let i = 0;
    while (restante > 0) {
      plan[tipos[i % n]] += 1;
      restante -= 1;
      i += 1;
    }
  } else if (cantidad >= n) {
    tipos.forEach((t) => (plan[t] = 1));
    let restante = cantidad - n;
    let i = 0;
    while (restante > 0) {
      plan[tipos[i % n]] += 1;
      restante -= 1;
      i += 1;
    }
  } else {
    const prioridad = ['opcion_multiple', 'verdadero_falso', 'abierto', 'ordenar', 'emparejar', 'formula'];
    for (let i = 0; i < cantidad; i++) {
      plan[prioridad[i % prioridad.length]] += 1;
    }
  }

  return plan;
}

function _planLote(planGlobal, offset, cantidadLote) {
  const expandido = [];
  Object.entries(planGlobal).forEach(([tipo, n]) => {
    for (let i = 0; i < n; i++) expandido.push(tipo);
  });
  const lote = expandido.slice(offset, offset + cantidadLote);
  const plan = {};
  lote.forEach((t) => (plan[t] = (plan[t] || 0) + 1));
  return plan;
}

const PROMPT_IMPORTAR_EXAMEN = (nivel, tipoFoco, cantidad, plan = null) => `
Eres un sistema profesional de conversión de exámenes. Analiza el documento adjunto (un examen ya resuelto o en blanco) y convierte TODAS las preguntas que detectes al formato JSON estructurado del sistema de evaluación.

${
  cantidad > 0
    ? `Convierte exactamente ${cantidad} preguntas (selecciona las más representativas del documento).`
    : 'Convierte todas las preguntas que detectes.'
}

Instrucciones:
1. Identifica cada pregunta del documento (por numeración, estructura o contexto).
2. Determina el tipo natural de cada una:
   - Con opciones o alternativas (a,b,c,d) → opcion_multiple.
   - De verdadero/falso (V/F) → verdadero_falso.
   - De desarrollo o respuesta larga → abierto.
   - De ordenar pasos o secuencia → ordenar.
   - De unir/emparejar columnas → emparejar.
   - De matemáticas con fórmula → formula.
3. ${
  tipoFoco
    ? `Convierte TODAS las preguntas al tipo "${tipoFoco}".`
    : plan
    ? `Distribución OBLIGATORIA de tipos. Genera EXACTAMENTE esta cantidad por tipo, completando con TODOS los tipos listados aunque el documento original no los tenga:
${Object.entries(plan)
  .filter(([, n]) => n > 0)
  .map(([tipo, n]) => `   - ${tipo}: ${n} pregunta(s)`)
  .join('\n')}
Si el documento no trae preguntas de un tipo pedido, TRANSFORMA el contenido de las existentes para cumplir la distribución (por ejemplo: convierte una opción múltiple en verdadero_falso, abierto, ordenar o emparejar, o crea una variante de fórmula si es matemáticas/ciencias).`
    : 'Respeta el tipo original de cada pregunta, mezclando de forma variada los tipos que aparezcan en el documento.'
}
4. IMPORTANTE - DETECCIÓN DE RESPUESTAS CORRECTAS (SÉ EXTREMADAMENTE MINUCIOSO):
   El docente marca la respuesta correcta de MUCHÍSIMAS formas. Inspecciona el documento carácter a carácter y detecta TODAS estas:
   - Símbolos de palomilla o marca: ✅, ✓, ✔, ☑, ☒, ✗, ✘, ×, ●, ◆, ▶ antes o después de la opción.
   - La letra correcta encerrada o señalada: "(c)", "[c]", "c)", "(C)", "✔ c", "c ✔", letra MAYÚSCULA destacada.
   - La opción escrita en NEGRITA, SUBRAYADA, ITÁLICA, en COLOR distinto, RESALTADA (marcador/amarillo), de MAYOR TAMAÑO, o TACHADA su reverso.
   - Marcas de formato de procesador de texto que a veces quedan en el texto: **negrita**, __subrayado__, <b>...</b>, <u>...</u>, <i>...</i>, MAYÚSCULAS, asteriscos *...*.
   - Texto anexo: "Respuesta:", "Rpta:", "Correcta:", "Clave:", "Respuesta correcta:", "Resp:", "SOLUCIÓN:", "(correcta)", "(RESPUESTA)", "CORRECTA", "A/B/C/D".
   - En verdadero/falso: la V o F correcta marcada/encuadrada/negrita.
   - En preguntas de desarrollo: la respuesta esperada escrita, subrayada o en otro color → colócala en "rubrica".
   - En emparejar: la línea, flecha → o el par señalado que conecta los elementos.
   - En ordenar: los números del orden correcto marcados.
   Si NO detectas ninguna marca, rellena "opcionesCorrectas" con tu mejor criterio académico SOLO si el contenido lo hace inequívoco; si es ambiguo, deja vacío.
   Usa la marca para rellenar SIEMPRE "opcionesCorrectas" (arreglo con los ids de las opciones correctas, ej. ["b"]).
   Para verdadero_falso usa "respuestaCorrecta": true/false. Para abierto, deja la respuesta esperada en "rubrica".
   NUNCA dejes "opcionesCorrectas" vacío si el documento muestra la respuesta marcada de cualquier forma.
5. Nivel académico objetivo: ${nivel}.
6. Convierte también preguntas con imágenes, tablas o figuras a texto descriptivo dentro del enunciado.

${ESQUEMA_TIPOS}
${REGLAS_CALIDAD}

Formato de salida: JSON estricto (arreglo). No incluyas texto, comentarios ni markdown fuera del arreglo. Devuelve SOLO el arreglo JSON válido.
`;

const PROMPT_CALIFICACION_ABIERTO = (enunciado, rubrica, respuesta, puntajeMaximo) => `
Eres un profesor universitario experto en evaluación pedagógica. Califica la siguiente respuesta de estudiante de forma justa y constructiva.

Pregunta: ${enunciado}
Rúbrica: ${rubrica || 'Sin rúbrica específica — evalúa contenido, precisión y claridad.'}
Respuesta del estudiante: ${respuesta}
Puntaje máximo: ${puntajeMaximo}

Devuelve un JSON estricto con esta estructura exacta:
{
  "score": <número decimal, puntuación obtenida>,
  "feedback": "<retroalimentación constructiva en español para el estudiante>",
  "ai_detection_flag": <número entre 0 y 1, probabilidad de que la respuesta haya sido generada por IA o copiada>
}

No incluyas texto adicional fuera del JSON. Devuelve solo el objeto JSON.
`;

const PROMPT_GENERACION_ADVERTENCIA = (incidentes, nivel) => `
Eres un asistente de integridad académica. Un estudiante ha cometido varias infracciones durante un examen en línea.

Incidentes detectados: ${JSON.stringify(incidentes)}
Nivel de alerta: ${nivel} (normal/warning/suspicion)

Genera un mensaje de advertencia adaptativo y firme en español para mostrar al estudiante en pantalla. El mensaje debe ser claro, educativo y advertir sobre las consecuencias de continuar con el comportamiento inadecuado. No uses markdown.

Formato de salida:
{
  "titulo": "<título breve>",
  "mensaje": "<mensaje completo en español>",
  "nivel": "${nivel}"
}
`;

function _extraerJSON(texto) {
  const match = texto.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error('No se pudo interpretar la respuesta del generador.');
  return JSON.parse(match[0]);
}

async function _llamadaGemini(prompt, { archivo = null, temperatura = 0.7 } = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY no está configurada en el entorno.');
  }

  const partes = [];
  if (archivo) {
    partes.push({
      inlineData: {
        mimeType: archivo.mimeType,
        data: archivo.base64,
      },
    });
  }
  partes.push({ text: prompt });

  const modelos = [GEMINI_MODELO, ...MODELOS_FALLBACK.filter((m) => m !== GEMINI_MODELO)];
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const esperaAtraso = (intento) => 2000 * intento + Math.floor(Math.random() * 1000);
  let ultimoError = null;

  for (const modelo of modelos) {
    for (let intento = 1; intento <= INTENTOS_MAX; intento++) {
      try {
        const controlador = new AbortController();
        const timeoutId = setTimeout(() => controlador.abort(), 90000);

        let respuesta;
        try {
          respuesta = await fetch(GEMINI_ENDPOINT(modelo), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controlador.signal,
            body: JSON.stringify({
              contents: [{ role: 'user', parts: partes }],
              generationConfig: {
                temperature: temperatura,
                topP: 0.9,
                maxOutputTokens: MAX_OUTPUT_TOKENS,
              },
            }),
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (!respuesta.ok) {
          const errorTexto = await respuesta.text();
          const status = respuesta.status;
          const esReintentable = status === 429 || status === 503 || [500, 502, 504].includes(status);
          ultimoError = new Error(
            status === 429 || status === 503
              ? `El generador está saturado en este momento (${status}). Espera un momento e inténtalo de nuevo.`
              : `Error del servicio de generación (${status}): ${errorTexto}`
          );
          if (esReintentable && intento < INTENTOS_MAX) {
            await esperar(esperaAtraso(intento));
            continue;
          }
          break;
        }

        const data = await respuesta.json();
        const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!texto) throw new Error('El generador no devolvió contenido.');
        return texto;
      } catch (err) {
        if (err.message?.includes('El generador no devolvió contenido')) {
          ultimoError = err;
          if (intento < INTENTOS_MAX) {
            await esperar(esperaAtraso(intento));
            continue;
          }
          break;
        }
        if (err.name === 'AbortError') {
          ultimoError = new Error('La solicitud tardó demasiado. Inténtalo de nuevo.');
          if (intento < INTENTOS_MAX) {
            await esperar(esperaAtraso(intento));
            continue;
          }
          break;
        }
        ultimoError = err;
        const esReintentable = /429|503|500|502|504|fetch|network|timeout/i.test(err.message || '');
        if (esReintentable && intento < INTENTOS_MAX) {
          await esperar(esperaAtraso(intento));
          continue;
        }
        break;
      }
    }
  }

  throw ultimoError || new Error('Todos los modelos del generador fallaron.');
}

function _normalizarPregunta(p, idx) {
  const tipo = p.tipo || TIPOS_PREGUNTA.OPCION_MULTIPLE;
  const pregunta = {
    id: `ia-${Date.now()}-${idx}`,
    tipo,
    enunciado: p.enunciado || p.pregunta || p.pregunta_text || '',
    puntaje: Number(p.puntaje) || (tipo === TIPOS_PREGUNTA.ABIERTO || tipo === TIPOS_PREGUNTA.EMPAREJAR ? 2 : 1),
    orden: idx,
  };

  const opcionesCrudas = Array.isArray(p.opciones) ? p.opciones : [];
  const opcionesNormalizadas = opcionesCrudas.map((o, i) => {
    if (typeof o === 'string') {
      const { letra, texto } = _extraerLetraOpcion(o);
      return { id: letra || String.fromCharCode(97 + i), texto };
    }
    const texto = o.texto || o.valor || '';
    return { id: o.id || o.letra || String.fromCharCode(97 + i), texto };
  });

  const opcionesMarcadas = new Set(
    opcionesCrudas
      .map((o, i) => {
        const raw = typeof o === 'string' ? o : o.texto || '';
        const id = opcionesNormalizadas[i]?.id || String.fromCharCode(97 + i);
        if (_tieneMarcaRespuesta(raw)) return id;
        return null;
      })
      .filter(Boolean)
  );

  switch (tipo) {
    case TIPOS_PREGUNTA.OPCION_MULTIPLE:
      const opcionesLimpias = opcionesNormalizadas.map((o) => ({
        id: o.id,
        texto: _limpiarMarcaTexto(o.texto),
      }));

      pregunta.opciones = opcionesLimpias.length >= 2
        ? opcionesLimpias
        : [
            { id: 'a', texto: '' },
            { id: 'b', texto: '' },
            { id: 'c', texto: '' },
            { id: 'd', texto: '' },
          ];

      const correctas = Array.isArray(p.opcionesCorrectas) ? p.opcionesCorrectas : [];
      pregunta.opcionesCorrectas = correctas
        .map((c) => {
          const cStr = String(c).trim();
          const porId = pregunta.opciones.find((o) => String(o.id).toLowerCase() === cStr.toLowerCase());
          if (porId) return porId.id;
          const porTexto = pregunta.opciones.find((o) => _textoComparable(o.texto) === _textoComparable(cStr));
          if (porTexto) return porTexto.id;
          const { letra } = _extraerLetraOpcion(cStr);
          if (letra) return pregunta.opciones.find((o) => String(o.id).toLowerCase() === letra.toLowerCase())?.id;
          if (/^[a-d]$/i.test(cStr)) return cStr.toLowerCase();
          return null;
        })
        .filter(Boolean);

      if (pregunta.opcionesCorrectas.length === 0 && opcionesMarcadas.size > 0) {
        pregunta.opcionesCorrectas = pregunta.opciones
          .filter((o) => opcionesMarcadas.has(o.id))
          .map((o) => o.id);
      }
      break;
    case TIPOS_PREGUNTA.VERDADERO_FALSO:
      pregunta.respuestaCorrecta = _normalizarBooleano(p.respuestaCorrecta);
      pregunta.justificacionCorrecta = p.justificacionCorrecta || p.justificacion || '';
      break;
    case TIPOS_PREGUNTA.ABIERTO:
      pregunta.rubrica = p.rubrica || p.criterios || '';
      break;
    case TIPOS_PREGUNTA.ORDENAR:
      pregunta.items = Array.isArray(p.items) && p.items.length ? p.items.map((i) => String(i)) : ['', '', '', ''];
      pregunta.ordenCorrecto = _normalizarOrden(p.items, p.ordenCorrecto);
      break;
    case TIPOS_PREGUNTA.EMPAREJAR:
      pregunta.pares = Array.isArray(p.pares) && p.pares.length
        ? p.pares.map((par, i) => ({
            id: par.id || i + 1,
            izquierda: par.izquierda || par.columna1 || par.concepto || '',
            derecha: par.derecha || par.columna2 || par.definicion || '',
          }))
        : [
            { id: 1, izquierda: '', derecha: '' },
            { id: 2, izquierda: '', derecha: '' },
          ];
      break;
    case TIPOS_PREGUNTA.FORMULA:
      pregunta.formula = p.formula || '';
      pregunta.respuestaCorrecta = p.respuestaCorrecta || p.resultado || '';
      break;
    default:
      break;
  }

  return pregunta;
}

function _normalizarBooleano(valor) {
  if (typeof valor === 'boolean') return valor;
  const s = String(valor || '').trim().toLowerCase();
  if (['true', 'v', 'verdadero', 'si', 'sí', '1'].includes(s)) return true;
  if (['false', 'f', 'falso', 'no', '0'].includes(s)) return false;
  return null;
}

function _extraerLetraOpcion(texto) {
  const s = String(texto || '').trim();
  const match = s.match(/^[✅✓✔☑✗✘×❌]?\s*([a-d]|[A-D])\s*[.)-]?\s*(.*)$/u);
  if (match) {
    return { letra: match[1].toLowerCase(), texto: match[2].trim() };
  }
  return { letra: null, texto: s };
}

function _tieneMarcaRespuesta(raw) {
  const s = String(raw || '').trim();
  if (/^[✅✓✔☑✗✘×❌]\s*/u.test(s)) return true;
  if (/\*\*.*\*\*|__.*__|<b>|<u>|<i>|<strong>|<em>|<mark>/i.test(s)) return true;
  const sinPrefijo = s.replace(/^[a-dA-D]\s*[.)-]?\s*/, '');
  if (/(\(correcta\)|\(respuesta\)|\(RESPUESTA\)|\[correcta\]|✔|✓|✅|☑|CORRECTA|RESPUESTA)\s*$/i.test(sinPrefijo)) return true;
  return false;
}

function _limpiarMarcaTexto(texto) {
  return String(texto || '')
    .replace(/^[✅✓✔☑✗✘×❌X]\s*/u, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/<b>(.*?)<\/b>/gi, '$1')
    .replace(/<strong>(.*?)<\/strong>/gi, '$1')
    .replace(/<u>(.*?)<\/u>/gi, '$1')
    .replace(/<i>(.*?)<\/i>/gi, '$1')
    .replace(/<em>(.*?)<\/em>/gi, '$1')
    .replace(/<mark>(.*?)<\/mark>/gi, '$1')
    .replace(/\s+\((correcta|respuesta|RESPUESTA)\)\s*$/i, '')
    .replace(/\s+\[correcta\]\s*$/i, '')
    .replace(/\s+[✔✓✅☑]\s*$/u, '')
    .trim();
}

function _textoComparable(t) {
  return String(t || '').trim().toLowerCase();
}

function _normalizarOrden(items, ordenCrudo) {
  if (!Array.isArray(items)) return [0, 1, 2, 3];
  if (!Array.isArray(ordenCrudo) || ordenCrudo.length === 0) return items.map((_, i) => i);

  const todosNumeros = ordenCrudo.every((o) => typeof o === 'number' || /^\d+$/.test(String(o)));
  if (todosNumeros) {
    return ordenCrudo.map((o) => Number(o));
  }

  const mapa = {};
  items.forEach((item, i) => {
    mapa[String(item).trim().toLowerCase()] = i;
  });
  const resultado = ordenCrudo.map((o) => mapa[String(o).trim().toLowerCase()]);
  return resultado.every((r) => typeof r === 'number') ? resultado : items.map((_, i) => i);
}

export async function generarPreguntasIA({ tema, nivel = 'secundaria', cantidad = 5, tipoFoco = null }) {
  if (!GEMINI_API_KEY) {
    console.warn('VITE_GEMINI_API_KEY no configurada. Devolviendo preguntas de ejemplo.');
    return _preguntasEjemplo(tipoFoco, cantidad);
  }

  const nivelLabel = NIVELES_ACADEMICOS.find((n) => n.id === nivel)?.label || nivel;
  const preguntasFinales = [];
  const planGlobal = tipoFoco ? null : _planDistribucionVariada(cantidad, tema);
  let ultimoError = null;

  for (let lote = 0; lote < cantidad; lote += MAX_LOTE) {
    const cantidadLote = Math.min(MAX_LOTE, cantidad - lote);
    const planLote = planGlobal ? _planLote(planGlobal, lote, cantidadLote) : null;
    const prompt = PROMPT_GENERACION_PREGUNTAS(tema, nivelLabel, cantidadLote, tipoFoco, planLote);
    try {
      const texto = await _llamadaGemini(prompt);
      const preguntas = _extraerJSON(texto);
      if (!Array.isArray(preguntas)) throw new Error('La respuesta no es un arreglo.');
      preguntasFinales.push(...preguntas.map((p, i) => _normalizarPregunta(p, lote + i)));
    } catch (err) {
      ultimoError = err;
      console.error('Error generando preguntas con IA:', err);
    }
    if (lote + MAX_LOTE < cantidad) await new Promise((r) => setTimeout(r, 700));
  }

  if (preguntasFinales.length === 0) {
    throw ultimoError || new Error('No se pudieron generar las preguntas. Revisa tu conexión e inténtalo de nuevo.');
  }

  return preguntasFinales.slice(0, cantidad);
}

export async function importarExamenIA({ archivo, nivel = 'secundaria', tipoFoco = null, cantidad = 0, onProgreso = null }) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY no está configurada en el entorno.');
  }

  const nivelLabel = NIVELES_ACADEMICOS.find((n) => n.id === nivel)?.label || nivel;
  const plan = tipoFoco || cantidad <= 0 ? null : _planDistribucionVariada(cantidad, archivo?.nombre || '');
  const prompt = PROMPT_IMPORTAR_EXAMEN(nivelLabel, tipoFoco, cantidad, plan);

  try {
    onProgreso?.('analizando');
    const texto = await _llamadaGemini(prompt, { archivo, temperatura: 0.3 });
    const preguntas = _extraerJSON(texto);
    if (!Array.isArray(preguntas)) throw new Error('La respuesta no es un arreglo.');

    onProgreso?.('procesando');
    let normalizadas = preguntas.map((p, idx) => _normalizarPregunta(p, idx));
    if (cantidad > 0) normalizadas = normalizadas.slice(0, cantidad);

    const tieneOpcionMultiple = normalizadas.some(
      (q) => q.tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE
    );

    if (tieneOpcionMultiple && !tipoFoco) {
      onProgreso?.('respuestas');
      try {
        const reparadas = await _repararRespuestasIA(normalizadas, archivo);
        if (reparadas) normalizadas = reparadas;
      } catch (err) {
        console.warn('No se pudieron reparar respuestas automáticamente:', err.message);
      }
    }

    onProgreso?.('listo');
    return normalizadas;
  } catch (err) {
    console.error('Error importando examen con IA:', err);
    if (err.message?.includes('saturada')) throw err;
    throw new Error('No se pudo analizar el archivo. Verifica que sea un examen legible.');
  }
}

const PROMPT_REPARAR_RESPUESTAS = (preguntasJson) => `
Analiza el documento original del examen con atención EXTREMA al formato visual.

Los docentes marcan la respuesta correcta de muchas formas: en NEGRITA, SUBRAYADA, ITÁLICA, en color, resaltada, en MAYÚSCULAS, con ✅ ✓ ✔ ☑ ● ◆, con la letra entre paréntesis "(b)", o con texto "Respuesta: b" / "Correcta: b" / "Clave: b" / "Rpta: b". También pueden tachar las INCORRECTAS con X, o poner "✔" o "✓" antes de la letra correcta. A veces quedan marcadores de formato como **negrita**, __subrayado__, <b>...</b>, <u>...</u>.

Te muestro SOLO las preguntas que aún no tienen respuesta detectada. Para CADA una, busca en el documento original la marca visual que indica la opción correcta.

Reglas:
- Si en el documento NO ves ninguna marca clara (negrita, palomilla, paréntesis, texto "Respuesta:", etc.) para esa pregunta, NO la incluyas en la salida.
- NUNCA adivines la respuesta ni uses "la primera opción" por defecto. Solo devuelve lo que esté VISIBLEMENTE marcado en el documento.
- Devuelve SOLO un objeto JSON donde cada clave es el índice de la pregunta (0, 1, 2...) y el valor es un arreglo con los ids de las opciones correctas:
{"0":["b"],"3":["a","c"]}

Preguntas extraídas (usa la posición para los índices):
${preguntasJson}

No modifiques nada más. Devuelve SOLO el objeto JSON.
`;

async function _repararRespuestasIA(preguntas, archivo) {
  const soloSinRespuesta = preguntas
    .map((q, idx) => ({ q, idx }))
    .filter(
      ({ q }) =>
        q.tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE &&
        (!q.opcionesCorrectas || q.opcionesCorrectas.length === 0)
    );

  if (soloSinRespuesta.length === 0) return null;

  const resumen = soloSinRespuesta.map(({ q, idx }) => ({
    index: idx,
    enunciado: q.enunciado,
    opciones: q.opciones || [],
  }));
  const prompt = PROMPT_REPARAR_RESPUESTAS(JSON.stringify(resumen, null, 1));

  const texto = await _llamadaGemini(prompt, { archivo, temperatura: 0.1 });
  const mapa = _extraerJSON(texto);
  if (typeof mapa !== 'object' || Array.isArray(mapa)) return null;

  const indicesReparables = new Set(soloSinRespuesta.map(({ idx }) => String(idx)));
  const entradas = Object.entries(mapa).filter(([idx]) => indicesReparables.has(String(idx)));
  if (entradas.length === 0) return null;

  const letrasUsadas = new Set(
    entradas.flatMap(([, ids]) => (Array.isArray(ids) ? ids.map((i) => String(i).trim().toLowerCase()) : []))
  );
  const sospechoso = entradas.length >= 4 && letrasUsadas.size === 1;

  return preguntas.map((q, idx) => {
    if (q.tipo !== TIPOS_PREGUNTA.OPCION_MULTIPLE) return q;
    if (!indicesReparables.has(String(idx))) return q;
    const ids = mapa[idx] || mapa[String(idx)];
    if (Array.isArray(ids) && ids.length > 0) {
      const idsValidos = ids
        .map((id) => {
          const cStr = String(id).trim();
          const match = q.opciones.find((o) => String(o.id).toLowerCase() === cStr.toLowerCase());
          if (match) return match.id;
          if (/^[a-d]$/i.test(cStr)) return cStr.toLowerCase();
          return null;
        })
        .filter(Boolean);
      if (sospechoso) return q;
      if (idsValidos.length > 0) return { ...q, opcionesCorrectas: idsValidos };
    }
    return q;
  });
}

const PROMPT_CALIFICACION_LOTE = (entradas) => `
Eres un profesor universitario experto en evaluación pedagógica. Califica las siguientes respuestas de estudiantes de forma justa y constructiva.

Devuelve UN arreglo JSON estricto con un objeto por cada entrada, en el MISMO orden:
[{"score": 8.5, "feedback": "retroalimentación constructiva en español", "ai_detection_flag": 0.2}, ...]

Entradas (la posición en el arreglo es el índice de la respuesta):
${JSON.stringify(entradas, null, 1)}

Reglas:
- score: número decimal de 0 al puntajeMaximo de esa entrada.
- feedback: breve, constructivo y en español.
- ai_detection_flag: número entre 0 y 1 (probabilidad de que la respuesta sea IA o copiada).
No incluyas texto fuera del arreglo. Devuelve SOLO el arreglo JSON.
`;

// Califica varias respuestas abiertas en lotes para no saturar el límite de peticiones.
export async function calificarRespuestasAbiertasLote(entradas) {
  if (!GEMINI_API_KEY) {
    return entradas.map((e) => ({
      score: 0,
      feedback: 'La calificación automática no está disponible en este momento.',
      ai_detection_flag: 0,
    }));
  }

  const resultados = [];
  for (let i = 0; i < entradas.length; i += MAX_LOTE) {
    const lote = entradas.slice(i, i + MAX_LOTE).map((e) => ({
      pregunta: e.enunciado,
      rubrica: e.rubrica || '',
      respuesta: e.respuesta || '',
      puntajeMaximo: e.puntajeMaximo || 10,
    }));

    try {
      const texto = await _llamadaGemini(PROMPT_CALIFICACION_LOTE(lote), { temperatura: 0.3 });
      const arr = _extraerJSON(texto);
      if (!Array.isArray(arr)) throw new Error('La respuesta no es un arreglo.');
      arr.slice(0, lote.length).forEach((r, j) => {
        const max = lote[j]?.puntajeMaximo || 10;
        resultados.push({
          score: Math.max(0, Math.min(Number(r?.score) || 0, max)),
          feedback: r?.feedback || 'Sin retroalimentación.',
          ai_detection_flag: Math.max(0, Math.min(1, Number(r?.ai_detection_flag) || 0)),
        });
      });
      if (arr.length < lote.length) {
        for (let j = arr.length; j < lote.length; j++) {
          resultados.push({ score: 0, feedback: 'No se recibió calificación para esta respuesta.', ai_detection_flag: 0 });
        }
      }
    } catch (err) {
      console.error('Error calificando lote de respuestas:', err);
      lote.forEach(() => {
        resultados.push({ score: 0, feedback: 'Error al calificar este lote. Revisar manualmente.', ai_detection_flag: 0 });
      });
    }

    if (i + MAX_LOTE < entradas.length) await new Promise((r) => setTimeout(r, 700));
  }

  return resultados;
}

export async function calificarRespuestaAbierta({ enunciado, rubrica, respuesta, puntajeMaximo = 10 }) {
  if (!GEMINI_API_KEY) {
    return {
      score: 0,
      feedback: 'La calificación automática no está disponible en este momento. Será revisada manualmente.',
      ai_detection_flag: 0,
    };
  }

  const prompt = PROMPT_CALIFICACION_ABIERTO(enunciado, rubrica, respuesta, puntajeMaximo);

  try {
    const texto = await _llamadaGemini(prompt);
    const result = _extraerJSON(texto);
    return {
      score: Number(result.score) || 0,
      feedback: result.feedback || 'Sin retroalimentación disponible.',
      ai_detection_flag: Math.max(0, Math.min(1, Number(result.ai_detection_flag) || 0)),
    };
  } catch (err) {
    console.error('Error calificando respuesta abierta:', err);
    return {
      score: 0,
      feedback: 'Error al procesar la calificación automática. Será revisada manualmente.',
      ai_detection_flag: 0,
    };
  }
}

export async function generarAdvertencia({ incidentes, nivel }) {
  if (!GEMINI_API_KEY) {
    return _advertenciaEjemplo(nivel, incidentes);
  }

  const prompt = PROMPT_GENERACION_ADVERTENCIA(incidentes, nivel);

  try {
    const texto = await _llamadaGemini(prompt);
    return _extraerJSON(texto);
  } catch (err) {
    console.error('Error generando advertencia:', err);
    return _advertenciaEjemplo(nivel, incidentes);
  }
}

const PROMPT_RECOMENDAR_EXAMEN = (resumen) => `
Eres un experto en pedagogía y diseño de exámenes. Analiza este examen y genera recomendaciones profesionales para que quede impecable antes de aplicarlo.

Datos del examen:
${resumen}

Evalúa:
1. Distribución de tipos de pregunta (¿es variada y apropiada al tema?).
2. Cantidad de preguntas vs duración estimada (90 seg por pregunta razonable).
3. Puntajes (¿son coherentes? ¿el total tiene sentido?).
4. Calidad de las opciones (¿las correctas están bien marcadas? ¿distractores plausibles?).
5. Errores o preguntas incompletas (sin enunciado, sin opciones, sin respuesta correcta).
6. Sugerencias concretas de mejora y buenas prácticas para este tipo de examen.
7. Si el examen quedó BIEN para aplicarse o necesita ajustes.

Devuelve SOLO JSON con esta estructura exacta:
{
  "puntajeCalidad": <número 0-100>,
  "calificacion": "<Excelente|Muy bueno|Bueno|Necesita ajustes|Incompleto>",
  "resumen": "<una frase del análisis general>",
  "distribucionTipos": [{"tipo": "opcion_multiple", "cantidad": 5, "porcentaje": 50}],
  "fortalezas": ["<fortaleza 1>", "<fortaleza 2>"],
  "debilidades": ["<debilidad 1>", "<debilidad 2>"],
  "recomendaciones": ["<recomendación concreta 1>", "<recomendación 2>"],
  "tiempoSugeridoMin": <número>,
  "listoParaAplicar": true,
  "mensajeFinal": "<mensaje motivador y profesional al docente>"
}

No uses markdown. Devuelve SOLO el objeto JSON.
`;

export async function recomendarExamenIA({ titulo, descripcion, preguntas, configuracion }) {
  if (!GEMINI_API_KEY) {
    return _recomendacionesLocales({ titulo, descripcion, preguntas, configuracion });
  }

  const resumen = JSON.stringify({
    titulo,
    descripcion,
    configuracion,
    preguntas: preguntas.map((p) => ({
      tipo: p.tipo,
      enunciado: p.enunciado,
      puntaje: p.puntaje,
      opciones: p.opciones?.map((o) => o.texto) || [],
      opcionesCorrectas: p.opcionesCorrectas || null,
      respuestaCorrecta: p.respuestaCorrecta ?? null,
      rubrica: p.rubrica || null,
      formula: p.formula || null,
    })),
  }, null, 2);

  const prompt = PROMPT_RECOMENDAR_EXAMEN(resumen);

  try {
    const texto = await _llamadaGemini(prompt, { temperatura: 0.3 });
    const resultado = _extraerJSON(texto);
    return {
      ..._recomendacionesLocales({ titulo, descripcion, preguntas, configuracion }),
      ...resultado,
    };
  } catch (err) {
    console.error('Error generando recomendaciones con IA:', err);
    return _recomendacionesLocales({ titulo, descripcion, preguntas, configuracion });
  }
}

function _recomendacionesLocales({ preguntas }) {
  const validas = preguntas.filter((p) => p.enunciado && p.enunciado.trim());
  const total = preguntas.length;
  const incompletas = total - validas.length;

  const tipos = {};
  validas.forEach((p) => {
    tipos[p.tipo] = (tipos[p.tipo] || 0) + 1;
  });

  const sinRespuesta = validas.filter(
    (p) =>
      p.tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE &&
      (!p.opcionesCorrectas || p.opcionesCorrectas.length === 0)
  ).length;

  const puntajeTotal = validas.reduce((s, p) => s + (p.puntaje || 0), 0);
  const tiempoSugerido = Math.ceil(validas.length * 1.5);

  const porcentajeCompleto = total > 0 ? Math.round((validas.length / total) * 100) : 0;
  let calificacion = 'Incompleto';
  if (incompletas === 0 && sinRespuesta === 0) calificacion = 'Muy bueno';
  else if (incompletas === 0) calificacion = 'Bueno';
  else if (porcentajeCompleto >= 70) calificacion = 'Necesita ajustes';
  const puntajeCalidad = Math.min(100, porcentajeCompleto * 0.6 + (sinRespuesta === 0 ? 25 : 0) + (validas.length >= 5 ? 15 : 0));

  const debilidades = [];
  const recomendaciones = [];
  const fortalezas = [];

  if (incompletas > 0) {
    debilidades.push(`${incompletas} pregunta(s) sin enunciado.`);
    recomendaciones.push('Completa o elimina las preguntas vacías antes de publicar.');
  } else {
    fortalezas.push('Todas las preguntas tienen enunciado.');
  }
  if (sinRespuesta > 0) {
    debilidades.push(`${sinRespuesta} pregunta(s) de opción múltiple sin respuesta correcta marcada.`);
    recomendaciones.push('Marca la respuesta correcta en cada pregunta de opción múltiple (o usa el generador para sugerirla).');
  } else if (validas.length > 0) {
    fortalezas.push('Todas las opciones múltiples tienen respuesta correcta marcada.');
  }
  if (validas.length < 5) {
    debilidades.push('El examen tiene muy pocas preguntas (menos de 5).');
    recomendaciones.push('Agrega más preguntas (mínimo 10 recomendado) para una evaluación sólida.');
  }
  const tiposCount = Object.keys(tipos).length;
  if (tiposCount < 2) {
    recomendaciones.push('Varía los tipos de pregunta (opción múltiple + desarrollo o V/F) para medir distintas habilidades.');
  } else {
    fortalezas.push(`Usa ${tiposCount} tipos de pregunta distintos.`);
  }

  const distribucionTipos = Object.entries(tipos).map(([tipo, cantidad]) => ({
    tipo,
    cantidad,
    porcentaje: validas.length > 0 ? Math.round((cantidad / validas.length) * 100) : 0,
  }));

  if (fortalezas.length === 0) fortalezas.push('El examen tiene una estructura base utilizable.');
  if (recomendaciones.length === 0) recomendaciones.push('El examen está bien armado. Considera agregar una pregunta de aplicación o análisis.');

  return {
    puntajeCalidad,
    calificacion,
    resumen: `${validas.length} pregunta(s) válidas de ${total}, ${sinRespuesta} sin respuesta marcada, puntaje total ${puntajeTotal}.`,
    distribucionTipos,
    fortalezas,
    debilidades,
    recomendaciones,
    tiempoSugeridoMin: tiempoSugerido,
    listoParaAplicar: incompletas === 0 && sinRespuesta === 0 && validas.length >= 5,
    mensajeFinal: calificacion === 'Muy bueno'
      ? '¡Excelente examen! Está listo para aplicar.'
      : 'Revisa los puntos de mejora para que el examen quede impecable.',
  };
}

function _preguntasEjemplo(tipoFoco, cantidad) {
  const tipos = tipoFoco ? [tipoFoco] : Object.values(TIPOS_PREGUNTA);
  const preguntas = [];
  for (let i = 0; i < cantidad; i++) {
    const tipo = tipos[i % tipos.length];
    const base = {
      id: `ejemplo-${Date.now()}-${i}`,
      enunciado: `Pregunta de ejemplo ${i + 1}`,
      tipo,
      puntaje: 1,
      orden: i,
    };
    if (tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE) {
      base.opciones = [
        { id: 'a', texto: 'Opción A' },
        { id: 'b', texto: 'Opción B (correcta)' },
        { id: 'c', texto: 'Opción C' },
        { id: 'd', texto: 'Opción D' },
      ];
      base.opcionesCorrectas = ['b'];
    } else if (tipo === TIPOS_PREGUNTA.VERDADERO_FALSO) {
      base.respuestaCorrecta = true;
      base.justificacionCorrecta = 'Explicación de la respuesta correcta.';
    } else if (tipo === TIPOS_PREGUNTA.ABIERTO) {
      base.rubrica = 'Criterios de evaluación de la respuesta abierta.';
    } else if (tipo === TIPOS_PREGUNTA.ORDENAR) {
      base.items = ['Paso 1', 'Paso 2', 'Paso 3', 'Paso 4'];
      base.ordenCorrecto = [0, 1, 2, 3];
    } else if (tipo === TIPOS_PREGUNTA.EMPAREJAR) {
      base.pares = [
        { id: 1, izquierda: 'Concepto A', derecha: 'Definición A' },
        { id: 2, izquierda: 'Concepto B', derecha: 'Definición B' },
        { id: 3, izquierda: 'Concepto C', derecha: 'Definición C' },
      ];
    } else if (tipo === TIPOS_PREGUNTA.FORMULA) {
      base.formula = 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}';
      base.respuestaCorrecta = 'Fórmula cuadrática';
    }
    preguntas.push(base);
  }
  return preguntas;
}

function _advertenciaEjemplo(nivel, incidentes) {
  const titulos = {
    normal: 'Todo correcto',
    warning: 'Advertencia',
    suspicion: 'Alerta de integridad',
  };

  const mensajes = {
    warning: 'Se han detectado ciertas conductas durante el examen. Por favor, revisa las reglas y continúa con honestidad académica.',
    suspicion: 'Se han detectado múltiples infracciones de integridad académica. Tu examen será revisado por el docente. Cualquier intento de fraude será sancionado.',
  };

  return {
    titulo: titulos[nivel] || 'Advertencia',
    mensaje: mensajes[nivel] || 'Mantén un comportamiento adecuado durante el examen.',
    nivel,
    incidentes,
  };
}

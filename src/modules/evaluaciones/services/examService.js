import { db, ref, get, set, push, update, onValue, remove } from '../../../firebase';
import { llamarApi } from '../../../api';
import { ESTADOS_EXAMEN, TIPOS_PREGUNTA } from '../constants';
import { calificarRespuestaAbierta as calificarIA, calificarRespuestasAbiertasLote } from './geminiService';

// ─── Cola de escritura offline ───────────────────────────────────────────────
// Si Firebase falla por conexión, la operación se encola localmente y se
// reintenta al reconectar. Evita pérdida de datos en Examen en curso.
const _colaEscritura = [];
let _procesandoCola = false;

function _encolarEscritura(fn) {
  _colaEscritura.push({ fn, intentos: 0 });
  _procesarCola();
}

function _procesarCola() {
  if (_procesandoCola || _colaEscritura.length === 0) return;
  _procesandoCola = true;
  const item = _colaEscritura[0];
  item.fn()
    .then(() => {
      _colaEscritura.shift();
      _procesandoCola = false;
      if (_colaEscritura.length > 0) _procesarCola();
    })
    .catch((err) => {
      item.intentos++;
      _procesandoCola = false;
      if (item.intentos < 5) {
        const delay = Math.min(1000 * Math.pow(2, item.intentos), 30000);
        setTimeout(_procesarCola, delay);
      } else {
        _colaEscritura.shift();
        console.error('[ColaEscritura] Operación descartada tras 5 intentos:', err?.message);
      }
    });
}

// Reintentar la cola al reconectar
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (_colaEscritura.length > 0) _procesarCola();
  });
}

function _rutaBase(grado) {
  return `evaluaciones/${grado}`;
}

function _rutaExamen(grado, examenId) {
  return `${_rutaBase(grado)}/examenes/${examenId}`;
}

function _rutaRespuesta(grado, examenId, nie) {
  return `${_rutaBase(grado)}/respuestas/${examenId}/${nie}`;
}

function _rutaProctoring(grado, examenId, nie) {
  return `${_rutaBase(grado)}/proctoring/${examenId}/${nie}`;
}

export async function crearExamen(grado, examen, claveAdmin, docente = null) {
  if (!grado) throw new Error('Selecciona una sección antes de guardar.');
  if (!String(examen?.titulo || '').trim()) throw new Error('El título del examen es obligatorio.');
  if (!Array.isArray(examen?.preguntas) || examen.preguntas.length === 0) {
    throw new Error('Agrega al menos una pregunta antes de guardar.');
  }
  const examenId = push(ref(db, `${_rutaBase(grado)}/examenes`)).key;
  const examenCompleto = {
    id: examenId,
    titulo: examen.titulo || 'Sin título',
    descripcion: examen.descripcion || '',
    materia: examen.materia || '',
    grado: grado,
    creadoPor: docente?.displayName || examen.creadoPor || 'Profesor',
    creadoPorUid: docente?.uid || 'admin-global',
    creadoPorEmail: docente?.email || 'admin@insal.edu.sv',
    preguntas: examen.preguntas || [],
    configuracion: {
      duracionMinutos: examen.configuracion?.duracionMinutos || 60,
      randomizar: examen.configuracion?.randomizar ?? true,
      mostrarPuntaje: examen.configuracion?.mostrarPuntaje ?? true,
      puntajeTotal: examen.configuracion?.puntajeTotal || _calcularPuntajeTotal(examen.preguntas),
      ...examen.configuracion,
    },
    estado: ESTADOS_EXAMEN.BORRADOR,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    claveAdmin,
  };

  await set(ref(db, _rutaExamen(grado, examenId)), examenCompleto);
  return examenCompleto;
}

export async function duplicarExamen(gradoOrigen, examenIdOrigen, gradoDestino, claveAdmin, docente = null) {
  const res = await llamarApi('duplicarExamen', {
    gradoOrigen,
    examenId: examenIdOrigen,
    gradoDestino,
    claveAdmin,
    docenteUid: docente?.uid || null,
    docenteEmail: docente?.email || null,
    docenteNombre: docente?.displayName || null,
  });
  if (!res.ok) throw new Error(res.error || 'Error al duplicar el examen.');
  return res;
}

export async function guardarExamenBorrador(grado, examen, claveAdmin, docente = null) {
  if (!grado) throw new Error('Selecciona una sección antes de guardar.');
  if (!String(examen?.titulo || '').trim()) throw new Error('El título del examen es obligatorio.');
  if (!Array.isArray(examen?.preguntas) || examen.preguntas.length === 0) {
    throw new Error('Agrega al menos una pregunta antes de guardar.');
  }
  if (examen.id) {
    await update(ref(db, _rutaExamen(grado, examen.id)), {
      titulo: examen.titulo,
      descripcion: examen.descripcion,
      materia: examen.materia || '',
      preguntas: examen.preguntas,
      configuracion: examen.configuracion,
      estado: ESTADOS_EXAMEN.BORRADOR,
      updatedAt: new Date().toISOString(),
      claveAdmin,
      ...(docente ? { creadoPorUid: docente.uid, creadoPorEmail: docente.email, creadoPor: docente.displayName } : {}),
    });
  } else {
    return crearExamen(grado, examen, claveAdmin, docente);
  }
  return { ok: true, id: examen.id };
}

export async function publicarExamen(grado, examenId, claveAdmin, datosExamen = null) {
  if (!examenId) throw new Error('ID de examen requerido para publicar.');
  const ruta = ref(db, _rutaExamen(grado, examenId));
  const snapshot = await get(ruta);
  if (!snapshot.exists()) throw new Error('El examen no existe; no se puede publicar.');

  // Si se proving los datos completos del examen, guardarlos antes de publicar.
  // Esto corrige el bug donde editar el título de un examen existente y publicarlo
  // no guardaba los cambios (solo flippeaba el estado).
  const updates = {
    estado: ESTADOS_EXAMEN.ACTIVO,
    updatedAt: new Date().toISOString(),
    claveAdmin,
  };
  if (datosExamen) {
    updates.titulo = datosExamen.titulo;
    updates.descripcion = datosExamen.descripcion;
    updates.materia = datosExamen.materia;
    updates.preguntas = datosExamen.preguntas;
    updates.configuracion = datosExamen.configuracion;
  }
  await update(ruta, updates);
}

export async function cambiarEstadoExamen(grado, examenId, nuevoEstado, claveAdmin = '') {
  if (!examenId) throw new Error('ID de examen requerido.');
  const ruta = ref(db, _rutaExamen(grado, examenId));
  const snapshot = await get(ruta);
  const data = snapshot.val();
  
  // Logging para depuración: ver qué datos vienen del Firebase
  console.log('[cambiarEstadoExamen] examenId:', examenId, 'exists:', data ? 'yes' : 'no');
  if (data) {
    console.log('[cambiarEstadoExamen] datos actuales:', { estado: data.estado, titulo: data.titulo, id: data.id });
  }

  if (!snapshot.exists()) throw new Error('El examen no existe; no se puede cambiar su estado.');
  
  // Validación extra: si el examen está en borrador y no tiene preguntas, 
  // podría ser un borrador incompleto. Lo activamos de todas formas pero avisando.
  if (data.estado === 'borrador' && (!data.preguntas || data.preguntas.length === 0)) {
    console.warn('[cambiarEstadoExamen] Advertencia: Examen en borrador sin preguntas. Se activará de todas formas.');
  }

  await update(ruta, {
    estado: nuevoEstado,
    updatedAt: new Date().toISOString(),
    claveAdmin,
  });
  return { ok: true, nuevoEstado };
}

export async function obtenerExamen(grado, examenId) {
  const snapshot = await get(ref(db, _rutaExamen(grado, examenId)));
  const data = snapshot.val();
  return data ? { ...data, id: examenId } : null;
}

export async function listarExamenes(grado, estado = null, docenteUid = null) {
  const snapshot = await get(ref(db, `${_rutaBase(grado)}/examenes`));
  const data = snapshot.val() || {};
  let examenes = Object.entries(data)
    .map(([id, examen]) => ({ ...examen, id }))
    .filter((e) => !e.eliminado);

  if (docenteUid && docenteUid !== 'super-admin') {
    examenes = examenes.filter((e) => e.creadoPorUid === docenteUid || !e.creadoPorUid);
  }

  const ordenados = examenes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (estado) return ordenados.filter((e) => e.estado === estado);
  return ordenados;
}

export async function eliminarExamen(grado, examenId, claveAdmin = '', docenteUid = null, docenteEmail = null) {
  // Si hay claveAdmin, se valida normalmente
  if (claveAdmin) {
    const res = await llamarApi('eliminarExamen', { grado, examenId, claveAdmin });
    if (!res.ok) throw new Error(res.error || 'Error al eliminar el examen.');
    return res;
  }
  // Si no hay claveAdmin pero hay docente logueado con @clases.edu.sv, usar sus datos
  if (docenteUid && docenteEmail && docenteEmail.endsWith('@clases.edu.sv')) {
    const res = await llamarApi('eliminarExamen', { grado, examenId, docenteUid, docenteEmail });
    if (!res.ok) throw new Error(res.error || 'Error al eliminar el examen.');
    return res;
  }
  // Si no hay ninguna validación, lanzar error
  throw new Error('No se pueden eliminar exámenes sin clave de administrador ni sesión de docente válida.');
}

export async function iniciarExamen(grado, examenId, estudiante) {
  const examen = await obtenerExamen(grado, examenId);
  if (!examen) throw new Error('Examen no encontrado.');
  if (examen.estado !== ESTADOS_EXAMEN.ACTIVO) throw new Error('El examen no está activo.');

  const yaExiste = await get(ref(db, _rutaRespuesta(grado, examenId, estudiante.nie)));
  if (yaExiste.val()) {
    const existe = yaExiste.val();
    // Examen ya finalizado: no se permite repetirlo ni sobrescribir el registro.
    if (existe.status === ESTADOS_EXAMEN.FINALIZADO) {
      throw new Error('Ya completaste este examen. No se puede volver a realizar.');
    }
    return { ...existe, id: examenId, examen };
  }

  const inicio = {
    nie: estudiante.nie,
    nombre: estudiante.nombres + ' ' + estudiante.apellidos,
    fotoUrl: estudiante.fotoUrl || '',
    grado: grado,
    examenId: examenId,
    startTime: new Date().toISOString(),
    endTime: null,
    status: ESTADOS_EXAMEN.EN_CURSO,
    respuestas: {},
    eventosProctoring: [],
    navegador: _detectarNavegador(),
  };

  await set(ref(db, _rutaRespuesta(grado, examenId, estudiante.nie)), inicio);

  const proctoringInfo = {
    nombre: inicio.nombre,
    fotoUrl: inicio.fotoUrl,
    status: ESTADOS_EXAMEN.EN_CURSO,
    ultimaActualizacion: inicio.startTime,
  };
  await update(ref(db, _rutaProctoring(grado, examenId, estudiante.nie)), proctoringInfo);

  return { ...inicio, id: examenId, examen };
}

export async function guardarRespuesta(grado, examenId, nie, preguntaId, valor) {
  const ruta = `${_rutaRespuesta(grado, examenId, nie)}/respuestas/${preguntaId}`;
  try {
    await set(ref(db, ruta), {
      valor,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    _encolarEscritura(() => set(ref(db, ruta), { valor, timestamp: new Date().toISOString() }));
    throw err;
  }
}

/** Guardado batch de todas las respuestas a la vez (periodico o al salir). */
export async function guardarRespuestasBatch(grado, examenId, nie, respuestas) {
  if (!respuestas || Object.keys(respuestas).length === 0) return;
  const ruta = `${_rutaRespuesta(grado, examenId, nie)}/respuestas`;
  const batch = {};
  Object.entries(respuestas).forEach(([pid, valor]) => {
    batch[pid] = { valor, timestamp: new Date().toISOString() };
  });
  try {
    await set(ref(db, ruta), batch);
    await update(ref(db, _rutaRespuesta(grado, examenId, nie)), {
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    _encolarEscritura(async () => {
      await set(ref(db, ruta), batch);
      await update(ref(db, _rutaRespuesta(grado, examenId, nie)), {
        updatedAt: new Date().toISOString(),
      });
    });
    throw err;
  }
}

export async function guardarBorradorRespuestas(grado, examenId, nie, respuestas) {
  await set(ref(db, `${_rutaRespuesta(grado, examenId, nie)}/respuestas`), respuestas);
  await update(ref(db, _rutaRespuesta(grado, examenId, nie)), {
    updatedAt: new Date().toISOString(),
  });
}

export async function registrarEventoProctoring(grado, examenId, nie, evento) {
  const eventoConSeveridad = {
    id: `${evento.tipo}-${Date.now()}`,
    ...evento,
    severidad: _severidadEvento(evento.tipo),
    timestamp: new Date().toISOString(),
  };

  try {
    await push(ref(db, _rutaProctoring(grado, examenId, nie) + '/eventos'), eventoConSeveridad);
  } catch (err) {
    _encolarEscritura(() =>
      push(ref(db, _rutaProctoring(grado, examenId, nie) + '/eventos'), eventoConSeveridad)
    );
  }
  return eventoConSeveridad;
}

export async function actualizarStatusProctoring(grado, examenId, nie, status) {
  await update(ref(db, _rutaProctoring(grado, examenId, nie)), {
    status,
    ultimaActualizacion: new Date().toISOString(),
  });
}

export function escucharProctoring(grado, examenId, callback) {
  const dbRef = ref(db, `${_rutaBase(grado)}/proctoring/${examenId}`);
  const unsubscribe = onValue(dbRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
  return unsubscribe;
}

export function escucharRespuesta(grado, examenId, nie, callback) {
  const dbRef = ref(db, _rutaRespuesta(grado, examenId, nie));
  const unsubscribe = onValue(dbRef, (snapshot) => {
    callback(snapshot.val() || null);
  });
  return unsubscribe;
}

export function escucharRespuestasExamen(grado, examenId, callback) {
  const dbRef = ref(db, `${_rutaBase(grado)}/respuestas/${examenId}`);
  const unsubscribe = onValue(dbRef, (snapshot) => {
    callback(snapshot.val() || {});
  });
  return unsubscribe;
}

export async function finalizarExamen(grado, examenId, nie, { calificacion } = {}) {
  const updates = {
    endTime: new Date().toISOString(),
    status: ESTADOS_EXAMEN.FINALIZADO,
  };
  if (calificacion) {
    Object.assign(updates, calificacion);
  }

  const ruta = _rutaRespuesta(grado, examenId, nie);
  const rutaProc = _rutaProctoring(grado, examenId, nie);

  try {
    await update(ref(db, ruta), updates);
  } catch (err) {
    _encolarEscritura(() => update(ref(db, ruta), updates));
    throw err;
  }

  try {
    await update(ref(db, rutaProc), {
      status: ESTADOS_EXAMEN.FINALIZADO,
      ultimaActualizacion: new Date().toISOString(),
    });
  } catch (_err) {
    _encolarEscritura(() =>
      update(ref(db, rutaProc), {
        status: ESTADOS_EXAMEN.FINALIZADO,
        ultimaActualizacion: new Date().toISOString(),
      })
    );
  }
}

export async function reiniciarTiempoExamen(grado, examenId, nie) {
  const res = await llamarApi('reiniciarTiempoExamen', { grado, examenId, nie });
  if (!res.ok) throw new Error(res.error || 'No se pudo reiniciar el tiempo.');
  return res;
}

function _calcularPuntajeTotal(preguntas) {
  if (!preguntas || preguntas.length === 0) return 0;
  return preguntas.reduce((sum, p) => sum + (p.puntaje || 0), 0);
}

export function validarRespuestaAutomatica(pregunta, respuesta) {
  switch (pregunta.tipo) {
    case TIPOS_PREGUNTA.OPCION_MULTIPLE: {
      const seleccion = Array.isArray(respuesta) ? respuesta : [respuesta];
      const correctas = pregunta.opcionesCorrectas || [];
      if (correctas.length === 0) {
        return { correcta: false, puntajeObtenido: 0, detalle: { seleccion, correctas } };
      }
      const aciertos = seleccion.filter((s) => correctas.includes(s)).length;
      // Penalizar selecciones incorrectas: marcar todas las opciones no puede
      // dar crédito completo.
      const errores = seleccion.filter((s) => !correctas.includes(s)).length;
      const neto = Math.max(0, aciertos - errores);
      const esExacta = aciertos === correctas.length && seleccion.length === correctas.length;
      const puntajeParcial = (neto / correctas.length) * (pregunta.puntaje || 1);
      return {
        correcta: esExacta,
        puntajeObtenido: Math.round(puntajeParcial * 100) / 100,
        detalle: { seleccion, correctas },
      };
    }

    case TIPOS_PREGUNTA.VERDADERO_FALSO: {
      const esCorrecta = respuesta === pregunta.respuestaCorrecta;
      return {
        correcta: esCorrecta,
        puntajeObtenido: esCorrecta ? (pregunta.puntaje || 1) : 0,
        detalle: { respuesta, esperada: pregunta.respuestaCorrecta },
      };
    }

    case TIPOS_PREGUNTA.ORDENAR: {
      // Contrato: pregunta.items = secuencia CORRECTA (definida por el docente
      // al arrastrar); respuesta del estudiante = textos en su orden acomodado.
      // La vista los muestra barajados de forma estable, nunca resueltos.
      const secuencia = Array.isArray(respuesta) ? respuesta : [];
      const secuenciaCorrecta = Array.isArray(pregunta.items) ? pregunta.items : [];
      if (secuenciaCorrecta.length === 0) {
        return { correcta: false, puntajeObtenido: 0, detalle: { secuencia, total: 0 } };
      }
      const aciertos = secuencia.filter((t, i) => t === secuenciaCorrecta[i]).length;
      const puntajeParcial = (aciertos / secuenciaCorrecta.length) * (pregunta.puntaje || 1);
      return {
        correcta: aciertos === secuenciaCorrecta.length,
        puntajeObtenido: Math.round(puntajeParcial * 100) / 100,
        detalle: { aciertos, total: secuenciaCorrecta.length },
      };
    }

    case TIPOS_PREGUNTA.EMPAREJAR: {
      const emparejamientoEstudiante = respuesta || {};
      // La clave de emparejamiento se deriva de los pares si no fue persistida:
      // cada elemento izquierdo (par.id) coincide con el elemento derecho del mismo id.
      let correcto = pregunta.emparejamientoCorrecto;
      if ((!correcto || Object.keys(correcto).length === 0) && Array.isArray(pregunta.pares)) {
        correcto = Object.fromEntries(pregunta.pares.map((p) => [String(p.id), String(p.id)]));
      }
      correcto = correcto || {};
      const total = Object.keys(correcto).length;
      if (total === 0) {
        return { correcta: false, puntajeObtenido: 0, detalle: { aciertos: 0, total } };
      }
      const aciertos = Object.keys(correcto).filter(
        (k) => String(emparejamientoEstudiante[k] ?? '') === String(correcto[k])
      ).length;
      const puntajeParcial = (aciertos / total) * (pregunta.puntaje || 1);
      return {
        correcta: aciertos === total,
        puntajeObtenido: Math.round(puntajeParcial * 100) / 100,
        detalle: { aciertos, total },
      };
    }

    case TIPOS_PREGUNTA.FORMULA: {
      const esCorrecta = String(respuesta || '').trim() === String(pregunta.respuestaCorrecta || '').trim();
      return {
        correcta: esCorrecta,
        puntajeObtenido: esCorrecta ? (pregunta.puntaje || 1) : 0,
        detalle: { respuesta, esperada: pregunta.respuestaCorrecta },
      };
    }

    default:
      return null;
  }
}

export async function calificarRespuestaAbierta(grado, examenId, preguntaId, respuestasPorEstudiante) {
  const resultados = [];
  for (const { nie, respuesta, enunciado, rubrica, puntajeMaximo } of respuestasPorEstudiante) {
    const result = await calificarIA({ enunciado, rubrica, respuesta, puntajeMaximo });
    resultados.push({ nie, preguntaId, ...result });
  }
  return resultados;
}

export async function obtenerRespuestasExamen(grado, examenId) {
  const snapshot = await get(ref(db, `${_rutaBase(grado)}/respuestas/${examenId}`));
  const data = snapshot.val() || {};
  return Object.entries(data).map(([nie, resp]) => ({ ...resp, nie }));
}

// ─── Cache de calificaciones ────────────────────────────────────────────────
// Las calificaciones se persisten en Firebase después de calcularlas para no
// re-ejecutar la IA cada vez que el docente abre el reporte.

export async function obtenerCalificacionesCache(grado, examenId) {
  try {
    const snapshot = await get(ref(db, `${_rutaBase(grado)}/calificaciones/${examenId}`));
    const data = snapshot.val();
    if (data && Array.isArray(data.lista) && data.lista.length > 0 && data.calculadoEn) {
      // Cache válido por 24 horas
      const horas = (Date.now() - new Date(data.calculadoEn).getTime()) / 3600000;
      if (horas < 24) return data.lista;
    }
  } catch (_err) {}
  return null;
}

export async function guardarCalificacionesCache(grado, examenId, calificaciones) {
  try {
    await set(ref(db, `${_rutaBase(grado)}/calificaciones/${examenId}`), {
      lista: calificaciones,
      calculadoEn: new Date().toISOString(),
      total: calificaciones.length,
    });
  } catch (_err) {
    // No bloquea si falla el cache
  }
}

export async function calcularCalificacionesExamen(grado, examenId, { forzar = false } = {}) {
  // 1. Intentar cache
  if (!forzar) {
    const cache = await obtenerCalificacionesCache(grado, examenId);
    if (cache) return cache;
  }

  // 2. Calcular desde cero
  const examen = await obtenerExamen(grado, examenId);
  if (!examen) throw new Error('Examen no encontrado.');

  const respuestas = await obtenerRespuestasExamen(grado, examenId);
  const puntajeMaximo = examen.configuracion.puntajeTotal || _calcularPuntajeTotal(examen.preguntas);

  const resultados = [];
  const loteAbiertas = [];

  for (const resp of respuestas) {
    if (resp.status !== ESTADOS_EXAMEN.FINALIZADO) continue;

    let puntajeTotal = 0;
    const detallePreguntas = [];

    for (const pregunta of examen.preguntas) {
      const respuesta = resp.respuestas?.[pregunta.id]?.valor;

      if (pregunta.tipo === TIPOS_PREGUNTA.ABIERTO) {
        loteAbiertas.push({
          ref: { nie: resp.nie, preguntaId: pregunta.id },
          enunciado: pregunta.enunciado,
          rubrica: pregunta.rubrica,
          respuesta: respuesta || '',
          puntajeMaximo: pregunta.puntaje || 2,
        });
      } else {
        const auto = validarRespuestaAutomatica(pregunta, respuesta);
        if (auto) {
          puntajeTotal += auto.puntajeObtenido;
          detallePreguntas.push({ preguntaId: pregunta.id, tipo: pregunta.tipo, ...auto });
        }
      }
    }

    resultados.push({
      nie: resp.nie,
      nombre: resp.nombre,
      _puntaje: puntajeTotal,
      _detalle: detallePreguntas,
      startTime: resp.startTime,
      endTime: resp.endTime,
    });
  }

  const califsAbiertas = loteAbiertas.length > 0 ? await calificarRespuestasAbiertasLote(loteAbiertas) : [];
  const mapaCalifs = {};
  loteAbiertas.forEach((it, i) => {
    const r = califsAbiertas[i];
    if (r) mapaCalifs[`${it.ref.nie}||${it.ref.preguntaId}`] = r;
  });

  const listaResultados = resultados.map((res) => {
    let puntajeTotal = res._puntaje;
    const detallePreguntas = res._detalle;

    for (const pregunta of examen.preguntas) {
      if (pregunta.tipo !== TIPOS_PREGUNTA.ABIERTO) continue;
      const r = mapaCalifs[`${res.nie}||${pregunta.id}`];
      if (r) {
        puntajeTotal += r.score;
        detallePreguntas.push({
          preguntaId: pregunta.id,
          tipo: pregunta.tipo,
          score: r.score,
          feedback: r.feedback,
          ai_detection_flag: r.ai_detection_flag,
        });
      } else {
        detallePreguntas.push({
          preguntaId: pregunta.id,
          tipo: pregunta.tipo,
          score: 0,
          feedback: 'No fue posible calificar automáticamente. Revisar manualmente.',
          ai_detection_flag: 0,
        });
      }
    }

    const porcentaje = puntajeMaximo > 0 ? Math.round((puntajeTotal / puntajeMaximo) * 100) : 0;
    return {
      nie: res.nie,
      nombre: res.nombre,
      puntajeObtenido: Math.round(puntajeTotal * 100) / 100,
      puntajeTotal: puntajeMaximo,
      porcentaje,
      calificacion: _calcularCalificacion(porcentaje),
      detallePreguntas,
      endTime: res.endTime,
      tiempoTotal: res.endTime ? _calcularTiempoTranscurrido(res.startTime, res.endTime) : null,
    };
  });

  // 3. Persistir cache para no re-calificar con IA la próxima vez
  guardarCalificacionesCache(grado, examenId, listaResultados);

  return listaResultados;
}

function _calcularCalificacion(porcentaje) {
  if (porcentaje >= 90) return 'A (Excelente)';
  if (porcentaje >= 80) return 'B (Bueno)';
  if (porcentaje >= 70) return 'C (Satisfactorio)';
  if (porcentaje >= 60) return 'D (Aceptable)';
  return 'F (Insuficiente)';
}

function _detectarNavegador() {
  if (typeof navigator === 'undefined') return { nombre: 'Desconocido', dispositivo: 'Desktop', os: '' };
  const ua = navigator.userAgent || '';
  let nombre = 'Desconocido';
  if (/Edg\//i.test(ua)) nombre = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) nombre = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) nombre = 'Chrome';
  else if (/Firefox\//i.test(ua)) nombre = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) nombre = 'Safari';
  else if (/MSIE|Trident/i.test(ua)) nombre = 'Internet Explorer';

  const esMovil = /Mobi|Android|iPhone|iPad|Tablet/i.test(ua);
  const dispositivo = esMovil ? 'Móvil' : 'Desktop';

  let os = '';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { nombre, dispositivo, os, userAgent: ua.slice(0, 150) };
}

function _severidadEvento(tipo) {
  const mapa = {
    blur_window: 'suspicion',
    visibility_change: 'suspicion',
    exit_fullscreen: 'warning',
    tab_switch: 'warning',
    paste_bloqueado: 'warning',
    copy_bloqueado: 'warning',
    cut_bloqueado: 'warning',
    context_menu_bloqueado: 'warning',
    tecla_bloqueada: 'warning',
    paste_rapido: 'warning',
    insercion_masiva: 'warning',
    insercion_masiva_input: 'warning',
  };
  return mapa[tipo] || 'normal';
}

function _calcularTiempoTranscurrido(inicio, fin) {
  const ms = new Date(fin) - new Date(inicio);
  const segundos = Math.floor(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return `${minutos}m ${segs}s`;
}

/**
 * @typedef {Object} OpcionRespuesta
 * @property {string} id
 * @property {string} texto
 */

/**
 * @typedef {Object} PreguntaBase
 * @property {string} id
 * @property {string} enunciado
 * @property {string} tipo
 * @property {number} puntaje
 * @property {string} [tema]
 * @property {number} [orden]
 * @property {string} [rubrica]
 */

/**
 * @typedef {PreguntaBase & Object} PreguntaOpcionMultiple
 * @property {OpcionRespuesta[]} opciones
 * @property {string[]} opcionesCorrectas
 */

/**
 * @typedef {PreguntaBase & Object} PreguntaVerdaderoFalso
 * @property {boolean} respuestaCorrecta
 * @property {string} [justificacionCorrecta]
 */

/**
 * @typedef {PreguntaBase & Object} PreguntaAbierta
*/

/**
 * @typedef {PreguntaBase & Object} PreguntaOrdenar
 * @property {string[]} items - items desordenados
 * @property {string[]} ordenCorrecto
 */

/**
 * @typedef {PreguntaBase & Object} PreguntaEmparejar
 * @property {Array<{id: string, izquierda: string, derecha: string}>} preguntas
 * @property {Object<string, string>} emparejamientoCorrecto - {preguntaId: respuestaId}
 */

/**
 * @typedef {PreguntaBase & Object} PreguntaFormula
 * @property {string} formula
 * @property {string} respuestaCorrecta
 */

/**
 * @typedef {Object} Examen
 * @property {string} id
 * @property {string} titulo
 * @property {string} [descripcion]
 * @property {string} grado
 * @property {string} creadoPor
 * @property {Array<PreguntaBase>} preguntas
 * @property {Object} configuracion
 * @property {number} configuracion.duracionMinutos
 * @property {boolean} configuracion.randomizar
 * @property {boolean} configuracion.mostrarPuntaje
 * @property {number} configuracion.puntajeTotal
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} EventoProctoring
 * @property {string} id
 * @property {string} tipo
 * @property {string} timestamp
 * @property {Object} detalles
 */

/**
 * @typedef {Object} RespuestaEstudiante
 * @property {string} preguntaId
 * @property {*} valor
 * @property {string} timestamp
 */

/**
 * @typedef {Object} ResultadoExamen
 * @property {string} nie
 * @property {string} examenId
 * @property {number} puntajeObtenido
 * @property {number} puntajeTotal
 * @property {number} porcentaje
 * @property {string} calificacion
 * @property {Object} feedback
 * @property {string} endTime
 * @property {Array<RespuestaEstudiante>} respuestas
 * @property {Array<EventoProctoring>} eventosProctoring
 */




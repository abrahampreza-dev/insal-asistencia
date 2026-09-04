import { db, ref, set, update, remove, leerRuta } from '../../firebase';

export function generarId(prefix = '') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  return prefix ? `${prefix}_${id}` : id;
}

export function rutaRubricas(grado) {
  return `evaluaciones/${grado}/rubricas`;
}

export function rutaGrupos(grado, rubricaId) {
  return `evaluaciones/${grado}/grupos/${rubricaId}`;
}

export function rutaCalificaciones(grado, rubricaId) {
  return `evaluaciones/${grado}/calificaciones/${rubricaId}`;
}

export function rutaEvaluadores(grado, rubricaId) {
  return `evaluaciones/${grado}/evaluadores/${rubricaId}`;
}

export async function invitarEvaluador(grado, rubricaId, evaluadorData) {
  const uid = evaluadorData.uid || evaluadorData.email.replace(/[^a-zA-Z0-9]/g, '_');
  await set(ref(db, `${rutaEvaluadores(grado, rubricaId)}/${uid}`), {
    email: evaluadorData.email,
    nombre: evaluadorData.nombre || '',
    uid: evaluadorData.uid || '',
    invitadoPor: evaluadorData.invitadoPor || '',
    invitadoPorNombre: evaluadorData.invitadoPorNombre || '',
    fechaInvitacion: new Date().toISOString(),
    estado: 'activo',
  });
  return { ok: true };
}

export async function revocarEvaluador(grado, rubricaId, evaluadorUid) {
  await remove(ref(db, `${rutaEvaluadores(grado, rubricaId)}/${evaluadorUid}`));
  return { ok: true };
}

export async function guardarCalificacionEvaluador(grado, rubricaId, grupoId, evaluatorUid, datos) {
  const clave = `${grupoId}_${evaluatorUid}`;
  await set(ref(db, `${rutaCalificaciones(grado, rubricaId)}/${clave}`), {
    ...datos,
    evaluatorUid,
    fecha: new Date().toISOString(),
  });
  return { ok: true };
}

export function calcularPromedioColaborativo(calificaciones, grupoId) {
  const entradas = Object.entries(calificaciones || {}).filter(([key]) => key.startsWith(`${grupoId}_`));
  if (entradas.length === 0) return null;

  const totalGrupoPromedio = entradas.reduce((sum, [, c]) => sum + (c.totalGrupo || 0), 0) / entradas.length;

  const integrantesPromedio = {};
  entradas.forEach(([, c]) => {
    Object.entries(c.integrantes || {}).forEach(([nie, data]) => {
      if (!integrantesPromedio[nie]) integrantesPromedio[nie] = { suma: 0, count: 0 };
      integrantesPromedio[nie].suma += data.notaIndividual || 0;
      integrantesPromedio[nie].count++;
    });
  });

  const integrantes = {};
  for (const nie in integrantesPromedio) {
    const { suma, count } = integrantesPromedio[nie];
    const notaIndividualPromedio = suma / count;
    integrantes[nie] = {
      notaIndividual: Math.round(notaIndividualPromedio * 100) / 100,
      notaFinal: Math.round(((notaIndividualPromedio + totalGrupoPromedio) / 2) * 100) / 100,
    };
  }

  return {
    totalGrupo: Math.round(totalGrupoPromedio * 100) / 100,
    integrantes,
    numEvaluadores: entradas.length,
  };
}

export async function eliminarRubrica(grado, id) {
  await remove(ref(db, `${rutaRubricas(grado)}/${id}`));
  await remove(ref(db, rutaGrupos(grado, id)));
  await remove(ref(db, rutaCalificaciones(grado, id)));
  await remove(ref(db, rutaEvaluadores(grado, id)));
  return { ok: true };
}

export async function eliminarGrupo(grado, rubricaId, grupoId) {
  await remove(ref(db, `${rutaGrupos(grado, rubricaId)}/${grupoId}`));
  const calificaciones = await leerRuta(rutaCalificaciones(grado, rubricaId)) || {};
  for (const key of Object.keys(calificaciones)) {
    if (key === grupoId || key.startsWith(`${grupoId}_`)) {
      await remove(ref(db, `${rutaCalificaciones(grado, rubricaId)}/${key}`));
    }
  }
  return { ok: true };
}

export async function crearRubrica(grado, datos) {
  const id = generarId('rub');
  const ahora = new Date().toISOString();
  await set(ref(db, `${rutaRubricas(grado)}/${id}`), {
    id,
    ...datos,
    publicado: false,
    createdAt: ahora,
    updatedAt: ahora,
  });
  return { ok: true, id };
}

export async function actualizarRubrica(grado, id, campos) {
  await update(ref(db, `${rutaRubricas(grado)}/${id}`), {
    ...campos,
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

export async function alternarPublicacion(grado, id, publicado) {
  return actualizarRubrica(grado, id, { publicado });
}

export async function crearGrupo(grado, rubricaId, datos) {
  const id = generarId('grp');
  await set(ref(db, `${rutaGrupos(grado, rubricaId)}/${id}`), {
    id,
    ...datos,
    createdAt: new Date().toISOString(),
  });
  return { ok: true, id };
}

export async function guardarCalificacion(grado, rubricaId, grupoId, datos) {
  await set(ref(db, `${rutaCalificaciones(grado, rubricaId)}/${grupoId}`), {
    ...datos,
    fecha: new Date().toISOString(),
  });
  return { ok: true };
}

export function generarCSV(columnas, filas) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [columnas.map(esc).join(';'), ...filas.map((f) => f.map(esc).join(';'))];
  return '\uFEFF' + lineas.join('\r\n');
}

export function descargarArchivo(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PLANTILLA_IDEA_NEGOCIO = {
  titulo: 'Presentación de Idea de Negocio',
  descripcion:
    'Rúbrica para evaluar la exposición grupal de la idea de negocio en la feria institucional. Cada criterio se califica en escala Alto (1.0), Medio (0.8) o Bajo (0.5).',
  criterios: [
    { id: 'c1', nombre: 'Introducción del Proyecto', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c2', nombre: 'Objetivos SMART', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c3', nombre: 'Idea de Negocio + Teoría', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c4', nombre: 'Misión, Visión e Impacto', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c5', nombre: 'Valores y Roles', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c6', nombre: 'FODA + Cronograma Gantt', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c7', nombre: 'Plan Financiero', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c8', nombre: 'Material Gráfico de venta + Difusión', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c9', nombre: 'Stand Expotecnía', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
    { id: 'c10', nombre: 'Presentación general de Idea de Negocio', maxPuntos: 1.0, niveles: [
      { etiqueta: 'Alto', puntos: 1.0 }, { etiqueta: 'Medio', puntos: 0.8 }, { etiqueta: 'Bajo', puntos: 0.5 } ] },
  ],
};
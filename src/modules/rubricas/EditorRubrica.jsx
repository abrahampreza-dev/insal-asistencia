import React, { useState } from 'react';
import { useMaterias } from '../../hooks/useMaterias';
import { Spinner, AlertaError } from '../../components/EstadoPeticion';
import { useToast } from '../../context/ToastContext';
import { crearRubrica, actualizarRubrica, generarId, PLANTILLA_IDEA_NEGOCIO, descargarArchivo } from './rubricaService';
import { plantillaRubricaCSV, parsearPlantillaRubrica, leerArchivoRubrica } from './plantillaRubrica';

function criterioVacio() {
  return {
    id: generarId('c'),
    nombre: '',
    maxPuntos: 1.0,
    niveles: [
      { etiqueta: 'Alto', puntos: 1.0 },
      { etiqueta: 'Medio', puntos: 0.8 },
      { etiqueta: 'Bajo', puntos: 0.5 },
    ],
  };
}

export default function EditorRubrica({ grado, docenteUser, rubrica, onGuardado, onCancelar }) {
  const { materias } = useMaterias();
  const { toastSuccess, toastError, toastInfo } = useToast();

  const [titulo, setTitulo] = useState(rubrica?.titulo || '');
  const [materia, setMateria] = useState(rubrica?.materia || '');
  const [descripcion, setDescripcion] = useState(rubrica?.descripcion || '');
  const [criterios, setCriterios] = useState(
    rubrica?.criterios?.length ? rubrica.criterios : []
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [importando, setImportando] = useState(false);
  const [importarError, setImportarError] = useState('');

  const maxTotal = criterios.reduce((s, c) => s + Number(c.maxPuntos || 0), 0);

  function descargarPlantilla() {
    descargarArchivo('Plantilla_Rubrica.csv', plantillaRubricaCSV());
    toastInfo('Plantilla descargada. Complétala en Excel y súbela.');
  }

  async function manejarArchivo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportando(true);
    setImportarError('');
    try {
      const texto = await leerArchivoRubrica(file);
      const res = parsearPlantillaRubrica(texto, materias);
      if (!res.ok) {
        setImportarError('No se pudo importar la plantilla. Revisa cada punto:\n' + res.errores.map((er) => `• ${er}`).join('\n'));
        toastError('La plantilla tiene errores. Revisa el reporte.');
        return;
      }
      setTitulo(res.data.titulo);
      setDescripcion(res.data.descripcion);
      setMateria(res.data.materia);
      setCriterios(res.data.criterios);
      toastSuccess(`Plantilla importada: ${res.data.criterios.length} criterios listos. Revisa y guarda.`);
    } catch (err) {
      setImportarError(err.message || 'No se pudo importar el archivo.');
      toastError(err.message || 'Error al importar el archivo.');
    } finally {
      setImportando(false);
    }
  }

  function cargarPlantilla() {
    setTitulo(PLANTILLA_IDEA_NEGOCIO.titulo);
    setDescripcion(PLANTILLA_IDEA_NEGOCIO.descripcion);
    setCriterios(PLANTILLA_IDEA_NEGOCIO.criterios.map((c) => ({
      ...c,
      niveles: c.niveles.map((n) => ({ ...n })),
    })));
  }

  function actualizarCriterio(i, campo, valor) {
    setCriterios((prev) => prev.map((c, idx) => (idx === i ? { ...c, [campo]: valor } : c)));
  }

  function actualizarNivel(i, j, campo, valor) {
    setCriterios((prev) =>
      prev.map((c, idx) =>
        idx === i
          ? { ...c, niveles: c.niveles.map((n, nj) => (nj === j ? { ...n, [campo]: valor } : n)) }
          : c
      )
    );
  }

  async function guardar() {
    setError('');
    if (!titulo.trim()) { setError('Escribe un título para la rúbrica.'); return; }
    if (criterios.length === 0) { setError('Agrega al menos un criterio de evaluación.'); return; }

    for (let i = 0; i < criterios.length; i++) {
      const c = criterios[i];
      if (!c.nombre.trim()) { setError(`El criterio ${i + 1} no tiene nombre.`); return; }
      const max = Number(c.maxPuntos);
      if (isNaN(max) || max <= 0) { setError(`El criterio "${c.nombre}" debe tener un puntaje máximo mayor a 0.`); return; }
      for (const n of c.niveles) {
        if (!n.etiqueta.trim()) { setError(`El criterio "${c.nombre}" tiene un nivel sin etiqueta.`); return; }
        const p = Number(n.puntos);
        if (isNaN(p) || p < 0) { setError(`El criterio "${c.nombre}" tiene un nivel con puntos inválidos.`); return; }
        if (p > max) { setError(`El nivel "${n.etiqueta}" (${p}) supera el puntaje máximo del criterio "${c.nombre}" (${max}).`); return; }
      }
    }

    const datos = {
      titulo: titulo.trim(),
      materia,
      descripcion: descripcion.trim(),
      criterios: criterios.map((c) => ({
        id: c.id,
        nombre: c.nombre.trim(),
        maxPuntos: Number(c.maxPuntos),
        niveles: c.niveles.map((n) => ({ etiqueta: n.etiqueta.trim(), puntos: Number(n.puntos) })),
      })),
      creadoPor: docenteUser?.displayName || '',
      creadoPorEmail: docenteUser?.email || '',
      creadoPorUid: docenteUser?.uid || '',
    };

    setGuardando(true);
    const res = rubrica
      ? await actualizarRubrica(grado, rubrica.id, datos)
      : await crearRubrica(grado, datos);
    setGuardando(false);

    if (res.ok) {
      toastSuccess(rubrica ? 'Rúbrica actualizada correctamente.' : 'Rúbrica creada correctamente.');
      onGuardado();
    } else {
      toastError('No se pudo guardar la rúbrica.');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black italic uppercase text-slate-100">
            {rubrica ? 'Editar Rúbrica' : 'Nueva Rúbrica'}
          </h2>
          <p className="text-[9px] font-bold italic text-slate-400">
            Sección {grado} · Docente: {docenteUser?.displayName || ''}
          </p>
        </div>
        <button
          onClick={onCancelar}
          className="flex items-center gap-2 bg-slate-800 text-slate-200 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
        >
          <i className="fas fa-arrow-left" /> Volver
        </button>
      </div>

      {!rubrica && (
        <button
          onClick={cargarPlantilla}
          className="w-full flex items-center justify-between gap-3 bg-indigo-600/10 border border-indigo-500/30 hover:border-indigo-500/60 rounded-2xl px-5 py-4 transition group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <i className="fas fa-file-circle-plus text-indigo-400" />
            </span>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase italic text-indigo-300">Usar plantilla de ejemplo</p>
              <p className="text-[9px] font-bold italic text-slate-400">
                Carga la rúbrica "Presentación de Idea de Negocio" con los 10 criterios (Alto 1.0 / Medio 0.8 / Bajo 0.5).
              </p>
            </div>
          </div>
          <i className="fas fa-chevron-right text-indigo-400 group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 space-y-3">
        <div>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 italic">
            Importar desde plantilla (Excel/CSV)
          </h3>
          <p className="text-[9px] font-bold italic text-slate-500">
            Descarga la plantilla, complétala en Excel y súbela: el sistema interpreta automáticamente títulos, criterios, niveles y puntos (respeta tildes y espacios).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={descargarPlantilla}
            className="flex items-center gap-2 bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
          >
            <i className="fas fa-file-arrow-down" /> Descargar plantilla
          </button>
          <label
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition cursor-pointer ${
              importando ? 'bg-slate-800 opacity-60 pointer-events-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20'
            }`}
          >
            {importando ? <Spinner texto="Leyendo..." /> : <><i className="fas fa-file-import" /> Subir plantilla</>}
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={manejarArchivo} className="hidden" />
          </label>
        </div>
        {importarError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 shadow-sm whitespace-pre-line text-[10px] font-bold italic">
            {importarError}
          </div>
        )}
      </div>

      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
              Título de la rúbrica
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Presentación de Idea de Negocio"
              className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-black italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
              Materia (opcional)
            </label>
            <select
              value={materia}
              onChange={(e) => setMateria(e.target.value)}
              className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-black italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Sin materia</option>
              {materias.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic block mb-1.5 ml-1">
            Descripción
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={2}
            placeholder="Describe qué se evalúa y cómo se usará la rúbrica."
            className="w-full p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic">
              Criterios de evaluación
            </h3>
            <p className="text-[9px] font-bold italic text-slate-500">
              Cada criterio tiene 3 niveles de desempeño con su puntaje. Puntaje máximo total: {maxTotal.toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setCriterios((prev) => [...prev, criterioVacio()])}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition"
          >
            <i className="fas fa-plus" /> Agregar criterio
          </button>
        </div>

        <AlertaError mensaje={error} />

        {criterios.length === 0 && (
          <div className="text-center py-8 bg-slate-950 rounded-2xl border border-slate-800">
            <i className="fas fa-list-check text-3xl text-slate-600" />
            <p className="text-xs font-bold italic text-slate-400 mt-3">
              Aún no hay criterios. Agrégales uno o usa la plantilla de ejemplo.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {criterios.map((c, i) => (
            <div key={c.id} className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-[10px] font-black text-indigo-300">
                  {i + 1}
                </span>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_160px] gap-3">
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest italic">Nombre del criterio</label>
                    <input
                      value={c.nombre}
                      onChange={(e) => actualizarCriterio(i, 'nombre', e.target.value)}
                      placeholder={`Criterio ${i + 1}`}
                      className="w-full p-2.5 bg-slate-900 rounded-lg border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest italic">Pts. máx.</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={c.maxPuntos}
                      onChange={(e) => actualizarCriterio(i, 'maxPuntos', e.target.value)}
                      className="w-full p-2.5 bg-slate-900 rounded-lg border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setCriterios((prev) => prev.filter((_, idx) => idx !== i))}
                  className="text-rose-400 hover:text-rose-300 text-sm shrink-0"
                  title="Eliminar criterio"
                >
                  <i className="fas fa-trash" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-11">
                {c.niveles.map((n, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <input
                      value={n.etiqueta}
                      onChange={(e) => actualizarNivel(i, j, 'etiqueta', e.target.value)}
                      placeholder="Nivel"
                      className="flex-1 p-2.5 bg-slate-900 rounded-lg border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max={c.maxPuntos}
                      value={n.puntos}
                      onChange={(e) => actualizarNivel(i, j, 'puntos', e.target.value)}
                      className={`w-24 p-2.5 bg-slate-900 rounded-lg font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 ${
                        Number(n.puntos) > Number(c.maxPuntos)
                          ? 'border-rose-500 bg-rose-500/10'
                          : 'border-slate-700'
                      }`}
                    />
                    {Number(n.puntos) > Number(c.maxPuntos) && (
                      <span className="text-[7px] text-rose-400 font-bold">Máx: {Number(c.maxPuntos).toFixed(1)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button
          onClick={onCancelar}
          className="px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
        >
          {guardando ? <Spinner texto="Guardando..." /> : <><i className="fas fa-save" /> {rubrica ? 'Guardar cambios' : 'Crear rúbrica'}</>}
        </button>
      </div>
    </div>
  );
}
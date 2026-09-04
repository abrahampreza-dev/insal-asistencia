import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TIPOS_PREGUNTA, ETIQUETAS_TIPOS_PREGUNTA, ICONOS_TIPOS_PREGUNTA } from '../../constants';
import QuestionCard from './QuestionCard';
import IAQuestionGenerator from './IAQuestionGenerator';
import ExamPreviewLive from './ExamPreviewLive';
import { guardarExamenBorrador, listarExamenes, publicarExamen } from '../../services/examService';
import { imprimirHojaExamen } from '../../utils/hojaExamen';
import { useAutoSaveDraft } from '../../hooks';
import { sanearObjetoExamen } from '../../../../utils/sanearTexto';
import { useMaterias } from '../../../../hooks/useMaterias';

const TABS_BUILDER = [
  { id: 'preguntas', texto: 'Preguntas', icono: 'fa-list-check' },
  { id: 'importar', texto: 'Subir Examen', icono: 'fa-file-import' },
  { id: 'configuracion', texto: 'Configuración', icono: 'fa-sliders-h' },
  { id: 'ia', texto: 'Generar preguntas', icono: 'fa-circle-plus' },
  { id: 'vista-previa', texto: 'Vista Previa', icono: 'fa-eye' },
];

const STORAGE_KEY_BUILDER = (grado) => `evaluacion_constructor_${grado}`;

export default function ExamBuilder({ grado, claveAdmin, onExamenGuardado, onCancel, examenAEditar, docente }) {
  const { materias } = useMaterias();
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [materia, setMateria] = useState('');
  const [preguntas, setPreguntas] = useState([]);
  const [configuracion, setConfiguracion] = useState({
    duracionMinutos: 60,
    randomizar: true,
    mostrarPuntaje: true,
    permitirNavegacion: true,
  });
  const [tabActivo, setTabActivo] = useState('preguntas');
  const [guardando, setGuardando] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState('');
  const [examenId, setExamenId] = useState(examenAEditar?.id || null);
  const examenIdRef = useRef(examenAEditar?.id || null);
  const autoSaveTimerRef = useRef(null);
  const [cargandoExamenes, setCargandoExamenes] = useState(false);
  const [examenesGuardados, setExamenesGuardados] = useState([]);
  const [sinGuardar, setSinGuardar] = useState(false);
  const timerMensaje = useRef(null);
  const guardaOcupado = useRef(false);

  // Procesar JSON importado (usado por el lector con detección de encoding)
  const _procesarImportJSON = useCallback((texto) => {
    try {
      const dataRaw = JSON.parse(texto);
      const data = sanearObjetoExamen(dataRaw);

      if (data.titulo) setTitulo(data.titulo);
      if (data.descripcion) setDescripcion(data.descripcion);

      if (!Array.isArray(data.preguntas) || data.preguntas.length === 0) {
        setMensajeGuardado({ tipo: 'error', texto: 'El archivo no contiene preguntas válidas.' });
        return;
      }
      setPreguntas(_normalizarPreguntasImportadas(data.preguntas));
      setExamenId(null);

      if (data.duracionMinutos) {
        setConfiguracion((prev) => ({ ...prev, duracionMinutos: Number(data.duracionMinutos) }));
      }
      setMensajeGuardado({
        tipo: 'exito',
        texto: `¡Examen "${data.titulo || 'Importado'}" cargado con éxito! (${data.preguntas.length} preguntas)`,
      });
      setTabActivo('preguntas');
    } catch (_err) {
      setMensajeGuardado({ tipo: 'error', texto: 'El archivo no tiene un formato JSON válido.' });
    }
  }, []);

  // Cargar examen a editar si se pasa como prop
  useEffect(() => {
    if (examenAEditar && examenAEditar.id) {
      setTitulo(examenAEditar.titulo || '');
      setDescripcion(examenAEditar.descripcion || '');
      setMateria(examenAEditar.materia || '');
      setPreguntas(examenAEditar.preguntas || []);
      setConfiguracion({
        duracionMinutos: examenAEditar.configuracion?.duracionMinutos || 60,
        randomizar: examenAEditar.configuracion?.randomizar ?? true,
        mostrarPuntaje: examenAEditar.configuracion?.mostrarPuntaje ?? true,
        permitirNavegacion: examenAEditar.configuracion?.permitirNavegacion ?? true,
      });
      examenIdRef.current = examenAEditar.id;
      setExamenId(examenAEditar.id);
      setTabActivo('configuracion');
    }
  }, [examenAEditar?.id]);

  useEffect(() => {
    if (!mensajeGuardado) return;
    if (timerMensaje.current) clearTimeout(timerMensaje.current);
    timerMensaje.current = setTimeout(() => setMensajeGuardado(''), 6000);
    return () => {
      if (timerMensaje.current) clearTimeout(timerMensaje.current);
    };
  }, [mensajeGuardado]);

  const { limpiarBorrador } = useAutoSaveDraft({
    examenId: examenId || 'nuevo',
    nie: 'builder',
    respuestasIniciales: {},
  });

  useEffect(() => {
    if (grado) {
      cargarExamenesGuardados();
    }
  }, [grado]);

  // Restauración del borrador al montar o cambiar grado.
  // Se omite cuando se está editando un examen existente: restauraría el
  // borrador viejo pisando los datos del examen cargado (pérdida silenciosa).
  useEffect(() => {
    if (!grado) return;
    if (examenAEditar?.id) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BUILDER(grado));
      if (raw) {
        const borrador = JSON.parse(raw);
        if (borrador && ((Array.isArray(borrador.preguntas) && borrador.preguntas.length > 0) || borrador.titulo)) {
          setTitulo(borrador.titulo || '');
          setDescripcion(borrador.descripcion || '');
          setMateria(borrador.materia || '');
          setPreguntas(borrador.preguntas || []);
          setConfiguracion((prev) => ({ ...prev, ...(borrador.configuracion || {}) }));
          const idRestaurado = borrador.examenId || null;
          examenIdRef.current = idRestaurado;
          setExamenId(idRestaurado);
          setMensajeGuardado({ tipo: 'exito', texto: 'Se restauró tu examen sin guardar de la última sesión.' });
        }
      }
    } catch (err) {
      console.error('Error restaurando borrador del constructor:', err);
    }
  }, [grado, examenAEditar?.id]);

  // Autoguardado con debounce y cancelación controlada
  useEffect(() => {
    if (!grado) return;

    if (preguntas.length > 0 || titulo.trim() !== '') {
      setSinGuardar(true);
    } else {
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(
          STORAGE_KEY_BUILDER(grado),
          JSON.stringify({
            titulo,
            descripcion,
            materia,
            preguntas,
            configuracion,
            examenId: examenIdRef.current,
          })
        );
      } catch (err) {
        console.error('Error guardando borrador del constructor:', err);
      }
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [grado, titulo, descripcion, materia, preguntas, configuracion]);

  const cargarExamenesGuardados = async () => {
    if (!grado) return;
    setCargandoExamenes(true);
    try {
      const lista = await listarExamenes(grado);
      setExamenesGuardados(lista);
    } catch (err) {
      console.error('Error cargando exámenes:', err);
    } finally {
      setCargandoExamenes(false);
    }
  };

  const agregarPregunta = (tipo) => {
    const defaults = _defaultsTipo(tipo);
    const nuevaPregunta = {
      id: `preg-${Date.now()}-${preguntas.length}`,
      tipo,
      enunciado: '',
      puntaje: 1,
      orden: preguntas.length,
      ...defaults,
    };
    setPreguntas([...preguntas, nuevaPregunta]);
  };

  const actualizarPregunta = useCallback((idx, preguntaActualizada) => {
    setPreguntas((prev) => {
      const nuevas = [...prev];
      nuevas[idx] = { ...preguntaActualizada, orden: idx };
      return nuevas;
    });
  }, []);

  const eliminarPregunta = (idx) => {
    const nuevas = preguntas.filter((_, i) => i !== idx);
    setPreguntas(nuevas.map((p, i) => ({ ...p, orden: i })));
  };

  const handleGuardarBorrador = async () => {
    if (guardaOcupado.current) return;
    if (!titulo.trim()) {
      setMensajeGuardado({ tipo: 'error', texto: 'El título del examen es obligatorio. Ve a Configuración para ingresarlo.' });
      setTabActivo('configuracion');
      return;
    }
    if (preguntas.length === 0) {
      setMensajeGuardado({ tipo: 'error', texto: 'Debes agregar al menos una pregunta.' });
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    guardaOcupado.current = true;
    setGuardando(true);
    try {
      const idActual = examenIdRef.current;
      const datosExamen = {
        titulo,
        descripcion,
        materia,
        preguntas,
        configuracion: {
          ...configuracion,
          puntajeTotal: Math.round(preguntas.reduce((sum, p) => sum + (p.puntaje || 0), 0) * 100) / 100,
        },
      };

      if (idActual) {
        await guardarExamenBorrador(grado, { ...datosExamen, id: idActual }, claveAdmin, docente);
      } else {
        const result = await guardarExamenBorrador(grado, datosExamen, claveAdmin, docente);
        const nuevoId = result?.id || idActual;
        examenIdRef.current = nuevoId;
        setExamenId(nuevoId);
        try {
          localStorage.setItem(
            STORAGE_KEY_BUILDER(grado),
            JSON.stringify({ ...datosExamen, examenId: nuevoId })
          );
        } catch {}
      }

      setMensajeGuardado({ tipo: 'exito', texto: 'Borrador guardado correctamente.' });
      setSinGuardar(false);
      cargarExamenesGuardados();
    } catch (err) {
      setMensajeGuardado({ tipo: 'error', texto: err.message || 'Error al guardar.' });
    } finally {
      guardaOcupado.current = false;
      setGuardando(false);
    }
  };

  const handlePublicar = async () => {
    if (guardaOcupado.current) return;
    if (!titulo.trim() || preguntas.length === 0) {
      if (!titulo.trim()) {
        setMensajeGuardado({ tipo: 'error', texto: 'Título y preguntas son obligatorios. Ve a Configuración para ingresarlo.' });
        setTabActivo('configuracion');
      } else {
        setMensajeGuardado({ tipo: 'error', texto: 'Debes agregar al menos una pregunta.' });
      }
      return;
    }

    // Validación de integridad: no se publica un examen con preguntas que
    // todos reprobarían automáticamente (sin clave, vacías, etc.)
    const problemas = _validarPreguntasParaPublicar(preguntas);
    if (problemas.length > 0) {
      setMensajeGuardado({
        tipo: 'error',
        texto: `No se puede publicar: ${problemas.slice(0, 3).join(' · ')}${problemas.length > 3 ? ` (+${problemas.length - 3} más)` : ''}`,
      });
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    guardaOcupado.current = true;
    setGuardando(true);
    try {
      let id = examenIdRef.current;
      const datosExamen = {
        titulo,
        descripcion,
        materia,
        preguntas,
        configuracion: {
          ...configuracion,
          puntajeTotal: Math.round(preguntas.reduce((sum, p) => sum + (p.puntaje || 0), 0) * 100) / 100,
        },
      };

      // Siempre guardar el contenido del examen ANTES de publicar.
      if (!id) {
        const result = await guardarExamenBorrador(grado, datosExamen, claveAdmin, docente);
        id = result?.id;
        examenIdRef.current = id;
        setExamenId(id);
      } else {
        await guardarExamenBorrador(grado, { ...datosExamen, id }, claveAdmin, docente);
      }

      await publicarExamen(grado, id, claveAdmin);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      limpiarBorrador();
      localStorage.removeItem(STORAGE_KEY_BUILDER(grado));
      setSinGuardar(false);
      setMensajeGuardado({ tipo: 'exito', texto: 'Examen publicado y disponible para aplicar.' });
      onExamenGuardado?.();
      cargarExamenesGuardados();
    } catch (err) {
      setMensajeGuardado({ tipo: 'error', texto: err.message || 'Error al publicar.' });
    } finally {
      guardaOcupado.current = false;
      setGuardando(false);
    }
  };


  const handleNuevoExamen = () => {
    if (preguntas.length > 0 && !window.confirm('Empezar un examen nuevo descartará las preguntas actuales. ¿Continuar?')) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    localStorage.removeItem(STORAGE_KEY_BUILDER(grado));
    limpiarBorrador();
    examenIdRef.current = null;
    setExamenId(null);
    setTitulo('');
    setDescripcion('');
    setMateria('');
    setPreguntas([]);
    setConfiguracion({
      duracionMinutos: 60,
      randomizar: true,
      mostrarPuntaje: true,
      permitirNavegacion: true,
    });
    setTabActivo('preguntas');
    setMensajeGuardado({ tipo: 'exito', texto: 'Nuevo examen. Empieza a construir.' });
  };

  const handleIAGeneradas = (nuevasPreguntas) => {
    if (!titulo.trim() && nuevasPreguntas.length > 0) {
      setTitulo(`Examen generado automáticamente (${nuevasPreguntas.length} preguntas)`);
    }
    setPreguntas((prev) => [
      ...prev,
      ...nuevasPreguntas.map((p, i) => ({
        ...p,
        id: p.id || `gen-${Date.now()}-${i}`,
        orden: prev.length + i,
      })),
    ]);
  };

  const puntajeTotal = Math.round(preguntas.reduce((sum, p) => sum + (p.puntaje || 0), 0) * 100) / 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100">
            <span className="text-indigo-400">Constructor de Exámenes</span>
          </h2>
          <p className="text-[10px] font-black uppercase text-slate-500 italic tracking-widest">
            Sección: {grado} · {preguntas.length} pregunta(s) · {puntajeTotal} pts
          </p>
        </div>
        {onCancel && (
          <button
            onClick={handleNuevoExamen}
            className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-400 tracking-widest hover:text-emerald-300 transition"
          >
            <i className="fas fa-file-circle-plus" /> Nuevo examen
          </button>
        )}
        {onCancel && (
          <button
            onClick={() => {
              if (preguntas.length === 0) {
                setMensajeGuardado({ tipo: 'error', texto: 'Agrega al menos una pregunta antes de imprimir la hoja.' });
                return;
              }
              if (!titulo.trim()) {
                setMensajeGuardado({ tipo: 'error', texto: 'Ponle título al examen en Configuración antes de imprimir la hoja.' });
                setTabActivo('configuracion');
                return;
              }
              imprimirHojaExamen(
                { titulo, descripcion, materia, preguntas, configuracion },
                grado
              );
            }}
            title="Genera una hoja imprimible para aplicar el examen en papel"
            className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-indigo-300 transition"
          >
            <i className="fas fa-print" /> Imprimir hoja
          </button>
        )}
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-300 transition"
          >
            <i className="fas fa-arrow-left mr-2" /> Volver
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap bg-slate-900 p-2 rounded-2xl border border-slate-800">
        {TABS_BUILDER.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setTabActivo(tab.id);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all ${
              tabActivo === tab.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className={`fas ${tab.icono}`} />
            {tab.texto}
          </button>
        ))}
      </div>

      {sinGuardar && (titulo || preguntas.length > 0) && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl px-4 py-3">
          <i className="fas fa-circle-exclamation text-sm" />
          <p className="text-[10px] font-black uppercase tracking-widest italic">
            Examen sin guardar
          </p>
          <span className="hidden sm:inline text-[9px] font-bold italic text-amber-500/80">
            Se autoguarda como borrador en este dispositivo. No se pierde al cambiar de sección o cerrar.
          </span>
        </div>
      )}

      {!titulo.trim() && preguntas.length > 0 && (
        <button
          onClick={() => setTabActivo('configuracion')}
          className="w-full flex items-center gap-3 bg-rose-500/10 border border-rose-500/40 text-rose-300 rounded-2xl px-4 py-3.5 text-left hover:bg-rose-500/20 transition group"
        >
          <i className="fas fa-heading text-sm flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest italic">
              Falta el título del examen
            </p>
            <span className="text-[9px] font-bold italic text-rose-400/80">
              No podrás guardar ni publicar hasta ingresarlo. Click aquí para ir a Configuración.
            </span>
          </div>
          <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {mensajeGuardado && (
        <div
          className={`p-4 rounded-2xl text-[10px] font-bold italic flex items-center gap-3 ${
            mensajeGuardado.tipo === 'exito'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
          }`}
        >
          <i className={`fas ${mensajeGuardado.tipo === 'exito' ? 'fa-check-circle' : 'fa-exclamation-circle'}`} />
          {mensajeGuardado.texto}
        </div>
      )}

      <AnimatePresence>
        {mensajeGuardado && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] px-5 py-3 rounded-2xl text-[10px] font-bold italic flex items-center gap-3 shadow-2xl border ${
              mensajeGuardado.tipo === 'exito'
                ? 'bg-emerald-900/95 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-900/95 border-rose-500/40 text-rose-200'
            }`}
          >
            <i className={`fas ${mensajeGuardado.tipo === 'exito' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-sm`} />
            {mensajeGuardado.texto}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {tabActivo === 'preguntas' && (
          <motion.div
            key="preguntas"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
              <h3 className="text-[10px] font-black uppercase text-slate-400 italic tracking-widest mb-4">
                Agregar pregunta
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {Object.values(TIPOS_PREGUNTA).map((tipo) => (
                  <button
                    key={tipo}
                    onClick={() => agregarPregunta(tipo)}
                    type="button"
                    className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-2xl border border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-center group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <i className={`fas ${ICONOS_TIPOS_PREGUNTA[tipo]} text-lg`} />
                    </div>
                    <span className="text-[8px] font-black uppercase text-slate-300 italic leading-tight">
                      {ETIQUETAS_TIPOS_PREGUNTA[tipo]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {preguntas.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 bg-slate-900 rounded-[2rem] border border-slate-800"
              >
                <i className="fas fa-clipboard-list text-4xl text-slate-600 mb-4" />
                <p className="text-slate-400 text-sm font-bold italic">
                  Aún no has agregado preguntas. Selecciona un tipo arriba para comenzar.
                </p>
              </motion.div>
            )}

            <AnimatePresence>
              {preguntas.map((preg, idx) => (
                <QuestionCard
                  key={preg.id}
                  pregunta={preg}
                  onChange={(p) => actualizarPregunta(idx, p)}
                  onRemove={() => eliminarPregunta(idx)}
                  indice={idx}
                  onConvertir={null}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {tabActivo === 'importar' && (
          <motion.div
            key="importar"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="wayground-card bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-6 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center text-2xl">
              <i className="fas fa-file-import" />
            </div>

            <div>
              <h3 className="text-xl font-black uppercase italic text-slate-100 mb-1">
                Subir e Importar Examen
              </h3>
              <p className="text-xs text-slate-400 font-bold italic max-w-md mx-auto">
                Carga de forma instantánea un examen completo en formato JSON con todas sus preguntas, opciones y claves de respuesta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
              <label className="cursor-pointer bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-600/30 transition flex flex-col items-center gap-2">
                <i className="fas fa-upload text-lg" />
                <span>Seleccionar Archivo JSON</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0];
                    if (!archivo) return;
                    if ((titulo || preguntas.length > 0) && !window.confirm('Importar un examen reemplazará el contenido actual. ¿Continuar?')) return;
                    const reader = new FileReader();
                    reader.onload = (evento) => {
                      try {
                        // Detectar encoding: si UTF-8 produce caracteres rotos, usar Latin-1
                        let texto = evento.target.result;
                        if (texto.includes('\uFFFD')) {
                          // Re-leer como ArrayBuffer para intentar Latin-1
                          const reader2 = new FileReader();
                          reader2.onload = (ev2) => {
                            try {
                              const bytes = new Uint8Array(ev2.target.result);
                              const latin1 = new TextDecoder('iso-8859-1').decode(bytes);
                              _procesarImportJSON(latin1);
                            } catch (_e2) {
                              setMensajeGuardado({ tipo: 'error', texto: 'No se pudo leer el archivo. Verifica la codificación.' });
                            }
                          };
                          reader2.readAsArrayBuffer(archivo);
                          return;
                        }
                        _procesarImportJSON(texto);
                      } catch (_err) {
                        setMensajeGuardado({ tipo: 'error', texto: 'El archivo JSON no tiene un formato válido.' });
                      }
                    };
                    reader.readAsText(archivo, 'UTF-8');
                  }}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const plantilla = {
                    titulo: 'Examen de Artes Plásticas - INSAL 2026',
                    descripcion: 'Evaluación oficial de técnicas de dibujo e ilustración.',
                    duracionMinutos: 45,
                    preguntas: [
                      {
                        id: 'preg-1',
                        tipo: 'opcion_multiple',
                        enunciado: '¿Qué técnica de medición se utiliza para calcular proporciones en el dibujo al natural tomando el lápiz con el brazo extendido?',
                        puntaje: 2.5,
                        opciones: [
                          'Encajado y visor de encuadre',
                          'Técnica del lápiz a plomada y medición a brazo extendido',
                          'Perspectiva de punto de fuga',
                          'Técnica del claroscuro',
                        ],
                        respuestaCorrecta: 1,
                      },
                      {
                        id: 'preg-2',
                        tipo: 'verdadero_falso',
                        enunciado: '¿Cuál es el propósito del sistema de asistencias y evaluaciones de la institución?',
                        puntaje: 2.5,
                        respuestaCorrecta: true,
                      },
                    ],
                  };
                  const jsonStr = '\uFEFF' + JSON.stringify(plantilla, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Plantilla_Examen_INSAL_UTF8.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 p-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition flex flex-col items-center gap-2"
              >
                <i className="fas fa-file-arrow-down text-lg text-emerald-400" />
                <span>Descargar Plantilla UTF-8 Ejercicio</span>
              </button>
            </div>
          </motion.div>
        )}

        {tabActivo === 'configuracion' && (
          <motion.div
            key="configuracion"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ConfiguracionExamen
              titulo={titulo}
              setTitulo={setTitulo}
              descripcion={descripcion}
              setDescripcion={setDescripcion}
              materia={materia}
              setMateria={setMateria}
              materias={materias}
              configuracion={configuracion}
              setConfiguracion={setConfiguracion}
              puntajeTotal={puntajeTotal}
            />
          </motion.div>
        )}

        {tabActivo === 'ia' && (
          <motion.div
            key="ia"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <IAQuestionGenerator onGenerar={handleIAGeneradas} />
          </motion.div>
        )}

        {tabActivo === 'vista-previa' && (
          <motion.div
            key="vista-previa"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <ExamPreviewLive
              titulo={titulo}
              descripcion={descripcion}
              preguntas={preguntas}
              configuracion={configuracion}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleGuardarBorrador}
            disabled={guardando}
            className="flex items-center gap-2 bg-slate-800 text-slate-200 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-slate-700 disabled:opacity-50 transition"
          >
            {guardando ? (
              <>
                <i className="fas fa-spinner fa-pulse" /> Guardando...
              </>
            ) : (
              <>
                <i className="fas fa-save" /> Guardar borrador
              </>
            )}
          </button>
          <button
            onClick={handlePublicar}
            disabled={guardando}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {guardando ? (
              <>
                <i className="fas fa-spinner fa-pulse" /> Publicando...
              </>
            ) : (
              <>
                <i className="fas fa-rocket" /> Publicar examen
              </>
            )}
          </button>
        </div>

        {onExamenGuardado && (
          <button
            onClick={onExamenGuardado}
            className="text-[9px] font-black uppercase text-indigo-400 tracking-widest hover:text-indigo-300 transition"
          >
            Ver exámenes publicados →
          </button>
        )}
      </div>
    </div>
  );
}

function ConfiguracionExamen({ titulo, setTitulo, descripcion, setDescripcion, materia, setMateria, materias, configuracion, setConfiguracion, puntajeTotal }) {
  return (
    <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm space-y-6">
      <h3 className="text-xs font-black uppercase text-indigo-400 italic tracking-widest">
        Configuración del Examen
      </h3>

      <div>
        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
          Materia
        </label>
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">— Selecciona la materia —</option>
          {materias.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
        </select>
      </div>

      <div>
        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
          Título del examen
        </label>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej. Examen de Matemáticas - Primer Parcial"
          className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
          Descripción (opcional)
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Breve descripción del examen y temas cubiertos..."
          rows={3}
          className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
            Duración (minutos)
          </label>
          <input
            type="number"
            min={1}
            max={240}
            value={configuracion.duracionMinutos}
            onChange={(e) => setConfiguracion({ ...configuracion, duracionMinutos: parseInt(e.target.value) || 60 })}
            className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div />
        <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-300 italic cursor-pointer">
          <input
            type="checkbox"
            checked={configuracion.randomizar}
            onChange={(e) => setConfiguracion({ ...configuracion, randomizar: e.target.checked })}
            className="w-4 h-4"
          />
          Randomizar orden de preguntas
        </label>
        <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-300 italic cursor-pointer">
          <input
            type="checkbox"
            checked={configuracion.mostrarPuntaje}
            onChange={(e) => setConfiguracion({ ...configuracion, mostrarPuntaje: e.target.checked })}
            className="w-4 h-4"
          />
          Mostrar puntaje al finalizar
        </label>
        <label className="flex items-center gap-3 text-[10px] font-black uppercase text-slate-300 italic cursor-pointer">
          <input
            type="checkbox"
            checked={configuracion.permitirNavegacion}
            onChange={(e) => setConfiguracion({ ...configuracion, permitirNavegacion: e.target.checked })}
            className="w-4 h-4"
          />
          Permitir navegación entre preguntas
        </label>
      </div>

      <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-400 italic">
          Puntaje total: <span className="text-indigo-400">{puntajeTotal}</span> pts
        </span>
      </div>
    </div>
  );
}

function _defaultsTipo(tipo) {
  const defaults = {
    [TIPOS_PREGUNTA.OPCION_MULTIPLE]: {
      opciones: [
        { id: 'a', texto: '' },
        { id: 'b', texto: '' },
        { id: 'c', texto: '' },
        { id: 'd', texto: '' },
      ],
      opcionesCorrectas: [],
    },
    [TIPOS_PREGUNTA.VERDADERO_FALSO]: { respuestaCorrecta: null },
    [TIPOS_PREGUNTA.ABIERTO]: {},
    [TIPOS_PREGUNTA.ORDENAR]: { items: ['', '', '', ''], ordenCorrecto: [0, 1, 2, 3] },
    [TIPOS_PREGUNTA.EMPAREJAR]: {
      pares: [
        { id: 1, izquierda: '', derecha: '' },
        { id: 2, izquierda: '', derecha: '' },
      ],
    },
    [TIPOS_PREGUNTA.FORMULA]: { formula: '', respuestaCorrecta: '' },
  };
  return defaults[tipo] || {};
}

const LETRAS_OPCION = 'abcdefghijklmnopqrstuvwxyz';

/**
 * Valida que cada pregunta sea publicable: enunciado presente y clave de
 * respuesta definida según su tipo. Devuelve mensajes "P{n}: motivo".
 */
function _validarPreguntasParaPublicar(preguntas) {
  const problemas = [];
  preguntas.forEach((p, i) => {
    const n = i + 1;
    if (!String(p.enunciado || '').trim()) {
      problemas.push(`P${n} sin enunciado`);
      return;
    }
    switch (p.tipo) {
      case TIPOS_PREGUNTA.OPCION_MULTIPLE: {
        const opciones = Array.isArray(p.opciones) ? p.opciones : [];
        const conTexto = opciones.filter((o) => String(o?.texto ?? o ?? '').trim());
        if (conTexto.length < 2) { problemas.push(`P${n} necesita al menos 2 opciones con texto`); break; }
        const correctas = (p.opcionesCorrectas || []).filter((c) =>
          conTexto.some((o) => (o.id ?? o) === c)
        );
        if (correctas.length === 0) { problemas.push(`P${n} sin respuesta correcta marcada`); break; }
        if (!p.multiple && correctas.length > 1) {
          problemas.push(`P${n} tiene ${correctas.length} respuestas correctas pero es de selección única`);
        }
        break;
      }
      case TIPOS_PREGUNTA.VERDADERO_FALSO:
        if (p.respuestaCorrecta !== true && p.respuestaCorrecta !== false) {
          problemas.push(`P${n} sin clave Verdadero/Falso marcada`);
        }
        break;
      case TIPOS_PREGUNTA.ORDENAR: {
        const items = (Array.isArray(p.items) ? p.items : []).filter((it) => String(it || '').trim());
        if (items.length < 2) problemas.push(`P${n} necesita al menos 2 ítems con texto`);
        break;
      }
      case TIPOS_PREGUNTA.EMPAREJAR: {
        const pares = Array.isArray(p.pares) ? p.pares : [];
        const completos = pares.filter((par) => String(par?.izquierda || '').trim() && String(par?.derecha || '').trim());
        if (completos.length < 2) problemas.push(`P${n} necesita al menos 2 pares completos (izquierda y derecha)`);
        break;
      }
      case TIPOS_PREGUNTA.FORMULA:
        if (!String(p.respuestaCorrecta || '').trim()) problemas.push(`P${n} sin respuesta correcta para la fórmula`);
        break;
      default:
        break; // ABIERTO no requiere clave (califica IA)
    }
  });
  return problemas;
}

/**
 * Normaliza preguntas importadas (JSON / plantilla) al modelo interno:
 * - opciones como strings → {id, texto}
 * - respuestaCorrecta numérico (índice) → opcionesCorrectas [letra]
 * - garantiza ids únicos y campo orden
 */
function _normalizarPreguntasImportadas(preguntas) {
  const usados = new Set();
  return preguntas.map((p, i) => {
    let id = p.id && !usados.has(String(p.id)) ? String(p.id) : `imp-${Date.now()}-${i}`;
    while (usados.has(id)) id = `imp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    usados.add(id);

    const normalizada = { ...p, id, orden: i };

    if (normalizada.tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE) {
      // Formato plantilla: opciones string + respuestaCorrecta índice
      if (Array.isArray(normalizada.opciones) && normalizada.opciones.some((o) => typeof o === 'string')) {
        normalizada.opciones = normalizada.opciones.map((texto, j) =>
          typeof texto === 'string' ? { id: LETRAS_OPCION[j] || `op${j}`, texto } : texto
        );
        if (typeof normalizada.respuestaCorrecta === 'number' && !normalizada.opcionesCorrectas?.length) {
          const letra = LETRAS_OPCION[normalizada.respuestaCorrecta];
          if (letra) normalizada.opcionesCorrectas = [letra];
        }
      }
      if (!Array.isArray(normalizada.opcionesCorrectas)) {
        normalizada.opcionesCorrectas = [];
      }
    }

    if (normalizada.tipo === TIPOS_PREGUNTA.ORDENAR) {
      if (!Array.isArray(normalizada.items) || normalizada.items.length < 2) {
        normalizada.items = ['', '', '', ''];
      }
      if (!Array.isArray(normalizada.ordenCorrecto) || normalizada.ordenCorrecto.length !== normalizada.items.length) {
        normalizada.ordenCorrecto = normalizada.items.map((_, j) => j);
      }
    }

    if (normalizada.tipo === TIPOS_PREGUNTA.EMPAREJAR) {
      // Si viene en formato plantilla (pares_izquierda + pares_derecha), convertir a pares
      if (!Array.isArray(normalizada.pares) || normalizada.pares.length === 0) {
        const izq = Array.isArray(normalizada.pares_izquierda) ? normalizada.pares_izquierda : [];
        const der = Array.isArray(normalizada.pares_derecha) ? normalizada.pares_derecha : [];
        if (izq.length > 0 || der.length > 0) {
          const n = Math.max(izq.length, der.length);
          normalizada.pares = Array.from({ length: n }, (_, j) => ({
            id: j + 1,
            izquierda: izq[j] || '',
            derecha: der[j] || '',
          }));
        }
      }
      if (!Array.isArray(normalizada.pares)) normalizada.pares = [];
      normalizada.pares = normalizada.pares.map((par, j) => ({
        ...par,
        id: par.id ?? j + 1,
        izquierda: par.izquierda ?? '',
        derecha: par.derecha ?? '',
      }));
    }

    return normalizada;
  });
}
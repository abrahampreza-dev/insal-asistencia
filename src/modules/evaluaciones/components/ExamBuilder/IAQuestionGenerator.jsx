import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { NIVELES_ACADEMICOS, TIPOS_PREGUNTA, ETIQUETAS_TIPOS_PREGUNTA } from '../../constants';
import { generarPreguntasIA, importarExamenIA } from '../../services/geminiService';
import { descargarPlantilla, esPlantilla, parsearPlantillaCSV } from '../../services/plantillaService';

const MAX_PREGUNTAS = 50;
const TIPO_VARIADAS = 'variadas';
const FORMATOS_SOPORTADOS = ['.pdf', '.docx', '.png', '.jpg', '.jpeg', '.webp', '.txt', '.csv'];
const PASOS_ORDEN = ['recibiendo', 'analizando', 'procesando', 'respuestas', 'listo'];

const PASOS_PROCESO = {
  recibiendo: { titulo: 'Recibiendo el archivo...', descripcion: 'Leyendo el documento' },
  analizando: { titulo: 'Analizando el documento...', descripcion: 'El sistema está procesando el examen' },
  procesando: { titulo: 'Detectando preguntas...', descripcion: 'Identificando cada pregunta y su tipo' },
  respuestas: { titulo: 'Detectando respuestas correctas...', descripcion: 'Buscando las marcas de respuestas en el documento' },
  listo: { titulo: 'Examen procesado', descripcion: 'Listo para revisar' },
};

function _leerArchivoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = reader.result;
      const base64 = resultado.split(',')[1] || '';
      resolve({ base64, mimeType: file.type || _mimePorExtension(file.name), nombre: file.name });
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

function _mimePorExtension(nombre) {
  const ext = nombre.split('.').pop()?.toLowerCase();
  const mimes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    txt: 'text/plain',
    csv: 'text/csv',
  };
  return mimes[ext] || 'application/octet-stream';
}

function _base64ATexto(base64) {
  try {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }

    // Detectar BOM UTF-8 (\xEF\xBB\xBF) → archivo ya es UTF-8
    if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return new TextDecoder('utf-8').decode(bytes);
    }

    // Intentar UTF-8 primero; si produce caracteres de reemplazo (�),
    // el archivo probablemente está en Latin-1/ISO-8859-1 (común de Excel).
    const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (utf8.includes('\uFFFD')) {
      return new TextDecoder('iso-8859-1').decode(bytes);
    }
    return utf8;
  } catch {
    return '';
  }
}

// Componente para parsing automático de LaTeX en cadenas de texto
function RenderTextoConMath({ texto }) {
  if (!texto) return null;
  
  // Expresión regular para capturar $$bloque$$ o $inline$
  const partes = texto.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return (
    <span>
      {partes.map((parte, index) => {
        if (parte.startsWith('$$') && parte.endsWith('$$')) {
          const math = parte.slice(2, -2);
          return <BlockMath throwOnError={false} key={index} math={math} />;
        }
        if (parte.startsWith('$') && parte.endsWith('$')) {
          const math = parte.slice(1, -1);
          return <InlineMath throwOnError={false} key={index} math={math} />;
        }
        return <span key={index}>{parte}</span>;
      })}
    </span>
  );
}

export default function IAQuestionGenerator({ onGenerar }) {
  const [modo, setModo] = useState('tema');
  const [tema, setTema] = useState('');
  const [nivel, setNivel] = useState('');
  const [cantidad, setCantidad] = useState(10);
  const [tipoFoco, setTipoFoco] = useState(TIPO_VARIADAS);
  const [cantidadImport, setCantidadImport] = useState(10);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [vistaPrevia, setVistaPrevia] = useState([]);
  const [archivoRecibido, setArchivoRecibido] = useState(null);
  const [pasoProcesamiento, setPasoProcesamiento] = useState('');
  const [informacionImport, setInformacionImport] = useState('');
  const inputArchivo = useRef(null);

  const handleGenerar = async () => {
    if (!tema.trim()) {
      setError('Debes especificar un tema o contenido.');
      return;
    }
    if (!nivel) {
      setError('Selecciona el nivel académico.');
      return;
    }
    if (cantidad < 1 || cantidad > MAX_PREGUNTAS) {
      setError(`La cantidad debe estar entre 1 y ${MAX_PREGUNTAS}.`);
      return;
    }
    if (!tipoFoco) {
      setError('Selecciona el tipo de preguntas a generar.');
      return;
    }

    setCargando(true);
    setError('');
    setVistaPrevia([]);

    try {
      const resultado = await generarPreguntasIA({
        tema,
        nivel,
        cantidad,
        tipoFoco: tipoFoco === TIPO_VARIADAS ? null : tipoFoco,
      });
      setVistaPrevia(resultado);
    } catch (err) {
      setError(err.message || 'Error al generar preguntas.');
    } finally {
      setCargando(false);
    }
  };

  const handleArchivoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await _recibirArchivo(file);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) await _recibirArchivo(file);
  };

  const _recibirArchivo = async (file) => {
    setError('');
    setVistaPrevia([]);
    setInformacionImport('');
    setArchivoRecibido(null);

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    if (!FORMATOS_SOPORTADOS.includes(ext)) {
      setError(`Formato no soportado (${ext}). Usa: ${FORMATOS_SOPORTADOS.join(', ')}`);
      return;
    }

    setCargando(true);
    setPasoProcesamiento('recibiendo');
    try {
      const archivo = await _leerArchivoBase64(file);
      setArchivoRecibido({
        ...archivo,
        nombre: file.name,
        tamanio: file.size,
      });
    } catch (err) {
      setError(err.message || 'No se pudo leer el archivo.');
    } finally {
      setCargando(false);
      setPasoProcesamiento('');
      if (inputArchivo.current) inputArchivo.current.value = '';
    }
  };

  const handleConvertir = async () => {
    if (!archivoRecibido) return;
    if (!nivel) {
      setError('Selecciona el nivel académico del examen.');
      return;
    }
    if (cantidadImport < 1 || cantidadImport > MAX_PREGUNTAS) {
      setError(`La cantidad de preguntas debe estar entre 1 y ${MAX_PREGUNTAS}.`);
      return;
    }
    if (!tipoFoco) {
      setError('Selecciona el tipo de preguntas (Preguntas variadas u otro tipo).');
      return;
    }
    setCargando(true);
    setError('');
    setVistaPrevia([]);
    setInformacionImport('');
    try {
      const esTextoPlantilla =
        archivoRecibido.mimeType === 'text/csv' ||
        archivoRecibido.mimeType === 'text/plain' ||
        /\.(csv|txt)$/i.test(archivoRecibido.nombre);

      if (esTextoPlantilla) {
        const contenido = _base64ATexto(archivoRecibido.base64);
        if (esPlantilla(contenido)) {
          const preguntas = parsearPlantillaCSV(contenido);
          if (!preguntas.length) {
            setError('La plantilla no tiene preguntas válidas. Revisa que cada fila tenga tipo y enunciado.');
            return;
          }
          setVistaPrevia(preguntas);
          setInformacionImport(
            `Se importaron ${preguntas.length} preguntas desde la plantilla "${archivoRecibido.nombre}".`
          );
          return;
        }
      }

      const resultado = await importarExamenIA({
        archivo: archivoRecibido,
        nivel,
        tipoFoco: tipoFoco === TIPO_VARIADAS ? null : tipoFoco,
        cantidad: cantidadImport,
        onProgreso: setPasoProcesamiento,
      });
      if (!resultado.length) {
        setError('No se encontraron preguntas en el archivo.');
        return;
      }
      setVistaPrevia(resultado);
      setInformacionImport(`Se importaron ${resultado.length} preguntas desde "${archivoRecibido.nombre}". Revisa las respuestas detectadas antes de agregarlas.`);
    } catch (err) {
      setError(err.message || 'Error al importar el examen.');
    } finally {
      setCargando(false);
      setPasoProcesamiento('');
    }
  };

  const handleAceptar = () => {
    if (vistaPrevia.length === 0) return;
    onGenerar(vistaPrevia);
    setVistaPrevia([]);
    setTema('');
    setArchivoRecibido(null);
    setInformacionImport('');
  };

  const handleDescartar = () => {
    setVistaPrevia([]);
    setTema('');
    setArchivoRecibido(null);
    setInformacionImport('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <i className="fas fa-file-circle-plus text-2xl text-indigo-400" />
          <h3 className="text-sm font-black uppercase text-indigo-400 italic tracking-widest">
            Generador de preguntas
          </h3>
        </div>

        <p className="text-[10px] font-bold text-slate-400 italic mb-4">
          Genera hasta {MAX_PREGUNTAS} preguntas estructuradas a partir de un tema o importa un examen ya resuelto
          (PDF, Word, imagen o texto). El sistema detecta el tipo de cada pregunta y la convierte al formato del sistema.
        </p>

        <div className="flex gap-2 mb-6 bg-slate-800/50 p-1.5 rounded-2xl border border-slate-700">
          {[
            { id: 'tema', texto: 'Generar por tema', icono: 'fa-circle-plus' },
            { id: 'importar', texto: 'Importar examen resuelto', icono: 'fa-file-import' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setModo(m.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest italic transition-all ${
                modo === m.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <i className={`fas ${m.icono}`} />
              {m.texto}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {modo === 'tema' ? (
            <>
              <div>
                <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                  Tema o contenido
                </label>
                <input
                  value={tema}
                  onChange={(e) => setTema(e.target.value)}
                  placeholder="Ej. La Revolución Francesa, Ecuaciones cuadráticas, Fotosíntesis..."
                  className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 font-bold italic text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                    Nivel académico *
                  </label>
                  <select
                    value={nivel}
                    onChange={(e) => setNivel(e.target.value)}
                    className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Selecciona el nivel...</option>
                    {NIVELES_ACADEMICOS.map((n) => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                    Cantidad (1 a {MAX_PREGUNTAS}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_PREGUNTAS}
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 5)}
                    className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-center text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                    Tipo de preguntas *
                  </label>
                  <select
                    value={tipoFoco}
                    onChange={(e) => setTipoFoco(e.target.value)}
                    className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={TIPO_VARIADAS}>Preguntas variadas (recomendado)</option>
                    {Object.values(TIPOS_PREGUNTA).map((t) => (
                      <option key={t} value={t}>Solo {ETIQUETAS_TIPOS_PREGUNTA[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerar}
                disabled={cargando}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {cargando ? (
                  <>
                    <i className="fas fa-spinner fa-pulse" /> Generando {cantidad} preguntas...
                  </>
                ) : (
                  <>
                    <i className="fas fa-circle-plus" /> Generar preguntas
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                    <i className="fas fa-file-csv text-xl text-indigo-400 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-black uppercase text-indigo-300 italic tracking-widest mb-0.5">
                        Usa la plantilla del sistema
                      </p>
                      <p className="text-[9px] font-bold italic text-slate-400">
                        Descarga el archivo, llena las preguntas con los tipos que quieras (opción múltiple, V/F,
                        abierto, ordenar, emparejar, fórmula) y súbelo. El sistema lo procesa al instante.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => descargarPlantilla()}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition"
                  >
                    <i className="fas fa-download" /> Descargar plantilla (.csv)
                  </button>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputArchivo.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  archivoRecibido
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-600 hover:border-indigo-500/60 hover:bg-indigo-500/5'
                }`}
              >
                <input
                  ref={inputArchivo}
                  type="file"
                  accept={FORMATOS_SOPORTADOS.join(',')}
                  onChange={handleArchivoChange}
                  className="hidden"
                />
                {cargando && pasoProcesamiento === 'recibiendo' ? (
                  <>
                    <i className="fas fa-spinner fa-pulse text-4xl text-indigo-400 mb-3" />
                    <p className="font-black italic text-sm text-slate-100 mb-1">Recibiendo examen...</p>
                  </>
                ) : archivoRecibido ? (
                  <>
                    <i className="fas fa-file-circle-check text-4xl text-emerald-400 mb-3" />
                    <p className="font-black italic text-sm text-emerald-300 mb-1">
                      <i className="fas fa-circle-check mr-1" /> Examen recibido
                    </p>
                    <p className="font-bold italic text-sm text-slate-100 mb-1">{archivoRecibido.nombre}</p>
                    <p className="text-[9px] font-bold italic text-slate-400">
                      Haz clic para cambiar de archivo.
                    </p>
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-upload text-4xl text-indigo-400 mb-3" />
                    <p className="font-black italic text-sm text-slate-100 mb-1">
                      Arrastra un examen resuelto o haz clic para seleccionar
                    </p>
                    <p className="text-[9px] font-bold italic text-slate-400">
                      PDF · Word (.docx) · Imágenes (PNG/JPG/WebP) · Texto · Plantilla (.csv)
                    </p>
                  </>
                )}
              </div>

              {archivoRecibido && !vistaPrevia.length && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/40 border border-emerald-500/20 rounded-2xl p-5"
                >
                  <p className="text-[10px] font-black uppercase text-emerald-400 italic tracking-widest mb-4 flex items-center gap-2">
                    <i className="fas fa-circle-check" /> Examen recibido
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                        Nivel académico *
                      </label>
                      <select
                        value={nivel}
                        onChange={(e) => setNivel(e.target.value)}
                        className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Selecciona el nivel...</option>
                        {NIVELES_ACADEMICOS.map((n) => (
                          <option key={n.id} value={n.id}>{n.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                        Cantidad de preguntas (1 a {MAX_PREGUNTAS}) *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={MAX_PREGUNTAS}
                        value={cantidadImport}
                        onChange={(e) => setCantidadImport(parseInt(e.target.value) || 5)}
                        className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-center text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase font-black text-slate-400 tracking-widest italic mb-1 ml-1">
                        Tipo de preguntas *
                      </label>
                      <select
                        value={tipoFoco}
                        onChange={(e) => setTipoFoco(e.target.value)}
                        className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 font-black italic text-xs text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={TIPO_VARIADAS}>Preguntas variadas (recomendado)</option>
                        {Object.values(TIPOS_PREGUNTA).map((t) => (
                          <option key={t} value={t}>Solo {ETIQUETAS_TIPOS_PREGUNTA[t]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-[9px] font-bold italic text-slate-500 mt-3 ml-1">
                    <i className="fas fa-circle-info mr-1" /> Los campos marcados con * son obligatorios para procesar el examen correctamente.
                  </p>

                  <button
                    onClick={handleConvertir}
                    disabled={cargando}
                    className="w-full mt-4 flex items-center justify-center gap-3 bg-emerald-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    {cargando ? (
                      <>
                        <i className="fas fa-spinner fa-pulse" /> Procesando examen...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-file-circle-check" /> Convertir examen al formato del sistema
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {cargando && vistaPrevia.length === 0 && (
                <div className="bg-slate-800/40 border border-indigo-500/20 rounded-2xl p-4 flex items-center gap-4">
                  <i className="fas fa-spinner fa-pulse text-indigo-400 text-lg" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black uppercase text-indigo-300 italic tracking-widest mb-1">
                      {PASOS_PROCESO[pasoProcesamiento]?.titulo || 'Procesando...'}
                    </p>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-500"
                        initial={{ width: '10%' }}
                        animate={{ width: pasoProcesamiento === 'listo' ? '100%' : `${(PASOS_ORDEN.indexOf(pasoProcesamiento) + 1) / PASOS_ORDEN.length * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                <i className="fas fa-lightbulb text-amber-400" />
                <p className="text-[9px] font-bold italic text-slate-400">
                  <span className="text-amber-300 font-black uppercase">Plantilla .csv:</span> se procesa al instante.
                  Los demás archivos se convierten automáticamente: el sistema detecta cada pregunta, su tipo y las respuestas marcadas.
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-3 flex items-center gap-2 mt-4">
            <i className="fas fa-exclamation-circle" />
            <span className="text-[10px] font-bold italic">{error}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {vistaPrevia.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm"
          >
            <h4 className="text-xs font-black uppercase text-amber-400 italic tracking-widest mb-1">
              Vista previa de preguntas generadas ({vistaPrevia.length})
            </h4>
            {informacionImport && (
              <p className="text-[9px] font-bold italic text-emerald-400 mb-4">{informacionImport}</p>
            )}

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {vistaPrevia.map((p, idx) => (
                <div key={idx} className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black uppercase text-slate-500 italic bg-slate-800 px-2 py-1 rounded">
                      #{idx + 1}
                    </span>
                    <span className="text-[9px] font-black uppercase text-indigo-400 italic">
                      {ETIQUETAS_TIPOS_PREGUNTA[p.tipo] || p.tipo}
                    </span>
                    {p.puntaje > 1 && (
                      <span className="text-[9px] font-black uppercase text-amber-400 italic">
                        {p.puntaje} pts
                      </span>
                    )}
                  </div>
                  <div className="font-bold italic text-sm text-slate-200 mb-2">
                    <RenderTextoConMath texto={p.enunciado} />
                  </div>

                  {p.tipo === TIPOS_PREGUNTA.OPCION_MULTIPLE && p.opciones?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {p.opciones.map((o) => (
                        <div
                          key={o.id}
                          className={`text-xs p-2 rounded-lg font-bold italic ${
                            p.opcionesCorrectas?.includes(o.id)
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {String(o.id).toUpperCase()}: <RenderTextoConMath texto={o.texto} />
                          {p.opcionesCorrectas?.includes(o.id) && ' ✓'}
                        </div>
                      ))}
                    </div>
                  )}

                  {p.tipo === TIPOS_PREGUNTA.VERDADERO_FALSO && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs p-2 rounded-lg font-black italic ${p.respuestaCorrecta === true ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                        Verdadero {p.respuestaCorrecta === true && '✓'}
                      </span>
                      <span className={`text-xs p-2 rounded-lg font-black italic ${p.respuestaCorrecta === false ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}>
                        Falso {p.respuestaCorrecta === false && '✓'}
                      </span>
                    </div>
                  )}

                  {p.tipo === TIPOS_PREGUNTA.ABIERTO && p.rubrica && (
                    <div className="bg-slate-800 rounded-lg p-2 text-[9px] font-bold italic text-slate-400">
                      Rúbrica: <RenderTextoConMath texto={p.rubrica} />
                    </div>
                  )}

                  {p.tipo === TIPOS_PREGUNTA.ORDENAR && p.items?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {p.items.map((item, i) => (
                        <span key={i} className="text-[9px] p-2 rounded-lg bg-slate-800 text-slate-300 font-bold italic">
                          {i + 1}. <RenderTextoConMath texto={item} />
                        </span>
                      ))}
                    </div>
                  )}

                  {p.tipo === TIPOS_PREGUNTA.EMPAREJAR && p.pares?.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {p.pares.map((par) => (
                        <div key={par.id} className="text-[9px] p-2 rounded-lg bg-slate-800 text-slate-300 font-bold italic">
                          <RenderTextoConMath texto={par.izquierda} /> → <RenderTextoConMath texto={par.derecha} />
                        </div>
                      ))}
                    </div>
                  )}

                  {p.tipo === TIPOS_PREGUNTA.FORMULA && (
                    <div className="bg-slate-800 rounded-lg p-3 text-xs text-indigo-300 font-mono flex flex-col gap-1">
                      {p.formula && <BlockMath throwOnError={false} math={p.formula} />}
                      {p.respuestaCorrecta && (
                        <div className="text-[10px] text-emerald-400 font-sans">
                          Respuesta: <RenderTextoConMath texto={String(p.respuestaCorrecta)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAceptar}
                className="flex-1 bg-emerald-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition"
              >
                <i className="fas fa-check mr-2" /> Agregar al examen
              </button>
              <button
                onClick={handleDescartar}
                className="flex-1 bg-slate-800 text-slate-300 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition"
              >
                <i className="fas fa-xmark mr-2" /> Descartar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
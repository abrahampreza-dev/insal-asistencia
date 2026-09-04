import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { escucharRuta } from '../../firebase';
import { useToast } from '../../context/ToastContext';
import { invitarEvaluador, revocarEvaluador } from './rubricaService';

const MAX_EVALUADORES = 2;

export default function ModalInvitarEvaluadores({ abierto, onCerrar, grado, rubrica, docenteUser }) {
  const { toastSuccess, toastError } = useToast();
  const [evaluadores, setEvaluadores] = useState([]);
  const [docentes, setDocentes] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [nombreInput, setNombreInput] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarLista, setMostrarLista] = useState(false);
  const [invitando, setInvitando] = useState(false);

  useEffect(() => {
    if (!abierto || !grado || !rubrica?.id) return;
    const cancelar = escucharRuta(`evaluaciones/${grado}/evaluadores/${rubrica.id}`, (data) => {
      const lista = Object.entries(data || {}).map(([uid, v]) => ({ uid, ...v }));
      setEvaluadores(lista);
    });
    return cancelar;
  }, [abierto, grado, rubrica?.id]);

  useEffect(() => {
    if (!abierto) return;
    const cancelar = escucharRuta('config/docentes', (data) => {
      const lista = [];
      for (const gradoKey in data || {}) {
        for (const emailKey in data[gradoKey] || {}) {
          const reg = data[gradoKey][emailKey];
          if (reg?.email && reg?.nombre) {
            lista.push({ email: reg.email, nombre: reg.nombre, uid: reg.uid || '' });
          }
        }
      }
      const unicos = [];
      const vistos = new Set();
      for (const d of lista) {
        if (!vistos.has(d.email)) {
          vistos.add(d.email);
          unicos.push(d);
        }
      }
      setDocentes(unicos);
    });
    return cancelar;
  }, [abierto]);

  const docentesFiltrados = docentes.filter((d) => {
    if (!busqueda.trim()) return true;
    const b = busqueda.toLowerCase();
    return d.nombre.toLowerCase().includes(b) || d.email.toLowerCase().includes(b);
  });

  const puedeInvitar = evaluadores.length < MAX_EVALUADORES;

  async function invitar(email, nombre, uid) {
    if (!puedeInvitar) { toastError(`Máximo ${MAX_EVALUADORES} co-evaluadores.`); return; }
    if (evaluadores.some((e) => e.email === email)) { toastError('Este docente ya fue invitado.'); return; }
    if (email === docenteUser?.email) { toastError('No puedes invitarte a ti mismo.'); return; }

    setInvitando(true);
    try {
      await invitarEvaluador(grado, rubrica.id, {
        email,
        nombre,
        uid: uid || email.replace(/[^a-zA-Z0-9]/g, '_'),
        invitadoPor: docenteUser?.email || '',
        invitadoPorNombre: docenteUser?.displayName || '',
      });
      toastSuccess(`${nombre || email} invitado como co-evaluador.`);
      setEmailInput('');
      setNombreInput('');
      setBusqueda('');
      setMostrarLista(false);
    } catch {
      toastError('Error al invitar.');
    } finally {
      setInvitando(false);
    }
  }

  async function revocar(uid, nombre) {
    if (!window.confirm(`¿Revocar acceso de ${nombre} a esta rúbrica?`)) return;
    try {
      await revocarEvaluador(grado, rubrica.id, uid);
      toastSuccess(`${nombre} removido.`);
    } catch {
      toastError('Error al revocar.');
    }
  }

  if (!abierto) return null;

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCerrar} />
          <motion.div
            className="relative bg-slate-900 rounded-[2rem] border border-slate-700 shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-5"
            initial={{ scale: 0.9, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 30 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black italic uppercase text-slate-100">
                  <i className="fas fa-user-group mr-2 text-indigo-400" />
                  Co-Evaluadores
                </h3>
                <p className="text-[9px] font-bold italic text-slate-500 mt-0.5">
                  {rubrica?.titulo} · {evaluadores.length}/{MAX_EVALUADORES} invitados
                </p>
              </div>
              <button onClick={onCerrar} className="text-slate-500 hover:text-slate-300 transition">
                <i className="fas fa-xmark text-lg" />
              </button>
            </div>

            {evaluadores.length > 0 && (
              <div className="space-y-2">
                {evaluadores.map((ev) => (
                  <div key={ev.uid} className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-3 border border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                        <i className="fas fa-user-tie text-indigo-400 text-xs" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-100">{ev.nombre || ev.email}</p>
                        <p className="text-[8px] font-bold text-slate-500">{ev.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => revocar(ev.uid, ev.nombre || ev.email)}
                      className="text-rose-400 hover:text-rose-300 text-xs transition"
                      title="Revocar acceso"
                    >
                      <i className="fas fa-xmark-circle" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!puedeInvitar && (
              <p className="text-[9px] font-bold text-amber-400 text-center italic">
                Límite de {MAX_EVALUADORES} co-evaluadores alcanzado.
              </p>
            )}

            {puedeInvitar && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMostrarLista(!mostrarLista)}
                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition border ${
                      mostrarLista
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <i className="fas fa-list mr-1" /> Del sistema
                  </button>
                  <button
                    onClick={() => setMostrarLista(false)}
                    className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition border ${
                      !mostrarLista
                        ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/40'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <i className="fas fa-envelope mr-1" /> Por correo
                  </button>
                </div>

                {mostrarLista ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar docente..."
                      className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {docentesFiltrados.length === 0 && (
                        <p className="text-[9px] text-slate-500 text-center py-3 italic">No se encontraron docentes.</p>
                      )}
                      {docentesFiltrados.map((d) => (
                        <button
                          key={d.email}
                          onClick={() => invitar(d.email, d.nombre, d.uid)}
                          disabled={evaluadores.some((e) => e.email === d.email) || d.email === docenteUser?.email}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <p className="text-[10px] font-bold text-slate-200">{d.nombre}</p>
                          <p className="text-[8px] text-slate-500">{d.email}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Correo del colega"
                      className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                    />
                    <input
                      type="text"
                      value={nombreInput}
                      onChange={(e) => setNombreInput(e.target.value)}
                      placeholder="Nombre (opcional)"
                      className="w-full p-3 bg-slate-800 rounded-xl border border-slate-700 text-[10px] font-bold text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-600"
                    />
                    <button
                      onClick={() => invitar(emailInput.trim(), nombreInput.trim())}
                      disabled={!emailInput.trim() || invitando}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition"
                    >
                      {invitando ? 'Invitando...' : 'Invitar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

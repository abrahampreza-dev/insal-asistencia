// src/components/BotonGuardarAsistencia.jsx
// ---------------------------------------------------------------------------
// Cierra la asistencia del día para un grado (acción "congelarReporte" en el
// backend). A partir de aquí el código OTP deja de servir para auto-marcar,
// y ya no se pueden hacer más correcciones manuales de ese día. Lo puede
// ejecutar el asistente (con su clave seccional) o el maestro/admin (con
// claveAdmin) — quien sea que esté tomando la asistencia ese día.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import { llamarApi } from '../api';
import { Spinner, AlertaError, TarjetaExito } from './EstadoPeticion';

/**
 * @param {string} grado
 * @param {{clave?: string, claveAdmin?: string, cerradoPor?: string}} auth
 */
/**
 * @param {string} grado
 * @param {{clave?: string, claveAdmin?: string, cerradoPor?: string}} auth
 * @param {string[]} [pendientes] - nombres de alumnos sin marcar todavía;
 *   si tiene elementos, el botón se deshabilita y muestra el aviso en vez
 *   de intentar guardar (la validación real y definitiva vive igual en el
 *   backend, esto solo evita el intento innecesario).
 */
export default function BotonGuardarAsistencia({ grado, auth, pendientes = [] }) {
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState('idle'); // idle | exito | error
  const [mensaje, setMensaje] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  async function guardar() {
    setCargando(true);
    setEstado('idle');
    const resultado = await llamarApi('congelarReporte', { grado, ...auth });
    setCargando(false);
    setConfirmar(false);

    if (resultado.ok) {
      setEstado('exito');
      setMensaje(resultado.mensaje);
    } else {
      setEstado('error');
      setMensaje(resultado.error);
    }
  }

  if (estado === 'exito') {
    return <TarjetaExito titulo="Asistencia guardada" mensaje={mensaje} />;
  }

  if (pendientes.length > 0) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-xs">
        <p className="text-[9px] font-black uppercase text-amber-400 tracking-widest italic text-center mb-2">
          Faltan {pendientes.length} alumno(s) por marcar
        </p>
        <p className="text-[10px] text-slate-400 italic text-center">
          {pendientes.slice(0, 4).join(' · ')}{pendientes.length > 4 ? ` y ${pendientes.length - 4} más` : ''}
        </p>
        <p className="text-[9px] text-slate-500 italic text-center mt-2">
          Asígnales P, A o M antes de poder guardar la asistencia del día.
        </p>
      </div>
    );
  }

  return (
    <div>
      {!confirmar ? (
        <button
          onClick={() => setConfirmar(true)}
          className="bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition"
        >
          Guardar Asistencia del Día
        </button>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 space-y-3 max-w-xs">
          <p className="text-[10px] font-bold italic text-emerald-300 text-center">
            Esto cierra la asistencia de {grado} de hoy. El código dejará de servir y no se podrán hacer más correcciones. ¿Confirmas?
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmar(false)} className="flex-1 p-2 text-[10px] font-bold text-slate-400 uppercase">Cancelar</button>
            <button onClick={guardar} disabled={cargando}
              className="flex-1 p-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg uppercase disabled:opacity-50">
              {cargando ? 'Guardando...' : 'Sí, guardar'}
            </button>
          </div>
        </div>
      )}
      {cargando && <Spinner texto="Guardando asistencia..." />}
      <AlertaError mensaje={estado === 'error' ? mensaje : ''} />
    </div>
  );
}

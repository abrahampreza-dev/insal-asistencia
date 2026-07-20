// src/components/GeneradorOtp.jsx
// ---------------------------------------------------------------------------
// Genera el código OTP diario de un grado y lo muestra en grande para que el
// asistente/maestro se lo diga a los estudiantes. Sin vencimiento por
// tiempo: el código sigue siendo válido hasta que se presiona "Guardar
// Asistencia" (ver BotonGuardarAsistencia.jsx), que cierra el día.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useCallback } from 'react';
import { llamarApi } from '../api';
import { escucharRuta } from '../firebase';
import { CampoError } from './EstadoPeticion';

function hoyISO() {
  const d = new Date();
  // Forzamos el formato local de año, mes y día
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

/**
 * @param {string} grado
 * @param {{clave?: string, claveAdmin?: string, generadoPor?: string}} auth
 */
export default function GeneradorOtp({ grado, auth }) {
  const [otpInfo, setOtpInfo] = useState(null); // {codigo, generadoPor} | null
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const fecha = hoyISO();

  useEffect(() => {
    if (!grado) return undefined;
    return escucharRuta(`codigos_diarios/${fecha}/${grado}`, (data) => setOtpInfo(data || null));
  }, [grado, fecha]);

  const generar = useCallback(async () => {
    setCargando(true);
    setError('');
    const resultado = await llamarApi('generarOtp', { grado, ...auth });
    setCargando(false);
    if (!resultado.ok) setError(resultado.error || 'No se pudo generar el código.');
  }, [grado, auth]);

  // Compatibilidad: si en Firebase quedó un valor viejo guardado como texto
  // plano (formato anterior), lo mostramos igual en vez de fallar en blanco.
  const codigo = otpInfo && typeof otpInfo === 'object' ? otpInfo.codigo : otpInfo;

  return (
    <div className="text-center">
      {codigo ? (
        <div className="bg-slate-800 border border-indigo-500/30 rounded-2xl px-8 py-4 inline-block">
          <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest italic">Código de hoy</p>
          <p className="text-4xl font-black italic tracking-[0.35em] text-indigo-300">{codigo}</p>
          <button
            onClick={generar}
            disabled={cargando}
            className="text-[9px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-200 transition disabled:opacity-50 mt-1"
          >
            {cargando ? 'Generando...' : 'Generar uno nuevo'}
          </button>
        </div>
      ) : (
        <button
          onClick={generar}
          disabled={cargando}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {cargando ? 'Generando...' : 'Generar Código del Día'}
        </button>
      )}
      <CampoError mensaje={error} />
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { llamarApi } from '../api';
import { escucharRuta } from '../firebase';
import { CampoError } from './EstadoPeticion';

function hoyISO() {
  const d = new Date();
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

export default function GeneradorOtp({ grado, auth }) {
  const [otpInfo, setOtpInfo] = useState(null);
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

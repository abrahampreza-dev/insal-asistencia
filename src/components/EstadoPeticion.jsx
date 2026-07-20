import React from 'react';

export function Spinner({ texto = 'Cargando...' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-6 text-indigo-400">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-[10px] font-black uppercase tracking-widest italic">{texto}</span>
    </div>
  );
}

export function TarjetaExito({ titulo = '¡Listo!', mensaje, children }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-[2rem] p-6 shadow-sm animate-[fadeIn_0.3s_ease-out]">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-full text-sm">✓</span>
        <p className="font-black uppercase text-xs italic tracking-widest">{titulo}</p>
      </div>
      {mensaje && <p className="text-xs font-bold italic mt-2">{mensaje}</p>}
      {children}
    </div>
  );
}

export function AlertaError({ mensaje }) {
  if (!mensaje) return null;
  return (
    <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 shadow-sm flex items-start gap-3">
      <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-rose-500 text-white rounded-full text-xs font-black">!</span>
      <p className="text-xs font-bold italic">{mensaje}</p>
    </div>
  );
}

export function CampoError({ mensaje }) {
  if (!mensaje) return null;
  return <p className="text-rose-400 text-[10px] font-bold italic mt-1 ml-1">{mensaje}</p>;
}

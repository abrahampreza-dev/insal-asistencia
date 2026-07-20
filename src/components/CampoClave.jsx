import React, { useState } from 'react';

export default function CampoClave({ value, onChange, placeholder, onKeyDown, className = '', autoFocus = false }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full p-4 pr-12 bg-slate-800 rounded-xl border-none font-bold italic outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
        aria-label={visible ? 'Ocultar clave' : 'Mostrar clave'}
      >
        <i className={`fas ${visible ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
      </button>
    </div>
  );
}

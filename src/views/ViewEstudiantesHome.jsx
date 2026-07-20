
// Mini "landing" del Área Estudiantes: presenta los 3 accesos (Registro,
// Marcación, Administrador de Sección) como tarjetas, igual que el
// prototipo original presentaba sus accesos principales en el Home.

import React from 'react';

const ACCESOS = [
  { id: 'registro', icono: 'fa-user-plus', titulo: 'Registro', desc: 'Inscribe tus datos y tu foto si todavía no estás registrado.', color: 'bg-indigo-600' },
  { id: 'marcacion', icono: 'fa-clipboard-check', titulo: 'Marcación', desc: 'Marca tu asistencia del día con tu NIE y el código del momento.', color: 'bg-emerald-600' },
  { id: 'asistente', icono: 'fa-user-shield', titulo: 'Administrador de Sección', desc: 'Genera el código diario y corrige estados si eres el encargado.', color: 'bg-amber-500' },
];

export default function ViewEstudiantesHome({ onNavegar }) {
  return (
    <div className="max-w-3xl mx-auto text-center">
      <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-slate-100 mb-3">
        Área <span className="text-emerald-400">Estudiantes</span>
      </h1>
      <p className="text-slate-400 font-bold italic text-sm max-w-xl mx-auto mb-10">
        Elige qué necesitas hacer hoy.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {ACCESOS.map((a) => (
          <button
            key={a.id}
            onClick={() => onNavegar(a.id)}
            className="group text-left bg-slate-900 p-6 rounded-[2rem] border border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
          >
            <div className={`w-12 h-12 rounded-2xl ${a.color} text-white flex items-center justify-center mb-4 text-lg group-hover:scale-110 transition-transform`}>
              <i className={`fas ${a.icono}`} />
            </div>
            <p className="font-black uppercase italic text-sm text-slate-100 mb-1">{a.titulo}</p>
            <p className="text-[11px] text-slate-400 font-bold italic">{a.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import logo from '../assets/logo.png';

const AREAS = [
  {
    id: 'estudiante',
    icono: 'fa-user-graduate',
    titulo: 'Área Estudiantes',
    desc: 'Regístrate, marca tu asistencia con el código del día, o administra la sección si eres el asistente.',
    color: 'bg-emerald-600',
  },
  {
    id: 'maestro',
    icono: 'fa-chalkboard-user',
    titulo: 'Área Administrador',
    desc: 'Reportes por género, corrección de asistencia, gestión de alumnos y claves de secciones.',
    color: 'bg-slate-900',
  },
];

export default function ViewLanding({ onNavegar }) {
  return (
    <div className="max-w-3xl mx-auto text-center flex flex-col justify-between min-h-[80vh]">
      <div>
        <img src={logo} alt="INSAL" className="w-24 h-24 object-contain mx-auto mb-6" />
        <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-100 mb-4">
          INSAL <span className="text-indigo-400">Asistencia</span>
        </h1>
        <p className="text-slate-400 font-bold italic text-sm max-w-xl mx-auto mb-12">
          Sistema para registrar, auditar y reportar la asistencia diaria de los
          estudiantes del Instituto Nacional San Luis.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {AREAS.map((a) => (
            <button
              key={a.id}
              onClick={() => onNavegar(a.id)}
              className="group text-left bg-slate-900 p-8 rounded-[2rem] border border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl ${a.color} text-white flex items-center justify-center mb-5 text-xl group-hover:scale-110 transition-transform`}>
                <i className={`fas ${a.icono}`} />
              </div>
              <p className="font-black uppercase italic text-sm text-slate-100 mb-2">{a.titulo}</p>
              <p className="text-[11px] text-slate-400 font-bold italic">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <footer className="pt-6 border-t border-slate-800/60">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
          Desarrollado por <span className="text-indigo-400 font-black">AE Preza Group</span>
        </p>
        <p className="text-[9px] font-bold text-slate-600 italic mt-1">
          Versión 2.0.0
        </p>
      </footer>
    </div>
  );
}

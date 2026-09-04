import React from 'react';

const ACCESOS = [
  {
    id: 'marcacion',
    icono: 'fa-clipboard-check',
    titulo: 'Marcar Asistencia',
    desc: 'Registra tu entrada diaria con tu NIE y el código OTP del momento.',
    color: 'from-emerald-500 to-teal-600',
    badge: 'Diario',
  },
  {
    id: 'registro',
    icono: 'fa-user-plus',
    titulo: 'Registro de Alumno',
    desc: 'Inscríbete por primera vez con tu NIE, datos personales y fotografía.',
    color: 'from-violet-500 to-fuchsia-600',
    badge: 'Inscripción',
  },
  {
    id: 'evaluaciones',
    icono: 'fa-clipboard-list',
    titulo: 'Evaluaciones y Exámenes',
    desc: 'Resuelve tus pruebas en línea y consulta tus notas y resultados.',
    color: 'from-indigo-600 to-purple-600',
    badge: 'En línea',
  },
  {
    id: 'perfil',
    icono: 'fa-user',
    titulo: 'Mi Perfil & Carnet Digital',
    desc: 'Consulta tu carnet de estudiante, racha de asistencia y tus logros.',
    color: 'from-blue-600 to-cyan-600',
    badge: 'Carnet HD',
  },
  {
    id: 'asistente',
    icono: 'fa-user-shield',
    titulo: 'Asistente de Sección',
    desc: 'Genera el código diario y valida ausentes si eres el encargado seccional.',
    color: 'from-amber-500 to-orange-600',
    badge: 'Líder',
  },
];

export default function ViewEstudiantesHome({ onNavegar }) {
  const hora = new Date().getHours();
  const saludo = hora < 12 ? '¡Buenos días!' : hora < 18 ? '¡Buenas tardes!' : '¡Buenas noches!';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Welcome Banner Header */}
      <div className="wayground-card bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 p-8 rounded-[2.5rem] border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 italic block mb-1">
            Plataforma Académica INSAL
          </span>
          <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight text-slate-100 mb-2">
            {saludo} <span className="text-emerald-400">Estudiante</span>
          </h1>
          <p className="text-xs font-bold italic text-slate-400 max-w-xl">
            Bienvenido al portal de asistencias y evaluaciones. Selecciona el módulo al que deseas acceder hoy.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 pt-4 border-t border-slate-800 text-[10px] font-black italic text-slate-300">
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <i className="fas fa-calendar-day text-indigo-400" />
              {new Date().toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <i className="fas fa-circle-check text-emerald-400" /> Sistema Operativo
            </div>
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <i className="fas fa-shield-halved text-violet-400" /> Acceso Seguro
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ACCESOS.map((a) => (
          <button
            key={a.id}
            onClick={() => onNavegar(a.id)}
            className="wayground-card text-left bg-slate-900 p-7 rounded-[2.5rem] border border-slate-800/80 shadow-lg hover:shadow-2xl hover:border-indigo-500/40 transition-all group relative overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${a.color} text-white flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                <i className={`fas ${a.icono}`} />
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest bg-slate-950 px-2.5 py-1 rounded-full text-indigo-300 border border-slate-800">
                {a.badge}
              </span>
            </div>

            <h3 className="font-black uppercase italic text-base text-slate-100 mb-2 group-hover:text-indigo-400 transition-colors">
              {a.titulo}
            </h3>

            <p className="text-[11px] text-slate-400 font-bold italic leading-relaxed">
              {a.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

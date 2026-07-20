import React, { useState } from 'react';
import logo from './assets/logo.png';
import ViewLanding from './views/ViewLanding';
import ViewEstudiantesHome from './views/ViewEstudiantesHome';
import ViewRegistroAlumno from './views/ViewRegistroAlumno';
import ViewMarcacion from './views/ViewMarcacion';
import ViewAsistente from './views/ViewAsistente';
import ViewAdmin from './views/ViewAdmin';

const AREAS = [
  { id: 'landing', icono: 'fa-house', titulo: 'Inicio' },
  { id: 'estudiante', icono: 'fa-user-graduate', titulo: 'Área Estudiantes' },
  { id: 'maestro', icono: 'fa-chalkboard-user', titulo: 'Área Administrador' },
];

const SUBNAV_ESTUDIANTE = [
  { id: 'inicio', icono: 'fa-house', titulo: 'Inicio Estudiantes' },
  { id: 'registro', icono: 'fa-user-plus', titulo: 'Registro' },
  { id: 'marcacion', icono: 'fa-clipboard-check', titulo: 'Marcación' },
  { id: 'asistente', icono: 'fa-user-shield', titulo: 'Administrador de Sección' },
];

export default function App() {
  const [area, setArea] = useState('landing');
  const [subvista, setSubvista] = useState('inicio');

  function irAArea(idArea) {
    setArea(idArea);
    if (idArea === 'estudiante') setSubvista('inicio');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row font-['Plus_Jakarta_Sans']">
      <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 lg:min-h-screen lg:fixed lg:h-full flex lg:flex-col items-center lg:items-stretch gap-2 lg:gap-1">
        <div className="flex items-center gap-3 mb-2 lg:mb-8">
          <img src={logo} alt="INSAL" className="w-10 h-10 object-contain" />
          <h2 className="hidden lg:block text-[10px] font-black text-slate-400 uppercase leading-tight italic">
            INSAL<br /><span className="text-indigo-400">Asistencia</span>
          </h2>
        </div>

        <nav className="flex lg:flex-col gap-1 flex-1 overflow-x-auto lg:overflow-visible">
          {AREAS.map((a) => (
            <button
              key={a.id}
              onClick={() => irAArea(a.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black uppercase italic whitespace-nowrap transition-all ${
                area === a.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${a.icono}`} />
              <span>{a.titulo}</span>
            </button>
          ))}
        </nav>

        {area === 'estudiante' && (
          <nav className="flex lg:flex-col gap-1 lg:mt-6 lg:pt-6 lg:border-t border-slate-800 overflow-x-auto lg:overflow-visible">
            {SUBNAV_ESTUDIANTE.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubvista(s.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase italic whitespace-nowrap transition-all ${
                  subvista === s.id ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <i className={`fas ${s.icono}`} />
                <span>{s.titulo}</span>
              </button>
            ))}
          </nav>
        )}
      </aside>

      <main className="flex-1 lg:ml-64 p-6 md:p-10">
        {area === 'landing' && <ViewLanding onNavegar={irAArea} />}

        {area === 'estudiante' && (
          <>
            {subvista === 'inicio' && <ViewEstudiantesHome onNavegar={setSubvista} />}
            {subvista === 'registro' && <ViewRegistroAlumno />}
            {subvista === 'marcacion' && <ViewMarcacion />}
            {subvista === 'asistente' && <ViewAsistente />}
          </>
        )}

        {area === 'maestro' && <ViewAdmin />}
      </main>
    </div>
  );
}

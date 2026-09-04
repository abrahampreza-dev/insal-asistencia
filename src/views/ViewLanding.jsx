import React from 'react';
import { motion } from 'framer-motion';
import logo from '../assets/logo.png';

const AREAS = [
  {
    id: 'estudiante',
    icono: 'fa-user-graduate',
    titulo: 'Área Estudiantes',
    desc: 'Regístrate, marca tu asistencia con el código del día y resuelve tus evaluaciones en línea.',
    color: 'from-emerald-600 to-teal-700',
    badge: 'Acceso con NIE',
  },
  {
    id: 'docente',
    icono: 'fa-chalkboard-user',
    titulo: 'Área Docente',
    desc: 'Toma lista por materia, crea y califica exámenes, y evalúa exposiciones con rúbricas en línea.',
    color: 'from-indigo-600 to-indigo-800',
    badge: 'Cuenta @clases.edu.sv',
  },
  {
    id: 'admin',
    icono: 'fa-shield-halved',
    titulo: 'Área Administrativa',
    desc: 'Gestión de secciones, estudiantes, claves de asistencia y reportes institucionales.',
    color: 'from-violet-600 to-violet-800',
    badge: 'Acceso restringido',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

export default function ViewLanding({ onNavegar }) {
  return (
    <div className="max-w-4xl mx-auto flex flex-col justify-between min-h-[80vh]">
      <motion.div
        className="text-center"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.img
          src={logo}
          alt="INSAL"
          className="w-24 h-24 object-contain mx-auto mb-6 drop-shadow-lg"
          variants={{
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1, transition: { duration: 0.5 } },
          }}
        />

        <motion.span
          className="text-[10px] font-black uppercase tracking-widest text-emerald-400 italic mb-2 block"
          variants={itemVariants}
        >
          Instituto Nacional San Luis
        </motion.span>

        <motion.h1
          className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-100 mb-4"
          variants={itemVariants}
        >
          Asistencias y Evaluaciones <span className="text-indigo-400">INSAL</span>
        </motion.h1>

        <motion.p
          className="text-slate-400 font-bold italic text-sm max-w-2xl mx-auto mb-12"
          variants={itemVariants}
        >
          Portal para registrar la asistencia diaria, aplicar evaluaciones en línea y
          calificar exposiciones grupales, para la gestión académica.
        </motion.p>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          variants={itemVariants}
        >
          {AREAS.map((a) => (
            <motion.button
              key={a.id}
              onClick={() => onNavegar(a.id)}
              className="group text-left bg-slate-900 p-7 rounded-[2.5rem] border border-slate-800 shadow-lg hover:shadow-2xl hover:border-indigo-500/40 transition-colors relative overflow-hidden"
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-indigo-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${a.color} text-white flex items-center justify-center mb-5 text-xl shadow-lg group-hover:scale-110 transition-transform`}>
                <i className={`fas ${a.icono}`} />
              </div>
              <span className="relative inline-block text-[8px] font-black uppercase tracking-widest bg-slate-950 px-2.5 py-1 rounded-full text-indigo-300 border border-slate-800 mb-3">
                {a.badge}
              </span>
              <p className="relative font-black uppercase italic text-sm text-slate-100 mb-2 group-hover:text-indigo-400 transition-colors">
                {a.titulo}
              </p>
              <p className="relative text-[10px] text-slate-400 font-bold italic leading-relaxed">
                {a.desc}
              </p>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      <footer className="pt-6 border-t border-slate-800/60 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
          Asistencias y Evaluaciones INSAL · Gestión Académica
        </p>
        <p className="text-[9px] font-bold text-slate-600 italic mt-1">
          © {new Date().getFullYear()} SISTEMA DE AE PREZA GROUP — TODOS LOS DERECHOS RESERVADOS
        </p>
      </footer>
    </div>
  );
}
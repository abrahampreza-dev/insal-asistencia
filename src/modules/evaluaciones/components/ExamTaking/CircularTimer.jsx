import React from 'react';
import { motion } from 'framer-motion';

export default function CircularTimer({ tiempoRestante, tiempoTotal, tamano = 120 }) {
  const radio = (tamano - 8) / 2;
  const circumferencia = 2 * Math.PI * radio;

  const minutos = Math.floor(tiempoRestante / 60);
  const segundos = tiempoRestante % 60;
  const tiempoFormateado = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

  const porcentaje = tiempoTotal > 0 ? (tiempoRestante / tiempoTotal) * 100 : 0;

  const getColor = () => {
    if (porcentaje > 50) return '#34d399';
    if (porcentaje > 25) return '#fbbf24';
    return '#f87171';
  };

  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: tamano, height: tamano }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
    >
      <svg
        width={tamano}
        height={tamano}
        className="transform -rotate-90"
      >
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-700"
        />
        <circle
          cx={tamano / 2}
          cy={tamano / 2}
          r={radio}
          fill="transparent"
          stroke={getColor()}
          strokeWidth="4"
          strokeDasharray={circumferencia}
          strokeDashoffset={circumferencia - (circumferencia * porcentaje / 100)}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>

      <motion.div
        className="absolute inset-0 flex items-center justify-center flex-col"
        animate={porcentaje < 10 ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ repeat: porcentaje < 10 ? Infinity : 0, duration: 1 }}
      >
        <span className={`font-black text-2xl ${
          porcentaje > 50 ? 'text-emerald-400' : porcentaje > 25 ? 'text-amber-400' : 'text-rose-400'
        }`}>
          {tiempoFormateado}
        </span>
        <span className="text-[8px] font-black uppercase text-slate-500 italic mt-1">
          Tiempo restante
        </span>
      </motion.div>
    </motion.div>
  );
}

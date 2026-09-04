import React, { useEffect, useState } from 'react';

const COLORES = ['#fbbf24', '#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c'];
const ICONOS = ['✦', '★', '♦', '●', '♥', '▲'];

export default function Confeti({ activo, duracion = 4000 }) {
  const [piezas, setPiezas] = useState([]);

  useEffect(() => {
    if (!activo) return;
    const nuevas = [];
    for (let i = 0; i < 60; i++) {
      nuevas.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duracion: 1.5 + Math.random() * 2,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
        icono: ICONOS[Math.floor(Math.random() * ICONOS.length)],
        tamaño: 10 + Math.random() * 18,
      });
    }
    setPiezas(nuevas);
    const timer = setTimeout(() => setPiezas([]), duracion);
    return () => clearTimeout(timer);
  }, [activo, duracion]);

  if (piezas.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {piezas.map((p) => (
        <span
          key={p.id}
          className="absolute animate-confeti"
          style={{
            left: p.left + '%',
            top: '-5%',
            fontSize: p.tamaño + 'px',
            color: p.color,
            animationDelay: p.delay + 's',
            animationDuration: p.duracion + 's',
          }}
        >
          {p.icono}
        </span>
      ))}
    </div>
  );
}

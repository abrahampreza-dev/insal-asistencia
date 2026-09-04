import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => {
    try {
      const temaGuardado = localStorage.getItem('tema');
      if (temaGuardado) return temaGuardado;
    } catch {}

    const prefiereOscuro = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefiereOscuro ? 'oscuro' : 'claro';
  });

  // Escuchar cambios de preferencia del sistema si no hay preferencia manual forzada
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      if (!localStorage.getItem('tema')) {
        setTema(e.matches ? 'oscuro' : 'claro');
      }
    };

    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  // Sincronizar atributos de HTML y localStorage
  useEffect(() => {
    const root = document.documentElement;

    // Atributo personalizado
    root.setAttribute('data-tema', tema);

    // Compatibilidad nativa con Tailwind CSS (clase .dark)
    if (tema === 'oscuro') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem('tema', tema);
    } catch {}
  }, [tema]);

  const toggleTema = () => {
    setTema((prev) => (prev === 'oscuro' ? 'claro' : 'oscuro'));
  };

  return (
    <ThemeContext.Provider value={{ tema, toggleTema, esOscuro: tema === 'oscuro' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTema() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTema debe usarse dentro de un <ThemeProvider>');
  }
  return context;
}
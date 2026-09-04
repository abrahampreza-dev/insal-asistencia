import React, { useState, useEffect } from 'react';

/**
 * Avatar del docente con fallback automático:
 * 1. Intenta cargar la foto de Google (photoURL).
 * 2. Si la URL falla al cargar o no existe, muestra iniciales sobre gradiente.
 */
export default function AvatarDocente({ user, className = '', inicialesClassName = 'text-xs' }) {
  const [errorCarga, setErrorCarga] = useState(false);

  // Si cambia la foto (re-login, perfil actualizado), reintentar la carga
  useEffect(() => {
    setErrorCarga(false);
  }, [user?.photoURL]);

  const iniciales = (user?.displayName || 'D')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() || 'D';

  if (user?.photoURL && !errorCarga) {
    return (
      <img
        src={user.photoURL}
        alt={user.displayName || 'Docente'}
        referrerPolicy="no-referrer"
        onError={() => setErrorCarga(true)}
        className={className}
      />
    );
  }

  return (
    <div
      className={`${className} bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center flex-shrink-0`}
      title={user?.displayName || 'Docente'}
    >
      <span className={`${inicialesClassName} text-white font-black select-none`}>{iniciales}</span>
    </div>
  );
}

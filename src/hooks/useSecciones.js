import { useState, useEffect } from 'react';
import { escucharRuta } from '../firebase';
import { llamarApi } from '../api';

export function useSecciones() {
  const [secciones, setSecciones] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let sembrando = false;

    const cancelar = escucharRuta('config/secciones', async (data) => {
      if (!data || Object.keys(data).length === 0) {
        if (!sembrando) {
          sembrando = true;
          await llamarApi('listarSecciones');
        }
        setSecciones([]);
        setCargando(false);
        return;
      }

      const lista = Object.entries(data).map(([id, label]) => ({ id, label }));
      lista.sort((a, b) => a.label.localeCompare(b.label));
      setSecciones(lista);
      setCargando(false);
    });

    return cancelar;
  }, []);

  return { secciones, cargando };
}

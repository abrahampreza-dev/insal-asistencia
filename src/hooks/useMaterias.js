import { useState, useEffect } from 'react';
import { escucharRuta } from '../firebase';
import { llamarApi } from '../api';

export function useMaterias() {
  const [materias, setMaterias] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let sembrando = false;

    const cancelar = escucharRuta('config/materias', async (data) => {
      if (!data || Object.keys(data).length === 0) {
        if (!sembrando) {
          sembrando = true;
          await llamarApi('listarMaterias');
        }
        setMaterias([]);
        setCargando(false);
        return;
      }

      const lista = Object.entries(data).map(([id, nombre]) => ({ id, label: String(nombre) }));
      lista.sort((a, b) => a.label.localeCompare(b.label));
      setMaterias(lista);
      setCargando(false);
    });

    return cancelar;
  }, []);

  return { materias, cargando };
}
// src/utils/fecha.js
// ---------------------------------------------------------------------------
// La fecha se maneja internamente como 'YYYY-MM-DD' (formato nativo del
// <input type="date"> y de las rutas de Firebase). Para todo lo que el
// usuario lee (CSV, WhatsApp, pantalla) se muestra normalizada DD-MM-AAAA.
// ---------------------------------------------------------------------------

export function formatearFechaDDMMAAAA(fechaISO) {
  const partes = String(fechaISO || '').split('-');
  if (partes.length !== 3) return fechaISO || '';
  const [aaaa, mm, dd] = partes;
  return `${dd}-${mm}-${aaaa}`;
}

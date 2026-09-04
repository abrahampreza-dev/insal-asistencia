/**
 * Fecha local de hoy en formato YYYY-MM-DD.
 * Única fuente de verdad para "día de hoy": usar ISO/UTC aquí rompía
 * sesiones y reportes entre las 18:00–23:59 en zonas UTC-6.
 */
export function hoyLocalISO() {
  return new Date().toLocaleDateString('sv-SE');
}

export function formatearFechaDDMMAAAA(fechaISO) {
  const partes = String(fechaISO || '').split('-');
  if (partes.length !== 3) return fechaISO || '';
  const [aaaa, mm, dd] = partes;
  return `${dd}-${mm}-${aaaa}`;
}

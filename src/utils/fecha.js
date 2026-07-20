export function formatearFechaDDMMAAAA(fechaISO) {
  const partes = String(fechaISO || '').split('-');
  if (partes.length !== 3) return fechaISO || '';
  const [aaaa, mm, dd] = partes;
  return `${dd}-${mm}-${aaaa}`;
}

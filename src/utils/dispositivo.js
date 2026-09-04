export function obtenerInformacionDispositivo() {
  const ua = navigator.userAgent;
  let navegador = 'Navegador Desconocido';
  let os = 'Sistema Desconocido';
  let tipoDispositivo = 'Escritorio';

  // 1. Detectar Navegador (El orden importa)
  if (ua.includes('Firefox/')) {
    const v = ua.split('Firefox/')[1]?.split(' ')[0];
    navegador = `Firefox ${v ? v.split('.')[0] : ''}`;
  } else if (ua.includes('Edg/')) {
    const v = ua.split('Edg/')[1]?.split(' ')[0];
    navegador = `Microsoft Edge ${v ? v.split('.')[0] : ''}`;
  } else if (ua.includes('OPR/') || ua.includes('Opera/')) {
    const v = (ua.split('OPR/')[1] || ua.split('Opera/')[1])?.split(' ')[0];
    navegador = `Opera ${v ? v.split('.')[0] : ''}`;
  } else if (ua.includes('Chrome/')) {
    const v = ua.split('Chrome/')[1]?.split(' ')[0];
    navegador = `Google Chrome ${v ? v.split('.')[0] : ''}`;
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const v = ua.split('Version/')[1]?.split(' ')[0];
    navegador = `Safari ${v ? v.split('.')[0] : ''}`;
  }

  // 2. Detectar OS
  const esIPadOS = ua.includes('Macintosh') && navigator.maxTouchPoints > 1;

  if (ua.includes('Win')) os = 'Windows';
  else if (esIPadOS) os = 'iPadOS';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux') && !ua.includes('Android')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad') || ua.includes('iPod')) os = 'iOS';

  // 3. Detectar Tipo de Dispositivo
  if (/Mobi|Android|iPhone/i.test(ua)) {
    tipoDispositivo = 'Móvil';
  } else if (/Tablet|iPad/i.test(ua) || esIPadOS) {
    tipoDispositivo = 'Tablet';
  }

  const horaLocal = new Date().toLocaleTimeString('es-SV', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return {
    navegador: navegador.trim(),
    os,
    tipoDispositivo,
    descripcion: `${navegador.trim()} en ${os} (${tipoDispositivo})`,
    horaConexion: horaLocal,
    userAgentOriginal: ua,
  };
}
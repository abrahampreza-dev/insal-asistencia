export function validarNie(valor) {
  if (!valor) return 'El NIE es requerido.';
  if (!/^[0-9]+$/.test(valor)) return 'El NIE solo debe contener números.';
  if (valor.length < 7 || valor.length > 9) return 'El NIE debe tener entre 7 y 9 dígitos.';
  return '';
}

export function validarTexto(valor, etiqueta = 'Este campo') {
  if (!valor || valor.trim().length === 0) return `${etiqueta} es requerido.`;
  if (valor.trim().length < 2) return `${etiqueta} es demasiado corto.`;
  if (!/^[A-Za-zÁÉÍÓÚÑáéíóúñ\s]+$/.test(valor)) return `${etiqueta} solo debe contener letras.`;
  return '';
}

export function validarEmail(valor) {
  if (!valor) return 'El correo es requerido.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) return 'Formato de correo inválido.';
  return '';
}

export function validarFecha(valor) {
  if (!valor) return 'La fecha de nacimiento es requerida.';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return 'Fecha inválida.';
  if (fecha > new Date()) return 'La fecha no puede ser futura.';
  return '';
}

export function validarSeleccion(valor, etiqueta = 'Este campo') {
  if (!valor) return `Debe seleccionar ${etiqueta}.`;
  return '';
}

export function validarOtp(valor) {
  if (!valor) return 'El código es requerido.';
  if (!/^[0-9]{5}$/.test(valor)) return 'El código debe tener exactamente 5 dígitos.';
  return '';
}

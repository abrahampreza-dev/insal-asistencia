const LADO = 150;
const CALIDAD = 0.5;

function _dibujarYComprimir(fuente, anchoFuente, altoFuente) {
  const canvas = document.createElement('canvas');
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext('2d');

  const escala = Math.max(LADO / anchoFuente, LADO / altoFuente);
  const anchoEscalado = anchoFuente * escala;
  const altoEscalado = altoFuente * escala;
  const dx = (LADO - anchoEscalado) / 2;
  const dy = (LADO - altoEscalado) / 2;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.drawImage(fuente, dx, dy, anchoEscalado, altoEscalado);

  return canvas.toDataURL('image/jpeg', CALIDAD);
}

export function comprimirFoto(archivo) {
  return new Promise((resolve, reject) => {
    if (!archivo || !archivo.type.startsWith('image/')) {
      reject(new Error('El archivo seleccionado no es una imagen válida.'));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => reject(new Error('No se pudo procesar la imagen.'));
      imagen.onload = () => {
        try {
          resolve(_dibujarYComprimir(imagen, imagen.width, imagen.height));
        } catch (err) {
          reject(err);
        }
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

export function comprimirFotoDesdeVideo(video) {
  if (!video || !video.videoWidth) {
    throw new Error('La cámara todavía no está lista. Espera un momento e inténtalo de nuevo.');
  }
  return _dibujarYComprimir(video, video.videoWidth, video.videoHeight);
}

export function tamanoKb(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 0.75) / 1024 * 10) / 10;
}

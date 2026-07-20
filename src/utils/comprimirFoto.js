// src/utils/comprimirFoto.js
// ---------------------------------------------------------------------------
// Pipeline de compresión de fotos vía HTMLCanvasElement invisible.
// Redimensiona a 150x150px, exporta JPEG calidad 0.5 (~<5KB) para mantener
// el proyecto dentro del plan gratuito de Firebase (<1GB de almacenamiento
// en base64 dentro del propio registro del alumno).
// ---------------------------------------------------------------------------

const LADO = 150;
const CALIDAD = 0.5;

/** Dibuja cualquier fuente (imagen o frame de video) recortada tipo "cover"
 *  centrado dentro de un canvas cuadrado LADO x LADO, y exporta JPEG. */
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

/**
 * Convierte un File/Blob de imagen (subido desde galería/archivos) en un
 * dataURL JPEG comprimido 150x150.
 * @param {File} archivo
 * @returns {Promise<string>} dataURL listo para guardarse como fotoUrl
 */
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

/**
 * Captura el frame actual de un <video> (feed en vivo de la cámara vía
 * getUserMedia) y lo comprime igual que una foto subida. Se usa para la
 * cámara integrada en la app, en vez del atributo `capture` de <input>
 * (que los navegadores de escritorio ignoran, mostrando el explorador de
 * archivos en su lugar).
 * @param {HTMLVideoElement} video
 * @returns {string} dataURL comprimido
 */
export function comprimirFotoDesdeVideo(video) {
  if (!video || !video.videoWidth) {
    throw new Error('La cámara todavía no está lista. Espera un momento e inténtalo de nuevo.');
  }
  return _dibujarYComprimir(video, video.videoWidth, video.videoHeight);
}

/** Tamaño aproximado en KB de un dataURL, útil para mostrarlo en la UI. */
export function tamanoKb(dataUrl) {
  if (!dataUrl) return 0;
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 0.75) / 1024 * 10) / 10;
}

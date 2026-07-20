// src/components/ModalCamara.jsx
// ---------------------------------------------------------------------------
// Modal de cámara en vivo usando navigator.mediaDevices.getUserMedia. Se usa
// en vez del atributo `capture` de <input type="file">, porque los
// navegadores de escritorio lo ignoran y abren el explorador de archivos en
// su lugar — esto sí abre la cámara real tanto en celular como en laptop.
// ---------------------------------------------------------------------------
import React, { useRef, useEffect, useState } from 'react';
import { comprimirFotoDesdeVideo } from '../utils/comprimirFoto';

/**
 * @param {() => void} onCerrar
 * @param {(dataUrl: string) => void} onCapturar - recibe el dataURL ya comprimido
 */
export default function ModalCamara({ onCerrar, onCapturar }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        });
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setListo(true);
        }
      } catch (err) {
        setError('No se pudo abrir la cámara. Revisa los permisos del navegador, o usa "Subir foto" en su lugar.');
      }
    }

    iniciar();
    return () => {
      cancelado = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capturar() {
    try {
      const dataUrl = comprimirFotoDesdeVideo(videoRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onCapturar(dataUrl);
    } catch (err) {
      setError(err.message);
    }
  }

  function cerrar() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 max-w-sm w-full text-center shadow-2xl">
        <h3 className="text-xs font-black uppercase text-indigo-400 italic tracking-widest mb-4">Tomar Foto</h3>

        {error ? (
          <p className="text-[11px] font-bold italic text-rose-400 bg-rose-500/10 rounded-xl p-4 mb-4">{error}</p>
        ) : (
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-950 mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {!listo && (
              <p className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-slate-400 italic tracking-widest">
                Abriendo cámara...
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={cerrar} className="flex-1 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Cancelar
          </button>
          {!error && (
            <button
              onClick={capturar}
              disabled={!listo}
              className="flex-1 p-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black shadow-lg uppercase tracking-widest disabled:opacity-50"
            >
              Capturar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

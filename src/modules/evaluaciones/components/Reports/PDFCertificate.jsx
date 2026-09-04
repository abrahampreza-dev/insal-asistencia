import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function PDFCertificate({ resultado, examen, estudiante, tipo = 'reporte' }) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');

  const generarPDF = async () => {
    if (!resultado || !examen || !estudiante) {
      setError('Faltan datos para generar el PDF.');
      return;
    }

    setGenerando(true);
    setError('');

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const ancho = 210;
      let yPos = 20;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, ancho, 297, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('INSAL', 20, yPos);
      yPos += 5;
      doc.setFontSize(14);
      doc.setTextColor(163, 175, 255);
      doc.text('Instituto Nacional San Luis', 20, yPos);
      doc.setTextColor(255, 255, 255);
      yPos += 15;

      doc.setFontSize(20);
      doc.setTextColor(163, 175, 255);
      if (tipo === 'certificado') {
        if (resultado.porcentaje >= 60) {
          doc.text('CERTIFICADO DE ESTUDIOS', 20, yPos);
        } else {
          doc.text('CERTIFICADO DE EXAMEN', 20, yPos);
        }
      } else {
        doc.text('REPORTE DE EVALUACION', 20, yPos);
      }
      yPos += 15;

      doc.setFontSize(12);
      doc.setTextColor(203, 213, 255);
      doc.setFont('helvetica', 'normal');
      doc.text(`Examen: ${examen.titulo}`, 20, yPos);
      yPos += 6;
      doc.text(`Sección: ${examen.grado}`, 20, yPos);
      yPos += 6;
      doc.text(`Estudiante: ${estudiante.nombres} ${estudiante.apellidos}`, 20, yPos);
      yPos += 6;
      doc.text(`NIE: ${estudiante.nie}`, 20, yPos);
      yPos += 6;
      const fechaActual = new Date().toLocaleDateString('es-SV', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      doc.text(`Fecha: ${fechaActual}`, 20, yPos);
      yPos += 10;

      doc.setDrawColor(163, 175, 255);
      doc.setLineWidth(0.5);
      doc.line(20, yPos, 190, yPos);
      yPos += 10;

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('RESULTADO', 20, yPos);
      yPos += 8;

      const puntajeTotal = examen.configuracion?.puntajeTotal || 0;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Puntaje obtenido: ${Number(resultado.puntajeObtenido).toFixed(2)} / ${puntajeTotal}`, 20, yPos);
      yPos += 6;
      doc.text(`Porcentaje: ${resultado.porcentaje}%`, 20, yPos);
      yPos += 6;

      const calif = resultado.calificacion || '';
      const letra = calif.split(' ')[0] || 'N/A';
      doc.text(`Calificación: ${letra}`, 20, yPos);
      yPos += 6;

      const estado = resultado.porcentaje >= 60 ? 'APROBADO' : 'REPROBADO';
      const colorEstado = resultado.porcentaje >= 60 ? [52, 211, 153] : [239, 68, 68];
      doc.setTextColor(colorEstado[0], colorEstado[1], colorEstado[2]);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(estado, 150, yPos + 4);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      yPos += 10;

      doc.setTextColor(163, 175, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DETALLE POR PREGUNTA', 20, yPos);
      yPos += 8;

      (examen.preguntas || []).forEach((pregunta, idx) => {
        const detalle = resultado.detallePreguntas?.find((d) => d.preguntaId === pregunta.id);
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(203, 213, 255);
        doc.setFont('helvetica', 'normal');

        const textoPregunta = `${idx + 1}. ${pregunta.enunciado}`;
        const lineasPreg = doc.splitTextToSize(textoPregunta, 170);
        doc.text(lineasPreg, 20, yPos);
        yPos += lineasPreg.length * 5 + 2;

        if (detalle) {
          let info = '';
          if (detalle.correcta === true) {
            info = 'Correcta';
          } else if (detalle.correcta === false) {
            info = 'Incorrecta';
          } else if (detalle.score !== undefined) {
            info = `Calificado: ${Number(detalle.score).toFixed(2)}/${pregunta.puntaje}`;
          }

          doc.setTextColor(163, 213, 255);
          doc.text(`Resultado: ${info}`, 25, yPos);
          yPos += 5;

          if (detalle.feedback) {
            const lineasFeedback = doc.splitTextToSize(`Feedback: ${detalle.feedback}`, 165);
            doc.setTextColor(165, 180, 210);
            doc.setFontSize(8);
            doc.text(lineasFeedback, 25, yPos);
            yPos += lineasFeedback.length * 4 + 2;
          }
        }
        yPos += 2;
      });

      if (resultado.eventosProctoring && resultado.eventosProctoring.length > 0) {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.setTextColor(255, 193, 7);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('REGISTRO DE INTEGRIDAD', 20, yPos);
        yPos += 8;

        doc.setTextColor(163, 213, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de incidentes registrados: ${resultado.eventosProctoring.length}`, 25, yPos);
        yPos += 5;

        resultado.eventosProctoring.slice(0, 10).forEach((evento) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          const fecha = new Date(evento.timestamp).toLocaleTimeString('es-SV');
          doc.text(
            `${fecha} — ${evento.tipo} (${evento.severidad || 'normal'})`,
            25,
            yPos
          );
          yPos += 4;
        });
      }

      doc.setTextColor(203, 213, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        'Generado por INSAL — Asistencias y Evaluaciones',
        20,
        290
      );

      doc.save(
        `${tipo === 'certificado' ? 'Certificado' : 'Reporte'}_${examen.titulo}_${estudiante.nie}.pdf`
      );
    } catch (err) {
      console.error('Error generando PDF:', err);
      setError(err.message || 'Error al generar PDF.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={generarPDF}
        disabled={generando}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition"
      >
        {generando ? (
          <>
            <i className="fas fa-spinner fa-pulse" /> Generando...
          </>
        ) : (
          <>
            <i className="fas fa-file-pdf" /> Exportar PDF
          </>
        )}
      </button>
      {error && <span className="text-[8px] text-rose-400 font-bold">{error}</span>}
    </div>
  );
}

import { ETIQUETAS_TIPOS_PREGUNTA } from '../constants';

function _esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Quita delimitadores LaTeX ($...$, $$...$$) para impresión en papel */
function _textoPlano(texto) {
  return _esc(String(texto ?? '').replace(/\$\$([\s\S]*?)\$\$/g, '$1').replace(/\$([^$\n]*?)\$/g, '$1'));
}

const LETRAS = 'abcdefghijklmnopqrstuvwxyz';

function _htmlPregunta(pregunta, numero) {
  const puntaje = Number(pregunta.puntaje) || 0;
  let cuerpo = '';

  switch (pregunta.tipo) {
    case 'opcion_multiple': {
      const opciones = Array.isArray(pregunta.opciones)
        ? pregunta.opciones.map((o) => (typeof o === 'string' ? o : o?.texto || ''))
        : [];
      // NO se marca la respuesta correcta: la hoja es para resolver en papel
      cuerpo =
        '<div class="opciones">' +
        opciones
          .map((t, i) => `<div class="opcion"><span class="letra">${LETRAS[i] ? LETRAS[i] + ')' : '•'}</span> ${_textoPlano(t)}</div>`)
          .join('') +
        '</div>';
      break;
    }
    case 'verdadero_falso':
      cuerpo =
        '<div class="vf"><span class="circulo">V</span><span class="circulo">F</span>' +
        '<span class="ayuda">— encierre la opción correcta</span></div>';
      break;
    case 'ordenar': {
      const items = Array.isArray(pregunta.items) ? pregunta.items.length : 4;
      cuerpo =
        '<div class="orden">' +
        Array.from({ length: items }, (_, i) => `<div class="linea-num"><span class="num">${i + 1}.</span><span class="guion"></span></div>`).join('') +
        '</div>';
      break;
    }
    case 'emparejar': {
      const pares = Array.isArray(pregunta.pares) ? pregunta.pares : [];
      if (pares.length > 0) {
        // Dos listas SEPARADAS: A numerada con cajas, B barajada con letras.
        // Así el ejercicio exige relacionar de verdad (antes quedaban adyacentes).
        const derechos = pares.map((p, i) => ({ letra: LETRAS[i]?.toUpperCase() || '?', texto: p.derecha }));
        for (let i = derechos.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [derechos[i], derechos[j]] = [derechos[j], derechos[i]];
        }
        cuerpo =
          '<div class="emparejado">' +
          '<table class="emparejar"><tr><th>Columna A</th><th>Respuesta</th></tr>' +
          pares
            .map(
              (p, i) =>
                `<tr><td>${i + 1}. ${_textoPlano(p.izquierda)}</td><td class="caja"></td></tr>`
            )
            .join('') +
          '</table>' +
          '<table class="emparejar colb"><tr><th>Columna B</th></tr>' +
          derechos
            .map((d) => `<tr><td>${d.letra}) ${_textoPlano(d.texto)}</td></tr>`)
            .join('') +
          '</table>' +
          '<p class="ayuda">Escribe en la caja la letra de la Columna B que corresponde a cada elemento de la Columna A.</p>' +
          '</div>';
      }
      break;
    }
    case 'formula':
      cuerpo =
        '<div class="formula">' + _textoPlano(pregunta.formula) + '</div>' +
        '<div class="respuesta">' +
        Array.from({ length: 2 }, () => '<div class="linea"></div>').join('') +
        '</div>';
      break;
    default:
      // abierta / cualquier otro tipo: espacio con líneas
      cuerpo =
        '<div class="respuesta">' +
        Array.from({ length: 3 }, () => '<div class="linea"></div>').join('') +
        '</div>';
  }

  return (
    '<div class="pregunta">' +
    `<div class="enunciado"><span class="numero">${numero}.</span> ${_textoPlano(pregunta.enunciado)}` +
    `<span class="puntaje">${puntaje} pts</span>` +
    `<span class="tipo">${_esc(ETIQUETAS_TIPOS_PREGUNTA[pregunta.tipo] || '')}</span></div>` +
    cuerpo +
    '</div>'
  );
}

/**
 * Genera e imprime una hoja de examen en papel (formato A4 limpio, blanco y negro).
 * Se abre en ventana aparte con estilos propios: no depende del tema oscuro de la app.
 */
export function imprimirHojaExamen(examen, grado = '') {
  if (!examen) return;
  const preguntas = Array.isArray(examen.preguntas) ? examen.preguntas : [];
  if (preguntas.length === 0) return;

  const puntajeTotal =
    examen.configuracion?.puntajeTotal ||
    preguntas.reduce((s, p) => s + (Number(p.puntaje) || 0), 0);
  const duracion = examen.configuracion?.duracionMinutos || 60;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${_esc(examen.titulo)} — Hoja de examen</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #000; font-size: 12px; line-height: 1.45; }

  .encabezado { text-align: center; border-bottom: 2.5px solid #000; padding-bottom: 8px; margin-bottom: 10px; }
  .institucion { font-size: 11px; letter-spacing: 2.5px; text-transform: uppercase; }
  .titulo-examen { font-size: 17px; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
  .meta { font-size: 10.5px; margin-top: 3px; color: #222; }

  .datos-alumno { display: flex; gap: 18px; margin: 10px 0 4px; font-size: 11.5px; }
  .dato { flex: 1; border-bottom: 1px solid #000; padding-bottom: 2px; }
  .dato b { letter-spacing: 0.5px; }

  .instrucciones { border: 1.5px solid #000; padding: 7px 10px; margin: 10px 0 14px; font-size: 10.5px; }
  .instrucciones b { text-transform: uppercase; font-size: 9.5px; letter-spacing: 1px; }

  .pregunta { margin-bottom: 13px; page-break-inside: avoid; }
  .enunciado { font-weight: bold; margin-bottom: 6px; }
  .numero { display: inline-block; min-width: 20px; }
  .puntaje { float: right; font-size: 9.5px; font-weight: normal; border: 1px solid #000; border-radius: 8px; padding: 0 6px; }
  .tipo { display: block; clear: both; font-size: 8px; text-transform: uppercase; letter-spacing: 1.2px; color: #444; margin-top: 1px; }

  .opciones { margin-left: 22px; }
  .opcion { margin: 2.5px 0; }
  .letra { font-weight: bold; display: inline-block; min-width: 16px; }

  .vf { margin-left: 22px; display: flex; align-items: center; gap: 10px; }
  .circulo { width: 24px; height: 24px; border: 1.6px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; }
  .ayuda { font-size: 9.5px; font-style: italic; color: #444; }

  .respuesta { margin-left: 22px; }
  .linea { border-bottom: 1px solid #555; height: 22px; }
  .linea-num { display: flex; align-items: flex-end; margin: 0 0 14px 22px; }
  .num { font-weight: bold; width: 22px; }
  .guion { flex: 1; border-bottom: 1px solid #555; }

  .formula { margin: 6px 0 4px 22px; font-family: 'Times New Roman', serif; font-style: italic; font-size: 13px; }
  table.emparejar { margin-left: 22px; border-collapse: collapse; width: calc(100% - 22px); }
  .emparejado { display: flex; gap: 14px; margin-left: 0; flex-wrap: wrap; }
  .emparejado table.emparejar { margin-left: 22px; }
  .emparejado table.colb { width: auto; min-width: 45%; }
  table.emparejar th { font-size: 9.5px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1.5px solid #000; padding: 3px 6px; text-align: left; }
  table.emparejar td { padding: 6px 6px; vertical-align: middle; font-size: 11.5px; }
  td.caja { width: 34px; height: 24px; border: 1.4px solid #000; }

  .pie { margin-top: 22px; padding-top: 8px; border-top: 1px solid #000; display: flex; justify-content: space-between; font-size: 9.5px; color: #333; }

  .botones { position: fixed; top: 10px; right: 10px; display: flex; gap: 8px; }
  .botones button { font-family: Arial, sans-serif; font-size: 13px; padding: 8px 16px; cursor: pointer; border: 1px solid #888; background: #fff; border-radius: 6px; }
  @media print { .botones { display: none; } }
</style>
</head>
<body>
  <div class="botones">
    <button onclick="window.print()">Imprimir</button>
    <button onclick="window.close()">Cerrar</button>
  </div>

  <div class="encabezado">
    <div class="institucion">Instituto Nacional San Luis — INSAL</div>
    <div class="titulo-examen">${_textoPlano(examen.titulo)}</div>
    <div class="meta">
      ${_esc(grado ? 'Sección: ' + grado : '')}${grado && examen.materia ? ' · ' : ''}${_esc(examen.materia || '')}
      &nbsp;&nbsp;|&nbsp;&nbsp; Duración: ${duracion} minutos &nbsp;&nbsp;|&nbsp;&nbsp; Puntaje total: ${puntajeTotal} pts
    </div>
  </div>

  <div class="datos-alumno">
    <div class="dato"><b>Nombre:</b>&nbsp;</div>
    <div class="dato" style="max-width:130px"><b>NIE:</b>&nbsp;</div>
    <div class="dato" style="max-width:110px"><b>Fecha:</b>&nbsp;</div>
    <div class="dato" style="max-width:110px"><b>Sección:</b>&nbsp;</div>
  </div>

  ${examen.descripcion ? `<div style="font-style:italic; font-size:11px; margin:6px 0;">${_textoPlano(examen.descripcion)}</div>` : ''}

  <div class="instrucciones">
    <b>Instrucciones:</b> Resuelve todos los ejercicios con bolígrafo azul o negro.
    No se permiten celulares ni dispositivos electrónicos. Lee cada pregunta con
    atención antes de responder. Marca claramente tus respuestas.
  </div>

  ${preguntas.map((p, i) => _htmlPregunta(p, i + 1)).join('')}

  <div class="pie">
    <span>Asistencias y Evaluaciones INSAL</span>
    <span>Firma del estudiante: ______________________</span>
  </div>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  if (!ventana) {
    window.alert('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes e intenta de nuevo.');
    return;
  }
  ventana.document.write(html);
  ventana.document.close();
  ventana.focus();
}

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const ES_DESARROLLO = import.meta.env.DEV;

/**
 * Cliente API centralizado para la comunicación con Google Apps Script.
 * Los datos mock solo se usan en desarrollo (npm run dev). En producción,
 * un fallo del servidor NUNCA se simula como éxito: devolvería accesos
 * concedidos con credenciales falsas y escrituras fantasma.
 */
export async function llamarApi(action, payload = {}) {
  // 1. Sin URL configurada: solo permitido en desarrollo
  if (!APPS_SCRIPT_URL) {
    if (ES_DESARROLLO) return obtenerRespuestaMock(action, payload);
    return { ok: false, error: 'El servidor no está configurado. Contacta al administrador.' };
  }

  try {
    // AbortController: sin esto una conexión colgada deja los spinners eternos
    const controlador = new AbortController();
    const timeout = setTimeout(() => controlador.abort(), 30_000);

    const respuesta = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      // 'follow' permite seguir la redirección HTTP 302 de Google Script
      redirect: 'follow',
      // Usar text/plain evita que el navegador envíe una petición OPTIONS (CORS preflight)
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      signal: controlador.signal,
    });
    clearTimeout(timeout);

    if (!respuesta.ok) {
      if (ES_DESARROLLO) return obtenerRespuestaMock(action, payload);
      return { ok: false, error: 'Servidor no disponible. Intenta nuevamente en unos minutos.' };
    }

    // Intentar interpretar la respuesta como JSON
    const json = await respuesta.json();

    // Si Apps Script indica explícitamente usar mock / fallback (solo desarrollo)
    if (!json.ok && json.fallback) {
      if (ES_DESARROLLO) return obtenerRespuestaMock(action, payload);
      return { ok: false, error: json.error || 'El servicio reportó un problema.' };
    }

    return json;
  } catch (error) {
    console.warn(`[llamarApi] Fallo al contactar Apps Script para acción '${action}'.`, error);
    if (ES_DESARROLLO) return obtenerRespuestaMock(action, payload);
    return { ok: false, error: 'Sin conexión con el servidor. Verifica tu internet e intenta de nuevo.' };
  }
}

function obtenerRespuestaMock(action, payload) {
  const hoyISO = new Date().toLocaleDateString('sv-SE');
  const nie = payload.nie || '20231045';
  const grado = payload.grado || '2A';

  switch (action) {
    case 'validarClaveAdmin':
      return { ok: true, mensaje: 'Acceso de administrador concedido (Demo Mode)' };

    case 'verificarNie':
      return {
        ok: true,
        data: {
          nie,
          nombres: payload.nie ? 'Carlos Eduardo' : 'Ana María',
          apellidos: payload.nie ? 'Pérez Gómez' : 'Martínez López',
          grado,
          sexo: 'M',
          fotoUrl: '',
          descripcion: 'Estudiante destacado 2026',
        },
      };

    case 'marcarAlumno':
      return {
        ok: true,
        mensaje: 'Asistencia registrada con éxito en el servidor.',
        data: {
          nie,
          fecha: hoyISO,
          hora: new Date().toISOString(),
          dispositivo: payload.dispositivo || 'Chrome en Windows (Escritorio)',
        },
      };

    case 'loginAsistente':
      return { ok: true, mensaje: 'Acceso de asistente seccional concedido' };

    case 'crearClaveAsistente':
      return { ok: true, mensaje: 'Clave creada para la sección' };

    case 'recuperarClaveAsistente':
      return { ok: true, mensaje: 'Contraseña actualizada' };

    case 'estadoClave':
      return { ok: true, data: { tieneClave: false, tienePregunta: true, pregunta: '¿Nombre de tu primera mascota?' } };

    case 'calcularRacha':
      return {
        ok: true,
        data: {
          rachaActual: 14,
          mejorRacha: 22,
          asistenciasMes: 48,
          diasConsultados: 30,
        },
      };

    case 'calcularLogros':
      return {
        ok: true,
        data: {
          porcentaje: 96,
          totalLaborales: 20,
          asistenciasMes: 19,
          esMesPerfecto: false,
          logros: [
            { id: 'estrella-plata', nombre: 'Destacado', descripcion: '10 días seguidos', icono: 'star', color: 'plata', nivel: 2 },
            { id: 'racha-activa', nombre: '¡Vamos!', descripcion: '14 días seguidos y contando', icono: 'fire', color: 'fuego', nivel: 0 },
            { id: 'porcentaje-80', nombre: 'Constancia', descripcion: '96% de asistencia este mes', icono: 'medal', color: 'plata', nivel: 0 },
          ],
        },
      };

    case 'topRachas':
      return {
        ok: true,
        data: {
          top: [
            { nie: '20231001', nombres: 'Sofía', apellidos: 'Alvarado', fotoUrl: '', descripcion: '', rachaActual: 20, mejorRacha: 20, asistenciasMes: 18 },
            { nie: '20231045', nombres: 'Carlos', apellidos: 'Pérez', fotoUrl: '', descripcion: '', rachaActual: 14, mejorRacha: 22, asistenciasMes: 19 },
            { nie: '20231012', nombres: 'Diego', apellidos: 'Ramírez', fotoUrl: '', descripcion: '', rachaActual: 12, mejorRacha: 12, asistenciasMes: 15 },
          ],
          posicion: 2,
          total: 32,
          mejorRachaGlobal: 22,
        },
      };

    case 'primerosMarcajes':
      return {
        ok: true,
        data: {
          primeros: [
            { nie: '20231001', nombres: 'Sofía', apellidos: 'Alvarado', hora: new Date().toISOString(), fotoUrl: '', descripcion: '¡Listo para aprender!' },
            { nie: '20231045', nombres: 'Carlos', apellidos: 'Pérez', hora: new Date().toISOString(), fotoUrl: '', descripcion: 'Presente' },
          ],
          propios: { posicion: 2, total: 32 },
        },
      };

    case 'listarMaterias':
      return {
        ok: true,
        data: {
          matematica: 'Matemática',
          lenguaje: 'Lenguaje y Literatura',
          ciencias: 'Ciencias Naturales',
          sociales: 'Estudios Sociales',
          ingles: 'Inglés',
          informatica: 'Informática',
          artes: 'Artes',
          'educacion-fisica': 'Educación Física',
        },
      };

    default:
      return { ok: true, mensaje: 'Operación ejecutada con éxito (Modo Demo)', data: {} };
  }
}
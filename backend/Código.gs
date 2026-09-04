/**
 * INSAL ASISTENCIA — API REST (Google Apps Script + Firebase Realtime DB)
 *
 * Despliegue:
 *   1) Extensiones > Apps Script en una Hoja de cálculo (o proyecto standalone)
 *   2) Pegar este archivo como Código.gs
 *   3) Configurar Propiedades del script (Project Settings > Script Properties):
 *        FIREBASE_URL    -> https://TU-PROYECTO-default-rtdb.firebaseio.com
 *        FIREBASE_SECRET -> el "Secret" del proyecto (Database Secrets, legacy)
 *        CLAVE_ADMIN     -> clave global del panel de administración
 *   4) Implementar > Nueva implementación > Aplicación web
 *       - Ejecutar como: Yo
 *       - Quién tiene acceso: Cualquier usuario
 *   5) Copiar la URL /exec resultante y usarla como VITE_APPS_SCRIPT_URL
 */

function _pruebaEnvioCorreo() {
  const destino = Session.getActiveUser().getEmail();
  MailApp.sendEmail(destino, 'Prueba INSAL Asistencia', 'Si recibes esto, el envío de correos funciona correctamente.');
  Logger.log('Correo de prueba enviado a: ' + destino);
  Logger.log('Cuota diaria restante: ' + MailApp.getRemainingDailyQuota());
}

function _config() {
  const props = PropertiesService.getScriptProperties();
  return {
    dbUrl: props.getProperty('FIREBASE_URL'),
    secret: props.getProperty('FIREBASE_SECRET'),
    claveAdmin: props.getProperty('CLAVE_ADMIN')
  };
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return _json({ ok: false, error: 'JSON de entrada inválido.' });
  }

  const action = body.action;
  try {
    switch (action) {
      case 'registrarEstudiante': return _json(registrarEstudiante(body));
      case 'verificarNie':        return _json(verificarNie(body));
      case 'marcarAlumno':        return _json(marcarAlumno(body));
      case 'loginAsistente':      return _json(loginAsistente(body));
      case 'generarOtp':          return _json(generarOtp(body));
      case 'auditarManual':       return _json(auditarManual(body));
      case 'congelarReporte':     return _json(congelarReporte(body));
      case 'editarEstudiante':    return _json(editarEstudiante(body));
      case 'eliminarEstudiante':  return _json(eliminarEstudiante(body));
      case 'asignarClaveAsistente': return _json(asignarClaveAsistente(body));
      case 'crearClaveAsistente': return _json(crearClaveAsistente(body));
      case 'recuperarClaveAsistente': return _json(recuperarClaveAsistente(body));
      case 'estadoClave': return _json(estadoClave(body));
      case 'validarClaveAdmin':  return _json(validarClaveAdminAccion(body));
      case 'enviarCorreoEncargados': return _json(enviarCorreoEncargados(body));
      case 'reabrirAsistencia': return _json(reabrirAsistencia(body));
      case 'crearSeccion':        return _json(crearSeccion(body));
      case 'eliminarSeccion':     return _json(eliminarSeccion(body));
      case 'listarSecciones':     return _json(listarSecciones(body));
      case 'asignarDocenteSeccion': return _json(asignarDocenteSeccion(body));
      case 'quitarDocenteSeccion': return _json(quitarDocenteSeccion(body));
      case 'listarMaterias': return _json(listarMaterias(body));
      case 'crearMateria': return _json(crearMateria(body));
      case 'eliminarMateria': return _json(eliminarMateria(body));
      case 'editarPerfilEstudiante': return _json(editarPerfilEstudiante(body));
      case 'calcularRacha':       return _json(calcularRacha(body));
      case 'calcularRachas':      return _json(calcularRachas(body));
      case 'calcularLogros':      return _json(calcularLogros(body));
      case 'loginPerfil':         return _json(loginPerfil(body));
      case 'primerosMarcajes':    return _json(primerosMarcajes(body));
       case 'topRachas':           return _json(topRachas(body));
      case 'guardarExamen': return _json(guardarExamen(body));
      case 'publicarExamen': return _json(publicarExamen(body));
      case 'eliminarExamen': return _json(eliminarExamen(body));
      case 'duplicarExamen': return _json(duplicarExamen(body));
      case 'obtenerExamen': return _json(obtenerExamen(body));
      case 'listarExamenes': return _json(listarExamenes(body));
      case 'iniciarExamen': return _json(iniciarExamen(body));
      case 'guardarRespuesta': return _json(guardarRespuesta(body));
      case 'finalizarExamen': return _json(finalizarExamen(body));
      case 'obtenerRespuestasExamen': return _json(obtenerRespuestasExamen(body));
      case 'registrarEventoProctoring': return _json(registrarEventoProctoring(body));
      case 'validarAsistenciaExamen': return _json(validarAsistenciaExamen(body));
      case 'reiniciarTiempoExamen': return _json(reiniciarTiempoExamen(body));
      default:
        return _json({ ok: false, error: 'Acción no reconocida: ' + action });
    }
  } catch (err) {
    return _json({ ok: false, error: 'Error interno: ' + err.message });
  }
}

function doGet(e) {
  return _json({ ok: true, servicio: 'INSAL Asistencia API', estado: 'activo' });
}

function _fbUrl(path) {
  const cfg = _config();
  if (!cfg.dbUrl) throw new Error('FIREBASE_URL no configurado en Script Properties.');
  const sep = cfg.secret ? ('?auth=' + cfg.secret) : '';
  return cfg.dbUrl.replace(/\/$/, '') + '/' + path + '.json' + sep;
}

function _fbGet(path) {
  const res = UrlFetchApp.fetch(_fbUrl(path), { muteHttpExceptions: true });
  return JSON.parse(res.getContentText() || 'null');
}

function _fbPut(path, data) {
  const res = UrlFetchApp.fetch(_fbUrl(path), {
    method: 'put',
    contentType: 'application/json',
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText() || 'null');
}

function _fbPatch(path, data) {
  const res = UrlFetchApp.fetch(_fbUrl(path), {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  });
  return JSON.parse(res.getContentText() || 'null');
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function _fbDelete(path) {
  const res = UrlFetchApp.fetch(_fbUrl(path), { method: 'delete', muteHttpExceptions: true });
  return JSON.parse(res.getContentText() || 'null');
}

function _hoy() {
  return Utilities.formatDate(new Date(), 'America/El_Salvador', 'yyyy-MM-dd');
}

function _validarClaveAdmin(claveAdmin) {
  const cfg = _config();
  return !!cfg.claveAdmin && String(claveAdmin) === String(cfg.claveAdmin);
}

function _mayus(texto) {
  return texto ? String(texto).trim().toUpperCase() : '';
}

function _fechaDDMMAAAA(fechaISO) {
  const partes = String(fechaISO).split('-');
  if (partes.length !== 3) return fechaISO;
  return partes[2] + '-' + partes[1] + '-' + partes[0];
}

function _estadoLargo(estado) {
  if (estado === 'P') return 'PRESENTE';
  if (estado === 'A') return 'FALTA';
  if (estado === 'M') return 'PERMISO';
  return 'SIN REGISTRO';
}

function _sanitizarNodo(texto) {
  if (!texto) return '';
  return String(texto)
    .replace(/[".#$\[\]\/°]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _validarNieFormato(nie) {
  return /^[0-9]{7,9}$/.test(String(nie || ''));
}

function _validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

// Normaliza un email a clave de nodo Firebase (los '.' no se permiten en llaves)
function _emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/\./g, '~');
}

// Nombre legible de una materia (config/materias/<id>)
function _materiaNombre(materiaId) {
  if (!materiaId) return '';
  return String(_fbGet('config/materias/' + materiaId) || materiaId);
}

// Indica si un docente está inscrito en un grado (config/docentes/<grado>/<email>)
function _docenteAutorizado(grado, email) {
  if (!grado || !email) return false;
  return !!_fbGet('config/docentes/' + grado + '/' + _emailKey(email));
}

// Indica si un docente imparte una materia en un grado
function _docenteImparteMateria(grado, email, materiaId) {
  if (!grado || !email || !materiaId) return false;
  const reg = _fbGet('config/docentes/' + grado + '/' + _emailKey(email));
  if (!reg) return false;
  const ms = reg.materias;
  if (Array.isArray(ms)) return ms.indexOf(materiaId) !== -1;
  if (ms && typeof ms === 'object') return !!ms[materiaId];
  return false;
}

// Registro de asistencia de un alumno en una fecha, considerando el modelo
// legacy (asistencia/<fecha>/<grado>/<nie>) y el nuevo por materia
// (asistencia/<fecha>/<grado>/<materia>/<nie>). Prioriza PRESENTE.
function _registroDia(grado, nie, fechaStr) {
  if (!grado || !nie || !fechaStr) return null;
  const nodo = _fbGet('asistencia/' + fechaStr + '/' + grado) || {};
  const directo = nodo[nie];
  if (directo && ['P', 'A', 'M'].indexOf(directo.estado) !== -1) return directo;
  let mejor = null;
  for (const k in nodo) {
    if (k === nie) continue;
    const r = nodo[k] && nodo[k][nie];
    if (r && r.estado === 'P') return r;
    if (r && ['P', 'A', 'M'].indexOf(r.estado) !== -1 && !mejor) mejor = r;
  }
  return mejor;
}

function registrarEstudiante(body) {
  const d = body.data || {};
  const requeridos = ['nie', 'apellidos', 'nombres', 'grado', 'sexo', 'fechaNacimiento', 'emailEncargado'];
  for (const campo of requeridos) {
    if (!d[campo] || String(d[campo]).trim() === '') {
      return { ok: false, error: 'Falta el campo requerido: ' + campo };
    }
  }
  if (!_validarNieFormato(d.nie)) {
    return { ok: false, error: 'NIE inválido: debe tener entre 7 y 9 dígitos numéricos.' };
  }
  if (!_validarEmail(d.emailEncargado)) {
    return { ok: false, error: 'Correo del encargado inválido.' };
  }

  const gradoLimpio = _sanitizarNodo(d.grado);

  const existente = _fbGet('estudiantes/' + gradoLimpio + '/' + d.nie);
  if (existente) {
    return { ok: false, error: 'Ya existe un estudiante registrado con ese NIE en ese grado.' };
  }

  const registro = {
    nie: String(d.nie),
    apellidos: _mayus(d.apellidos),
    nombres: _mayus(d.nombres),
    grado: gradoLimpio,
    sexo: d.sexo === 'F' ? 'F' : 'M',
    fechaNacimiento: String(d.fechaNacimiento),
    emailEncargado: String(d.emailEncargado).trim().toLowerCase(),
    fotoUrl: d.fotoUrl || '',
    fechaRegistro: new Date().toISOString()
  };

  _fbPut('estudiantes/' + gradoLimpio + '/' + d.nie, registro);
  return { ok: true, mensaje: 'Estudiante registrado correctamente.', data: registro };
}

function verificarNie(body) {
  const nie = body.nie;
  const grado = _sanitizarNodo(body.grado);
  if (!_validarNieFormato(nie)) {
    return { ok: false, error: 'Formato de NIE inválido.' };
  }

  if (grado) {
    const alumno = _fbGet('estudiantes/' + grado + '/' + nie);
    if (alumno) return { ok: true, data: alumno };
    return { ok: false, error: 'No se encontró un alumno con ese NIE en el grado indicado.' };
  }

  const todos = _fbGet('estudiantes') || {};
  for (const g in todos) {
    if (todos[g] && todos[g][nie]) {
      return { ok: true, data: todos[g][nie] };
    }
  }
  return { ok: false, error: 'NIE no encontrado en ningún grado.' };
}

function marcarAlumno(body) {
  const { nie, otp } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!otp) return { ok: false, error: 'Falta el código OTP.' };

  const fecha = _hoy();

  const alumno = _fbGet('estudiantes/' + grado + '/' + nie);
  if (!alumno) return { ok: false, error: 'Alumno no encontrado en este grado.' };

  const codigos = _fbGet('codigos_diarios/' + fecha + '/' + grado) || {};
  let materiaId = null;
  for (const m in codigos) {
    if (codigos[m] && String(otp).trim() === String(codigos[m].codigo).trim()) {
      materiaId = m;
      break;
    }
  }
  if (!materiaId) {
    return { ok: false, error: 'Código OTP incorrecto o no vigente para hoy.' };
  }

  if (_fbGet('config/congelado/' + fecha + '/' + grado + '/' + materiaId)) {
    return { ok: false, error: 'La asistencia de esta materia hoy ya fue cerrada.' };
  }

  const yaMarcado = _fbGet('asistencia/' + fecha + '/' + grado + '/' + materiaId + '/' + nie);
  if (yaMarcado && yaMarcado.estado === 'P') {
    return { ok: false, error: 'Ya marcaste tu asistencia en esta materia hoy.' };
  }

  const registro = {
    estado: 'P',
    hora: new Date().toISOString(),
    origen: 'auto',
    materiaId: materiaId,
    dispositivo: body.dispositivo || '',
    navegador: body.navegador || '',
    os: body.os || '',
    tipoDispositivo: body.tipoDispositivo || '',
    horaConexion: body.horaConexion || '',
  };
  _fbPut('asistencia/' + fecha + '/' + grado + '/' + materiaId + '/' + nie, registro);

  return { ok: true, mensaje: '¡Asistencia registrada!', data: { alumno: alumno, registro: registro, materiaId: materiaId } };
}

function loginAsistente(body) {
  const grado = _sanitizarNodo(body.grado);
  const clave = body.clave;
  if (!grado || !clave) return { ok: false, error: 'Grado y clave son requeridos.' };

  const claveGuardada = _fbGet('claves/' + grado);
  if (!claveGuardada) {
    return { ok: false, error: 'Esta sección aún no tiene clave. Créala con "¿No tienes clave?" para poder ingresar.', sinClave: true };
  }
  if (String(claveGuardada) !== String(clave)) {
    return { ok: false, error: 'Clave incorrecta para ' + grado + '.' };
  }
  return { ok: true, mensaje: 'Acceso concedido.', data: { grado: grado } };
}

function generarOtp(body) {
  const { clave, claveAdmin, generadoPor, docenteEmail, materia } = body;
  const grado = _sanitizarNodo(body.grado);
  const materiaId = _sanitizarNodo(materia);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!materiaId) return { ok: false, error: 'Falta la materia.' };

  if (claveAdmin) {
    if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  } else if (clave) {
    const claveGuardada = _fbGet('claves/' + grado);
    if (!claveGuardada || String(claveGuardada) !== String(clave)) {
      return { ok: false, error: 'Clave seccional incorrecta.' };
    }
  } else if (docenteEmail) {
    if (!_docenteAutorizado(grado, docenteEmail)) {
      return { ok: false, error: 'Este docente no está inscrito en la sección ' + grado + '.' };
    }
    if (!_docenteImparteMateria(grado, docenteEmail, materiaId)) {
      return { ok: false, error: 'Este docente no imparte la materia "' + _materiaNombre(materiaId) + '" en ' + grado + '.' };
    }
  } else {
    return { ok: false, error: 'Se requiere clave seccional, de administrador o un docente autorizado.' };
  }

  const fecha = _hoy();
  const congelado = _fbGet('config/congelado/' + fecha + '/' + grado + '/' + materiaId);
  if (congelado) return { ok: false, error: 'La asistencia de esta materia hoy ya fue guardada/cerrada para ' + grado + '.' };

  const codigo = String(Math.floor(10000 + Math.random() * 90000));
  _fbPut('codigos_diarios/' + fecha + '/' + grado + '/' + materiaId, {
    codigo: codigo,
    generadoPor: _mayus(generadoPor),
    materiaId: materiaId,
    materia: _materiaNombre(materiaId)
  });

  return {
    ok: true,
    mensaje: 'Código generado.',
    data: { codigo: codigo, fecha: fecha, materiaId: materiaId }
  };
}

function auditarManual(body) {
  const { nie, estado, motivo, clave, claveAdmin, validadoPor, materia, docenteEmail } = body;
  const grado = _sanitizarNodo(body.grado);
  const materiaId = _sanitizarNodo(materia);
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!materiaId) return { ok: false, error: 'Falta la materia.' };
  if (['P', 'A', 'M'].indexOf(estado) === -1) {
    return { ok: false, error: 'Estado inválido. Use P, A o M.' };
  }
  if (estado === 'M' && (!motivo || String(motivo).trim() === '')) {
    return { ok: false, error: 'El permiso (M) requiere un motivo.' };
  }
  if (!validadoPor || String(validadoPor).trim() === '') {
    return { ok: false, error: 'Debes indicar el nombre de quien corrige/valida.' };
  }

  if (claveAdmin) {
    if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  } else if (clave) {
    const claveGuardada = _fbGet('claves/' + grado);
    if (!claveGuardada || String(claveGuardada) !== String(clave)) {
      return { ok: false, error: 'Clave seccional incorrecta.' };
    }
  } else if (docenteEmail) {
    if (!_docenteAutorizado(grado, docenteEmail)) {
      return { ok: false, error: 'El docente no está inscrito en esta sección.' };
    }
    if (!_docenteImparteMateria(grado, docenteEmail, materiaId)) {
      return { ok: false, error: 'El docente no imparte esta materia en la sección.' };
    }
  } else {
    return { ok: false, error: 'Se requiere clave seccional, de administrador o email de docente.' };
  }

  const fecha = _hoy();
  const congelado = _fbGet('config/congelado/' + fecha + '/' + grado + '/' + materiaId);
  if (congelado && !claveAdmin) {
    return { ok: false, error: 'La asistencia de esta materia hoy ya fue cerrada. Solo el administrador puede corregirla ahora.' };
  }

  const registro = {
    estado: estado,
    hora: new Date().toISOString(),
    origen: 'manual',
    validadoPor: _mayus(validadoPor),
    materiaId: materiaId
  };
  if (estado === 'M') registro.motivo = _mayus(motivo);

  _fbPut('asistencia/' + fecha + '/' + grado + '/' + materiaId + '/' + nie, registro);
  return { ok: true, mensaje: 'Estado actualizado manualmente.', data: registro };
}

function editarEstudiante(body) {
  const { nieOriginal, claveAdmin, data } = body;
  const gradoOriginal = _sanitizarNodo(body.gradoOriginal);
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!_validarNieFormato(nieOriginal) || !gradoOriginal) {
    return { ok: false, error: 'Datos originales del alumno inválidos.' };
  }

  const existente = _fbGet('estudiantes/' + gradoOriginal + '/' + nieOriginal);
  if (!existente) return { ok: false, error: 'No se encontró el alumno a editar.' };

  const d = data || {};
  const nieNuevo = d.nie ? String(d.nie) : nieOriginal;
  const gradoNuevo = d.grado ? _sanitizarNodo(d.grado) : gradoOriginal;

  if (nieNuevo !== nieOriginal && !_validarNieFormato(nieNuevo)) {
    return { ok: false, error: 'El nuevo NIE no es válido.' };
  }
  if (d.emailEncargado && !_validarEmail(d.emailEncargado)) {
    return { ok: false, error: 'Correo del encargado inválido.' };
  }

  const actualizado = Object.assign({}, existente, {
    apellidos: d.apellidos ? _mayus(d.apellidos) : existente.apellidos,
    nombres: d.nombres ? _mayus(d.nombres) : existente.nombres,
    sexo: (d.sexo === 'F' || d.sexo === 'M') ? d.sexo : existente.sexo,
    fechaNacimiento: d.fechaNacimiento || existente.fechaNacimiento,
    emailEncargado: d.emailEncargado ? String(d.emailEncargado).trim().toLowerCase() : existente.emailEncargado,
    fotoUrl: d.fotoUrl || existente.fotoUrl,
    descripcion: d.descripcion !== undefined ? _sanitizarNodo(d.descripcion) : (existente.descripcion || ''),
    nie: nieNuevo,
    grado: gradoNuevo
  });

  const seMueve = (nieNuevo !== nieOriginal) || (gradoNuevo !== gradoOriginal);
  if (seMueve) {
    const destinoExistente = _fbGet('estudiantes/' + gradoNuevo + '/' + nieNuevo);
    if (destinoExistente) return { ok: false, error: 'Ya existe un alumno con ese NIE en el grado destino.' };
    _fbDelete('estudiantes/' + gradoOriginal + '/' + nieOriginal);
  }
  _fbPut('estudiantes/' + gradoNuevo + '/' + nieNuevo, actualizado);

  return { ok: true, mensaje: 'Alumno actualizado correctamente.', data: actualizado };
}

function eliminarEstudiante(body) {
  const { nie, claveAdmin } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!_validarNieFormato(nie) || !grado) return { ok: false, error: 'Datos inválidos.' };

  const existente = _fbGet('estudiantes/' + grado + '/' + nie);
  if (!existente) return { ok: false, error: 'No se encontró el alumno.' };

  _fbDelete('estudiantes/' + grado + '/' + nie);
  return { ok: true, mensaje: 'Alumno eliminado de ' + grado + '.' };
}

function asignarClaveAsistente(body) {
  const { claveNueva, claveAdmin } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!claveNueva || String(claveNueva).trim().length < 4) {
    return { ok: false, error: 'La nueva clave debe tener al menos 4 caracteres.' };
  }

  _fbPut('claves/' + grado, String(claveNueva).trim());
  return { ok: true, mensaje: 'Clave del asistente de ' + grado + ' actualizada.' };
}

// Autoservicio: el asistente crea la clave de su sección si aún no existe.
function crearClaveAsistente(body) {
  const { claveNueva, creadoPor, pregunta, respuesta } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!claveNueva || String(claveNueva).trim().length < 4) {
    return { ok: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
  }
  const existente = _fbGet('claves/' + grado);
  if (existente) {
    return { ok: false, error: 'Esta sección ya tiene clave. Si la olvidaste, usa "¿Olvidé mi contraseña?" o pídesela al administrador.' };
  }
  if (!pregunta || String(pregunta).trim() === '' || !respuesta || String(respuesta).trim() === '') {
    return { ok: false, error: 'Configura la pregunta secreta y su respuesta para poder recuperar la contraseña.' };
  }

  _fbPut('claves/' + grado, String(claveNueva).trim());
  _fbPut('config/claves_meta/' + grado, {
    pregunta: _mayus(pregunta),
    respuesta: _mayus(respuesta)
  });
  return { ok: true, mensaje: 'Clave creada para ' + grado + '. Guarda bien tu pregunta secreta.' };
}

// Autoservicio: recupera la clave respondiendo la pregunta secreta.
function recuperarClaveAsistente(body) {
  const { respuesta, claveNueva } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!claveNueva || String(claveNueva).trim().length < 4) {
    return { ok: false, error: 'La nueva contraseña debe tener al menos 4 caracteres.' };
  }
  const meta = _fbGet('config/claves_meta/' + grado);
  if (!meta || !meta.pregunta || !meta.respuesta) {
    return { ok: false, error: 'Esta sección no configuró pregunta secreta. Pídele al administrador que cambie la clave.' };
  }
  if (!respuesta || _mayus(respuesta) !== meta.respuesta) {
    return { ok: false, error: 'La respuesta a la pregunta secreta es incorrecta.' };
  }

  _fbPut('claves/' + grado, String(claveNueva).trim());
  return { ok: true, mensaje: 'Contraseña de ' + grado + ' actualizada. Ya puedes ingresar con la nueva.' };
}

// Consulta pública: indica si la sección tiene clave y pregunta secreta configurada.
function estadoClave(body) {
  const grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  const meta = _fbGet('config/claves_meta/' + grado);
  return {
    ok: true,
    data: {
      tieneClave: !!_fbGet('claves/' + grado),
      tienePregunta: !!(meta && meta.pregunta),
      pregunta: meta && meta.pregunta ? meta.pregunta : ''
    }
  };
}

function validarClaveAdminAccion(body) {
  if (!_validarClaveAdmin(body.claveAdmin)) {
    return { ok: false, error: 'Clave de administrador incorrecta.' };
  }
  return { ok: true, mensaje: 'Acceso concedido.' };
}

function enviarCorreoEncargados(body) {
  const { fecha, claveAdmin, materia } = body;
  const grado = _sanitizarNodo(body.grado);
  const materiaId = _sanitizarNodo(materia);
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!materiaId) return { ok: false, error: 'Falta la materia.' };

  const f = fecha || _hoy();
  const fechaTexto = _fechaDDMMAAAA(f);
  const materiaNombre = _materiaNombre(materiaId);
  const alumnos = _fbGet('estudiantes/' + grado) || {};
  const asistenciaDelDia = _fbGet('asistencia/' + f + '/' + grado + '/' + materiaId) || {};

  let enviados = 0;
  let sinCorreo = 0;
  const fallidos = [];

  for (const nieAlumno in alumnos) {
    const al = alumnos[nieAlumno];
    if (!al.emailEncargado || !_validarEmail(al.emailEncargado)) { sinCorreo++; continue; }

    const r = asistenciaDelDia[nieAlumno];
    const estadoTexto = _estadoLargo(r ? r.estado : null);
    const asunto = 'Asistencia INSAL - ' + grado + ' (' + materiaNombre + ') - ' + fechaTexto;
    let cuerpo = 'Estimado(a) encargado(a) de ' + al.nombres + ' ' + al.apellidos + ':\n\n'
      + 'Le informamos que el día ' + fechaTexto + ' el estado de asistencia registrado fue: ' + estadoTexto + '.\n';
    if (r && r.estado === 'M' && r.motivo) {
      cuerpo += 'Motivo del permiso: ' + r.motivo + '\n';
    }
    cuerpo += '\nInstituto Nacional San Luis — INSAL Asistencia';

    try {
      MailApp.sendEmail(al.emailEncargado, asunto, cuerpo);
      enviados++;
    } catch (err) {
      fallidos.push(al.apellidos + ' ' + al.nombres + ' (' + al.emailEncargado + '): ' + err.message);
    }
  }

  return {
    ok: true,
    mensaje: 'Correos enviados: ' + enviados + '. Sin correo registrado: ' + sinCorreo
      + (fallidos.length ? '. Fallidos (' + fallidos.length + '): ' + fallidos.join(' | ') : '') + '.',
    data: { enviados: enviados, sinCorreo: sinCorreo, fallidos: fallidos }
  };
}

function reabrirAsistencia(body) {
  const { fecha, claveAdmin, docenteEmail, materia } = body;
  const grado = _sanitizarNodo(body.grado);
  const materiaId = _sanitizarNodo(materia);

  // Permitir admin (clave) O docente autorizado (email)
  let autorizado = false;
  if (claveAdmin && _validarClaveAdmin(claveAdmin)) {
    autorizado = true;
  } else if (docenteEmail) {
    if (_docenteAutorizado(grado, docenteEmail)) {
      autorizado = true;
    }
  }
  if (!autorizado) return { ok: false, error: 'No tienes permiso para reabrir la asistencia.' };

  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!materiaId) return { ok: false, error: 'Falta la materia.' };

  const f = fecha || _hoy();
  _fbDelete('config/congelado/' + f + '/' + grado + '/' + materiaId);
  return { ok: true, mensaje: 'Asistencia de ' + grado + ' (' + _materiaNombre(materiaId) + ') reabierta para ' + f + '. Ya se puede generar un nuevo código.' };
}

function congelarReporte(body) {
  const { claveAdmin, clave, fecha, cerradoPor, docenteEmail, materia } = body;
  const grado = _sanitizarNodo(body.grado);
  const materiaId = _sanitizarNodo(materia);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!materiaId) return { ok: false, error: 'Falta la materia.' };

  if (claveAdmin) {
    if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  } else if (clave) {
    const claveGuardada = _fbGet('claves/' + grado);
    if (!claveGuardada || String(claveGuardada) !== String(clave)) {
      return { ok: false, error: 'Clave seccional incorrecta.' };
    }
  } else if (docenteEmail) {
    if (!_docenteAutorizado(grado, docenteEmail)) {
      return { ok: false, error: 'Este docente no está inscrito en la sección ' + grado + '.' };
    }
    if (!_docenteImparteMateria(grado, docenteEmail, materiaId)) {
      return { ok: false, error: 'Este docente no imparte la materia "' + _materiaNombre(materiaId) + '" en ' + grado + '.' };
    }
  } else {
    return { ok: false, error: 'Se requiere clave seccional, de administrador o un docente autorizado.' };
  }

  const f = fecha || _hoy();
  const materiaNombre = _materiaNombre(materiaId);

  const alumnos = _fbGet('estudiantes/' + grado) || {};
  const asistenciaDelDia = _fbGet('asistencia/' + f + '/' + grado + '/' + materiaId) || {};
  const pendientes = [];
  for (const nieAlumno in alumnos) {
    const registro = asistenciaDelDia[nieAlumno];
    if (!registro || ['P', 'A', 'M'].indexOf(registro.estado) === -1) {
      const al = alumnos[nieAlumno];
      pendientes.push(al.apellidos + ', ' + al.nombres);
    }
  }
  if (pendientes.length > 0) {
    return {
      ok: false,
      error: 'Todavía faltan ' + pendientes.length + ' alumno(s) sin marcar: ' + pendientes.join(' · '),
      data: { pendientes: pendientes }
    };
  }

  _fbPut('config/congelado/' + f + '/' + grado + '/' + materiaId, {
    cerrado: true,
    cerradoEn: new Date().toISOString(),
    cerradoPor: _mayus(cerradoPor),
    materiaId: materiaId,
    materia: materiaNombre
  });
  return { ok: true, mensaje: 'Asistencia de ' + grado + ' (' + materiaNombre + ') guardada para ' + f + '. El código de esa materia ya no es válido.' };
}

function crearSeccion(body) {
  const { id, label, claveAdmin } = body;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };

  const idLimpio = _sanitizarNodo(id);
  const labelLimpio = _sanitizarNodo(label);

  if (!idLimpio) return { ok: false, error: 'El ID de la sección es requerido.' };
  if (!labelLimpio) return { ok: false, error: 'El nombre/label de la sección es requerido.' };
  if (idLimpio.length > 10) return { ok: false, error: 'El ID no debe tener más de 10 caracteres.' };
  if (!/^[A-Za-z0-9]+$/.test(idLimpio)) return { ok: false, error: 'El ID solo puede contener letras y números (sin espacios ni caracteres especiales).' };

  const existente = _fbGet('config/secciones/' + idLimpio);
  if (existente) return { ok: false, error: 'Ya existe una sección con el ID "' + idLimpio + '".' };

  _fbPut('config/secciones/' + idLimpio, labelLimpio.toUpperCase());
  return { ok: true, mensaje: 'Sección "' + labelLimpio + '" creada correctamente.', data: { id: idLimpio, label: labelLimpio.toUpperCase() } };
}

function eliminarSeccion(body) {
  const { id, claveAdmin } = body;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };

  const idLimpio = _sanitizarNodo(id);
  if (!idLimpio) return { ok: false, error: 'El ID de la sección es requerido.' };

  const existente = _fbGet('config/secciones/' + idLimpio);
  if (!existente) return { ok: false, error: 'No se encontró la sección con ID "' + idLimpio + '".' };

  _fbDelete('config/secciones/' + idLimpio);
  _fbDelete('claves/' + idLimpio);

  return { ok: true, mensaje: 'Sección "' + idLimpio + '" eliminada correctamente.' };
}

function listarSecciones(body) {
  const secciones = _fbGet('config/secciones') || {};

  if (Object.keys(secciones).length === 0) {
    const porDefecto = {
      '1GB': '1 GENERAL B',
      '2GC': '2 GENERAL C',
      '2GD': '2 GENERAL D',
      '1DGA': '1 DISEÑO GRÁFICO A',
      '3LYA': '3 LOGISTICA Y ADUANAS A'
    };
    _fbPut('config/secciones', porDefecto);
    return { ok: true, data: porDefecto };
  }

  return { ok: true, data: secciones };
}

function listarMaterias(body) {
  const materias = _fbGet('config/materias') || {};

  if (Object.keys(materias).length === 0) {
    const porDefecto = {
      'matematica': 'Matemática',
      'lenguaje': 'Lenguaje y Literatura',
      'ciencias': 'Ciencias Naturales',
      'sociales': 'Estudios Sociales',
      'ingles': 'Inglés',
      'informatica': 'Informática',
      'artes': 'Artes',
      'educacion-fisica': 'Educación Física'
    };
    _fbPut('config/materias', porDefecto);
    return { ok: true, data: porDefecto };
  }

  return { ok: true, data: materias };
}

function crearMateria(body) {
  const { id, nombre, claveAdmin } = body;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };

  const idLimpio = _sanitizarNodo(id);
  const nombreLimpio = _sanitizarNodo(nombre);
  if (!idLimpio) return { ok: false, error: 'El ID de la materia es requerido.' };
  if (!nombreLimpio) return { ok: false, error: 'El nombre de la materia es requerido.' };
  if (!/^[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*$/.test(idLimpio)) {
    return { ok: false, error: 'El ID solo puede contener letras, números y guiones (sin espacios).' };
  }

  const existente = _fbGet('config/materias/' + idLimpio);
  if (existente) return { ok: false, error: 'Ya existe una materia con el ID "' + idLimpio + '".' };

  _fbPut('config/materias/' + idLimpio, nombreLimpio.toUpperCase());
  return { ok: true, mensaje: 'Materia "' + nombreLimpio.toUpperCase() + '" creada.', data: { id: idLimpio, label: nombreLimpio.toUpperCase() } };
}

function eliminarMateria(body) {
  const { id, claveAdmin } = body;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };

  const idLimpio = _sanitizarNodo(id);
  if (!idLimpio) return { ok: false, error: 'El ID de la materia es requerido.' };

  const existente = _fbGet('config/materias/' + idLimpio);
  if (!existente) return { ok: false, error: 'No se encontró la materia con ID "' + idLimpio + '".' };

  _fbDelete('config/materias/' + idLimpio);
  return { ok: true, mensaje: 'Materia "' + idLimpio + '" eliminada del catálogo.' };
}

function asignarDocenteSeccion(body) {
  const { email, nombre, materias, claveAdmin, docenteEmail } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!_validarEmail(email)) return { ok: false, error: 'Correo del docente inválido.' };

  const emailLimpio = String(email).trim().toLowerCase();
  const esAdmin = _validarClaveAdmin(claveAdmin);
  const esAutoServicio = docenteEmail && String(docenteEmail).trim().toLowerCase() === emailLimpio;
  if (!esAdmin && !esAutoServicio) {
    return { ok: false, error: 'No autorizado para asignar este docente.' };
  }

  const materiasLimpio = Array.isArray(materias)
    ? materias.map(_sanitizarNodo).filter(function (m) { return m; })
    : [];

  _fbPut('config/docentes/' + grado + '/' + _emailKey(emailLimpio), {
    email: emailLimpio,
    nombre: _mayus(nombre),
    materias: materiasLimpio,
    asignadoEn: new Date().toISOString()
  });
  return {
    ok: true,
    mensaje: 'Docente inscrito en ' + grado + ' con ' + materiasLimpio.length + ' materia(s).',
    data: { grado: grado, email: emailLimpio, materias: materiasLimpio }
  };
}

function quitarDocenteSeccion(body) {
  const { email, claveAdmin, docenteEmail } = body;
  const grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };
  if (!_validarEmail(email)) return { ok: false, error: 'Correo del docente inválido.' };

  const esAdmin = _validarClaveAdmin(claveAdmin);
  const esAutoServicio = docenteEmail && String(docenteEmail).trim().toLowerCase() === String(email).trim().toLowerCase();
  if (!esAdmin && !esAutoServicio) {
    return { ok: false, error: 'No autorizado para retirar este docente.' };
  }

  _fbDelete('config/docentes/' + grado + '/' + _emailKey(email));
  return { ok: true, mensaje: 'Docente retirado de ' + grado + '.' };
}

function editarPerfilEstudiante(body) {
  const { nie, grado, fotoUrl, descripcion } = body;
  const gradoLimpio = _sanitizarNodo(grado);
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };
  if (!gradoLimpio) return { ok: false, error: 'Falta el grado.' };

  const existente = _fbGet('estudiantes/' + gradoLimpio + '/' + nie);
  if (!existente) return { ok: false, error: 'No se encontró el alumno.' };

  const actualizado = Object.assign({}, existente);
  if (fotoUrl !== undefined) actualizado.fotoUrl = fotoUrl;
  if (descripcion !== undefined) actualizado.descripcion = _sanitizarNodo(descripcion);

  _fbPut('estudiantes/' + gradoLimpio + '/' + nie, actualizado);
  return { ok: true, mensaje: 'Perfil actualizado.', data: actualizado };
}

function calcularRacha(body) {
  const { nie, grado, dias } = body;
  const gradoLimpio = _sanitizarNodo(grado);
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };
  if (!gradoLimpio) return { ok: false, error: 'Falta el grado.' };

  const hoy = new Date();
  const cantidadDias = dias || 30;
  let racha = 0;
  let mejorRacha = 0;

  for (let i = 0; i < cantidadDias; i++) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const fechaStr = Utilities.formatDate(d, 'America/El_Salvador', 'yyyy-MM-dd');

    const registro = _registroDia(gradoLimpio, nie, fechaStr);
    if (registro && registro.estado === 'P') {
      racha++;
      if (racha > mejorRacha) mejorRacha = racha;
    } else {
      racha = 0;
    }
  }

  let asistenciasMes = 0;
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  for (let i = 1; i <= hoy.getDate(); i++) {
    const d = new Date(anioActual, mesActual, i);
    if (d > hoy) break;
    const fechaStr = Utilities.formatDate(d, 'America/El_Salvador', 'yyyy-MM-dd');
    const registro = _registroDia(gradoLimpio, nie, fechaStr);
    if (registro && registro.estado === 'P') asistenciasMes++;
  }

  return {
    ok: true,
    data: {
      rachaActual: racha,
      mejorRacha,
      asistenciasMes,
      diasConsultados: cantidadDias
    }
  };
}

function calcularRachas(body) {
  const { grado } = body;
  const gradoLimpio = _sanitizarNodo(grado);
  if (!gradoLimpio) return { ok: false, error: 'Falta el grado.' };

  const estudiantes = _fbGet('estudiantes/' + gradoLimpio);
  if (!estudiantes) return { ok: true, data: {} };

  const nies = Object.keys(estudiantes);
  const hoy = new Date();

  const resultados = {};
  for (let idx = 0; idx < nies.length; idx++) {
    const nie = nies[idx];
    let racha = 0;
    let mejorRacha = 0;

    for (let i = 0; i < 30; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const fechaStr = Utilities.formatDate(d, 'America/El_Salvador', 'yyyy-MM-dd');
      const registro = _registroDia(gradoLimpio, nie, fechaStr);
      if (registro && registro.estado === 'P') {
        racha++;
        if (racha > mejorRacha) mejorRacha = racha;
      } else {
        racha = 0;
      }
    }

    let asistenciasMes = 0;
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();
    for (let i = 1; i <= hoy.getDate(); i++) {
      const d = new Date(anioActual, mesActual, i);
      if (d > hoy) break;
      const fechaStr = Utilities.formatDate(d, 'America/El_Salvador', 'yyyy-MM-dd');
      const registro = _registroDia(gradoLimpio, nie, fechaStr);
      if (registro && registro.estado === 'P') asistenciasMes++;
    }

    resultados[nie] = { rachaActual: racha, mejorRacha, asistenciasMes };
  }

  return { ok: true, data: resultados };
}

function _diasLaboralesMes() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  let contador = 0;
  for (let i = 1; i <= hoy.getDate(); i++) {
    const d = new Date(anio, mes, i);
    const diaSem = d.getDay();
    if (diaSem !== 0 && diaSem !== 6) contador++;
  }
  return contador;
}

function calcularLogros(body) {
  const { nie, grado } = body;
  const gradoLimpio = _sanitizarNodo(grado);
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };
  if (!gradoLimpio) return { ok: false, error: 'Falta el grado.' };

  const datosRacha = calcularRacha({ nie, grado: gradoLimpio, dias: 60 });
  if (!datosRacha.ok) return datosRacha;

  const { rachaActual, mejorRacha, asistenciasMes } = datosRacha.data;
  const totalLaborales = _diasLaboralesMes();
  const porcentaje = totalLaborales > 0 ? Math.round((asistenciasMes / totalLaborales) * 100) : 0;

  const logros = [];

  if (mejorRacha >= 5) {
    logros.push({ id: 'estrella-bronce', nombre: 'Constante', descripcion: '5 días seguidos', icono: 'star', color: 'bronce', nivel: 1 });
  }
  if (mejorRacha >= 10) {
    logros.push({ id: 'estrella-plata', nombre: 'Destacado', descripcion: '10 días seguidos', icono: 'star', color: 'plata', nivel: 2 });
  }
  if (mejorRacha >= 20) {
    logros.push({ id: 'estrella-oro', nombre: 'Ejemplar', descripcion: '20 días seguidos', icono: 'star', color: 'oro', nivel: 3 });
  }
  if (mejorRacha >= 30) {
    logros.push({ id: 'estrella-diamante', nombre: 'Leyenda', descripcion: '30 días seguidos', icono: 'gem', color: 'diamante', nivel: 4 });
  }

  if (rachaActual >= 3) {
    logros.push({ id: 'racha-activa', nombre: '¡Vamos!', descripcion: rachaActual + ' días seguidos y contando', icono: 'fire', color: 'fuego', nivel: 0 });
  }

  if (porcentaje >= 80) {
    logros.push({ id: 'porcentaje-80', nombre: 'Constancia', descripcion: porcentaje + '% de asistencia este mes', icono: 'medal', color: 'plata', nivel: 0 });
  }
  if (porcentaje === 100) {
    logros.push({ id: 'mes-perfecto', nombre: 'Mes Perfecto', descripcion: '100% de asistencia este mes', icono: 'crown', color: 'perfecto', nivel: 5 });
  }

  logros.sort((a, b) => b.nivel - a.nivel);

  return {
    ok: true,
    data: {
      porcentaje,
      totalLaborales,
      asistenciasMes,
      esMesPerfecto: porcentaje === 100,
      logros
    }
  };
}

function loginPerfil(body) {
  const { nie, grado, otp } = body;
  const gradoLimpio = _sanitizarNodo(grado);
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };
  if (!gradoLimpio) return { ok: false, error: 'Falta el grado.' };
  if (!otp) return { ok: false, error: 'Código de seguridad requerido. Pídelo a tu asistente de sección.' };

  const fecha = _hoy();
  const codigos = _fbGet('codigos_diarios/' + fecha + '/' + gradoLimpio) || {};
  let valido = false;
  for (const m in codigos) {
    if (codigos[m] && String(otp).trim() === String(codigos[m].codigo).trim()) { valido = true; break; }
  }
  if (!valido) {
    return { ok: false, error: 'Código de seguridad incorrecto.' };
  }

  const alumno = _fbGet('estudiantes/' + gradoLimpio + '/' + nie);
  if (!alumno) return { ok: false, error: 'No se encontró un alumno con ese NIE en el grado indicado.' };

  return { ok: true, data: alumno };
}

function primerosMarcajes(body) {
  const grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };

  const fecha = _hoy();
  const nodo = _fbGet('asistencia/' + fecha + '/' + grado) || {};
  const estudiantes = _fbGet('estudiantes/' + grado) || {};

  const presentes = [];
  const presentesPorNie = {};

  // Modelo legacy (asistencia/<fecha>/<grado>/<nie>)
  for (const nie in nodo) {
    const r = nodo[nie];
    if (r && typeof r === 'object' && r.estado === 'P' && r.hora && !presentesPorNie[nie]) {
      presentesPorNie[nie] = r;
    }
  }
  // Modelo por materia (asistencia/<fecha>/<grado>/<materia>/<nie>)
  for (const k in nodo) {
    const sub = nodo[k];
    if (!sub || typeof sub !== 'object') continue;
    for (const nie in sub) {
      const r = sub[nie];
      if (r && r.estado === 'P' && r.hora && !presentesPorNie[nie]) {
        presentesPorNie[nie] = r;
      }
    }
  }

  for (const nie in presentesPorNie) {
    const r = presentesPorNie[nie];
    const al = estudiantes[nie] || {};
    presentes.push({
      nie: nie,
      hora: r.hora,
      nombres: al.nombres || '',
      apellidos: al.apellidos || '',
      fotoUrl: al.fotoUrl || '',
      descripcion: al.descripcion || '',
    });
  }

  if (presentes.length === 0) return { ok: true, data: [] };

  presentes.sort(function (a, b) { return new Date(a.hora) - new Date(b.hora); });

  const primeros = presentes.slice(0, 5);
  const propios = body.nie
    ? { posicion: presentes.findIndex(function (p) { return p.nie === body.nie; }) + 1, total: presentes.length }
    : null;

  return { ok: true, data: { primeros: primeros, propios: propios } };
}

function topRachas(body) {
  const { grado, nie } = body;
  const gradoLimpio = _sanitizarNodo(grado);
  if (!gradoLimpio) return { ok: false, error: 'Falta el grado.' };

  const estudiantes = _fbGet('estudiantes/' + gradoLimpio) || {};
  const rachasData = calcularRachas({ grado: gradoLimpio });
  if (!rachasData.ok) return rachasData;

  const rachas = rachasData.data || {};

  const lista = Object.keys(estudiantes).map((eNie) => {
    const al = estudiantes[eNie];
    const r = rachas[eNie] || { rachaActual: 0, mejorRacha: 0, asistenciasMes: 0 };
    return {
      nie: eNie,
      nombres: al.nombres || '',
      apellidos: al.apellidos || '',
      fotoUrl: al.fotoUrl || '',
      descripcion: al.descripcion || '',
      ...r,
    };
  });

  lista.sort((a, b) => b.mejorRacha - a.mejorRacha || b.rachaActual - a.rachaActual || b.asistenciasMes - a.asistenciasMes);

  const top = lista.slice(0, 5);
  const posicion = nie ? lista.findIndex((e) => e.nie === nie) + 1 : null;

  return {
    ok: true,
    data: {
      top,
      posicion,
      total: lista.length,
      mejorRachaGlobal: lista.length > 0 ? lista[0].mejorRacha : 0,
    },
  };
}

function _sanitizarExamen(data) {
  if (!data || typeof data !== 'object') return null;
  var d = JSON.parse(JSON.stringify(data));

  if (d.preguntas && Array.isArray(d.preguntas)) {
    d.preguntas = d.preguntas.map(function (p) {
      return {
        id: p.id || _generarId(),
        tipo: _sanitizarNodo(p.tipo) || 'opcion_multiple',
        enunciado: String(p.enunciado || ''),
        puntaje: Number(p.puntaje || 1),
        orden: Number(p.orden || 0),
        opciones: Array.isArray(p.opciones) ? p.opciones.map(function (o) { return { id: String(o.id || ''), texto: String(o.texto || '') }; }) : [],
        opcionesCorrectas: Array.isArray(p.opcionesCorrectas) ? p.opcionesCorrectas.map(String) : [],
        respuestaCorrecta: p.respuestaCorrecta,
        justificacionCorrecta: p.justificacionCorrecta ? String(p.justificacionCorrecta) : '',
        rubrica: p.rubrica ? String(p.rubrica) : '',
        items: Array.isArray(p.items) ? p.items.map(String) : [],
        ordenCorrecto: Array.isArray(p.ordenCorrecto) ? p.ordenCorrecto.map(Number) : [],
        pares: Array.isArray(p.pares) ? p.pares.map(function (par) { return { id: Number(par.id) || _generarId(), izquierda: String(par.izquierda || ''), derecha: String(par.derecha || '') }; }) : [],
        formula: p.formula ? String(p.formula) : '',
      };
    });
  }

  if (d.configuracion && typeof d.configuracion === 'object') {
    d.configuracion.duracionMinutos = Number(d.configuracion.duracionMinutos || 60);
    d.configuracion.randomizar = d.configuracion.randomizar === true;
    d.configuracion.mostrarPuntaje = d.configuracion.mostrarPuntaje !== false;
    d.configuracion.permitirNavegacion = d.configuracion.permitirNavegacion !== false;
    d.configuracion.puntajeTotal = Number(d.configuracion.puntajeTotal || 0);
  }

  return d;
}

function _generarId() {
  return 'id_' + new Date().getTime() + '_' + Math.random().toString(36).slice(2, 8);
}

function _calcularPuntajeTotalExamen(preguntas) {
  if (!preguntas || preguntas.length === 0) return 0;
  var total = 0;
  for (var i = 0; i < preguntas.length; i++) {
    total += Number(preguntas[i].puntaje || 0);
  }
  return total;
}

function guardarExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var claveAdmin = body.claveAdmin;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!grado) return { ok: false, error: 'Falta el grado.' };

  var examen = _sanitizarExamen(body.data);
  if (!examen || !examen.titulo || examen.titulo.trim() === '') {
    return { ok: false, error: 'El título del examen es obligatorio.' };
  }
  if (!examen.preguntas || examen.preguntas.length === 0) {
    return { ok: false, error: 'Debes agregar al menos una pregunta.' };
  }

  var examenId = examen.id || _generarId();
  examen.id = examenId;
  examen.grado = grado;
  examen.estado = examen.estado || 'borrador';
  examen.createdAt = examen.createdAt || new Date().toISOString();
  examen.updatedAt = new Date().toISOString();
  examen.configuracion.puntajeTotal = _calcularPuntajeTotalExamen(examen.preguntas);

  _fbPut('evaluaciones/' + grado + '/examenes/' + examenId, examen);
  return { ok: true, mensaje: 'Examen guardado.', data: examen };
}

function publicarExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var claveAdmin = body.claveAdmin;
  var examenId = _sanitizarNodo(body.examenId);
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!grado || !examenId) return { ok: false, error: 'Faltan grado o examenId.' };

  var examen = _fbGet('evaluaciones/' + grado + '/examenes/' + examenId);
  if (!examen) return { ok: false, error: 'Examen no encontrado.' };
  if (!examen.preguntas || examen.preguntas.length === 0) {
    return { ok: false, error: 'No se pueden publicar exámenes sin preguntas.' };
  }

  _fbPatch('evaluaciones/' + grado + '/examenes/' + examenId, {
    estado: 'activo',
    updatedAt: new Date().toISOString()
  });
  return { ok: true, mensaje: 'Examen publicado y disponible para aplicar.' };
}

function eliminarExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var claveAdmin = body.claveAdmin;
  var examenId = _sanitizarNodo(body.examenId);
  var docenteUid = body.docenteUid;
  var docenteEmail = body.docenteEmail;
  // Validar clave admin tradicional
  if (claveAdmin && _validarClaveAdmin(claveAdmin)) {
    if (!grado || !examenId) return { ok: false, error: 'Faltan grado o examenId.' };
    var examen = _fbGet('evaluaciones/' + grado + '/examenes/' + examenId);
    if (!examen) return { ok: false, error: 'Examen no encontrado.' };
    _fbPatch('evaluaciones/' + grado + '/examenes/' + examenId, {
      eliminado: true,
      eliminadoEn: new Date().toISOString(),
      estado: 'eliminado'
    });
    return { ok: true, mensaje: 'Examen eliminado.' };
  }
  // Si no hay clave admin pero hay docente logueado con @clases.edu.sv
  if (docenteUid && docenteEmail && docenteEmail.endsWith('@clases.edu.sv')) {
    if (!grado || !examenId) return { ok: false, error: 'Faltan grado o examenId.' };
    var examen = _fbGet('evaluaciones/' + grado + '/examenes/' + examenId);
    if (!examen) return { ok: false, error: 'Examen no encontrado.' };
    _fbPatch('evaluaciones/' + grado + '/examenes/' + examenId, {
      eliminado: true,
      eliminadoEn: new Date().toISOString(),
      estado: 'eliminado'
    });
    return { ok: true, mensaje: 'Examen eliminado.' };
  }
  // Ninguna validación cumplida
  return { ok: false, error: 'Clave de administrador incorrecta.' };
}

function duplicarExamen(body) {
  var gradoOrigen = _sanitizarNodo(body.gradoOrigen);
  var gradoDestino = _sanitizarNodo(body.gradoDestino);
  var examenId = _sanitizarNodo(body.examenId);
  var claveAdmin = body.claveAdmin;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!gradoOrigen || !gradoDestino || !examenId) return { ok: false, error: 'Faltan gradoOrigen, gradoDestino o examenId.' };

  var original = _fbGet('evaluaciones/' + gradoOrigen + '/examenes/' + examenId);
  if (!original || original.eliminado) return { ok: false, error: 'El examen original no existe.' };

  var nuevoId = _generarId();
  var copia = {
    id: nuevoId,
    titulo: original.titulo || 'Sin título',
    descripcion: original.descripcion || '',
    materia: original.materia || '',
    grado: gradoDestino,
    creadoPor: body.docenteNombre || original.creadoPor || 'Profesor',
    creadoPorUid: body.docenteUid || 'admin-global',
    creadoPorEmail: body.docenteEmail || original.creadoPorEmail || 'admin@insal.edu.sv',
    preguntas: original.preguntas || [],
    configuracion: original.configuracion || {},
    estado: 'borrador',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  _fbPut('evaluaciones/' + gradoDestino + '/examenes/' + nuevoId, copia);
  return { ok: true, mensaje: 'Examen duplicado.', data: copia };
}

function obtenerExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  if (!grado || !examenId) return { ok: false, error: 'Faltan grado o examenId.' };

  var examen = _fbGet('evaluaciones/' + grado + '/examenes/' + examenId);
  if (!examen || examen.eliminado) return { ok: false, error: 'Examen no encontrado.' };
  return { ok: true, data: examen };
}

function listarExamenes(body) {
  var grado = _sanitizarNodo(body.grado);
  if (!grado) return { ok: false, error: 'Falta el grado.' };

  var datos = _fbGet('evaluaciones/' + grado + '/examenes') || {};
  var examenes = [];
  for (var key in datos) {
    if (datos.hasOwnProperty(key)) {
      var ex = datos[key];
      if (!ex.eliminado) {
        ex.id = key;
        examenes.push(ex);
      }
    }
  }
  examenes.sort(function (a, b) {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  return { ok: true, data: examenes };
}

function iniciarExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  var nie = String(body.nie || '');
  if (!grado || !examenId || !nie) return { ok: false, error: 'Faltan grado, examenId o NIE.' };
  if (!_validarNieFormato(nie)) return { ok: false, error: 'NIE inválido.' };

  var examen = _fbGet('evaluaciones/' + grado + '/examenes/' + examenId);
  if (!examen || examen.eliminado) return { ok: false, error: 'Examen no disponible.' };
  if (examen.estado !== 'activo') return { ok: false, error: 'El examen no está activo.' };

  var pathRespuesta = 'evaluaciones/' + grado + '/respuestas/' + examenId + '/' + nie;
  var existeRespuesta = _fbGet(pathRespuesta);
  if (existeRespuesta && existeRespuesta.status !== 'finalizado') {
    return { ok: true, mensaje: 'Reanudando examen', data: existeRespuesta };
  }
  if (existeRespuesta && existeRespuesta.status === 'finalizado') {
    return { ok: false, error: 'Ya has completado este examen.' };
  }

  var inicio = {
    nie: nie,
    nombre: '',
    grado: grado,
    examenId: examenId,
    startTime: new Date().toISOString(),
    endTime: null,
    status: 'en_curso',
    respuestas: {},
    eventosProctoring: [],
    createdAt: new Date().toISOString()
  };

  var alumno = _fbGet('estudiantes/' + grado + '/' + nie);
  if (alumno) inicio.nombre = alumno.nombres + ' ' + alumno.apellidos;

  _fbPut(pathRespuesta, inicio);
  _fbPut('evaluaciones/' + grado + '/proctoring/' + examenId + '/' + nie, {
    status: 'normal',
    eventos: [],
    startTime: new Date().toISOString(),
    ultimaActualizacion: new Date().toISOString()
  });

  return { ok: true, data: inicio };
}

function guardarRespuesta(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  var nie = String(body.nie || '');
  var preguntaId = body.preguntaId;
  var valor = body.valor;
  if (!_validarNieFormato(nie) || !grado || !examenId || !preguntaId) {
    return { ok: false, error: 'Datos incompletos.' };
  }

  _fbPut('evaluaciones/' + grado + '/respuestas/' + examenId + '/' + nie + '/respuestas/' + preguntaId, {
    valor: valor,
    timestamp: new Date().toISOString()
  });
  return { ok: true, mensaje: 'Respuesta guardada.' };
}

function finalizarExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  var nie = String(body.nie || '');
  if (!_validarNieFormato(nie) || !grado || !examenId) {
    return { ok: false, error: 'Datos incompletos.' };
  }

  var respuestas = _fbGet('evaluaciones/' + grado + '/respuestas/' + examenId + '/' + nie);
  if (!respuestas) return { ok: false, error: 'No se encontró la sesión del examen.' };
  if (respuestas.status === 'finalizado') return { ok: false, error: 'El examen ya fue finalizado.' };

  _fbPatch('evaluaciones/' + grado + '/respuestas/' + examenId + '/' + nie, {
    endTime: new Date().toISOString(),
    status: 'finalizado',
    updatedAt: new Date().toISOString()
  });
  return { ok: true, mensaje: 'Examen finalizado.' };
}

function reiniciarTiempoExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  var nie = String(body.nie || '');
  var claveAdmin = body.claveAdmin;
  if (!_validarClaveAdmin(claveAdmin)) return { ok: false, error: 'Clave de administrador incorrecta.' };
  if (!_validarNieFormato(nie) || !grado || !examenId) {
    return { ok: false, error: 'Datos incompletos.' };
  }

  var respuestas = _fbGet('evaluaciones/' + grado + '/respuestas/' + examenId + '/' + nie);
  if (!respuestas) return { ok: false, error: 'No se encontró la sesión del examen.' };
  if (respuestas.status === 'finalizado') return { ok: false, error: 'El examen ya fue finalizado, no se puede reiniciar.' };

  // Obtener duración del examen para calcular nuevo deadline
  var examen = _fbGet('evaluaciones/' + grado + '/examenes/' + examenId);
  var configuracion = examen ? (examen.configuracion || {}) : {};
  var duracionMinutos = configuracion.duracionMinutos || 60;

  _fbPatch('evaluaciones/' + grado + '/respuestas/' + examenId + '/' + nie, {
    startTime: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return { ok: true, mensaje: 'Tiempo reiniciado.', duracionMinutos: duracionMinutos };
}

function obtenerRespuestasExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  if (!grado || !examenId) return { ok: false, error: 'Faltan grado o examenId.' };

  var datos = _fbGet('evaluaciones/' + grado + '/respuestas/' + examenId) || {};
  var respuestas = [];
  for (var nie in datos) {
    if (datos.hasOwnProperty(nie)) {
      var r = datos[nie];
      r.nie = nie;
      respuestas.push(r);
    }
  }
  return { ok: true, data: respuestas };
}

function registrarEventoProctoring(body) {
  var grado = _sanitizarNodo(body.grado);
  var examenId = _sanitizarNodo(body.examenId);
  var nie = String(body.nie || '');
  var evento = body.evento;
  if (!_validarNieFormato(nie) || !grado || !examenId || !evento) {
    return { ok: false, error: 'Datos incompletos.' };
  }

  var eventoId = _generarId();
  evento.id = eventoId;
  evento.timestamp = new Date().toISOString();

  _fbPut('evaluaciones/' + grado + '/proctoring/' + examenId + '/' + nie + '/eventos/' + eventoId, evento);
  
  // Leer status actual para no degradar (nunca bajar de un nivel más alto)
  var nodoActual = _fbGet('evaluaciones/' + grado + '/proctoring/' + examenId + '/' + nie);
  var statusActual = nodoActual ? nodoActual.status : 'normal';
  var orden = { normal: 0, warning: 1, suspicion: 2 };
  var nuevoStatus = orden[evento.severidad] > orden[statusActual] ? evento.severidad : statusActual;
  
  _fbPatch('evaluaciones/' + grado + '/proctoring/' + examenId + '/' + nie, {
    ultimaActualizacion: new Date().toISOString(),
    status: nuevoStatus
  });

  return { ok: true, data: evento };
}

function validarAsistenciaExamen(body) {
  var grado = _sanitizarNodo(body.grado);
  var nie = String(body.nie || '');
  var materiaId = _sanitizarNodo(body.materia);
  if (!_validarNieFormato(nie) || !grado) {
    return { ok: false, error: 'Falta NIE o grado.' };
  }

  var fecha = _hoy();
  var registro = materiaId
    ? _fbGet('asistencia/' + fecha + '/' + grado + '/' + materiaId + '/' + nie)
    : _registroDia(grado, nie, fecha);
  if (!registro) return { ok: false, error: 'No se ha registrado asistencia para hoy.', data: { asistio: false } };
  if (registro.estado !== 'P') return { ok: false, error: 'La asistencia de hoy no está marcada como PRESENTE.', data: { asistio: false } };

  var alumno = _fbGet('estudiantes/' + grado + '/' + nie);
  return { ok: true, data: { asistio: true, alumno: alumno } };
}

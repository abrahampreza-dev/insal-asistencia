# INSAL Asistencia

Sistema de asistencia estudiantil: React SPA (Vite + Tailwind) + Firebase Realtime
Database + Google Apps Script como middleware seguro para escrituras.

## Estructura

```

src/
  firebase.js            → SDK Firebase (solo lectura en tiempo real)
  api.js                 → fetch() hacia la Web App de Apps Script
  utils/validators.js     → Validaciones dinámicas de formularios
  utils/comprimirFoto.js  → Pipeline de compresión Canvas (150x150, JPEG 0.5)
  components/EstadoPeticion.jsx → Spinner / tarjeta éxito / alerta error
  views/ViewLanding.jsx
  views/ViewRegistroAlumno.jsx
  views/ViewAutoMarcacion.jsx
  views/ViewAsistente.jsx
  views/ViewAdmin.jsx
  App.jsx                → Router y barra de navegación
```

## 1) Backend — Google Apps Script

1. Ve a [script.google.com](https://script.google.com) → Nuevo proyecto.
2. Reemplaza el contenido de `Código.gs` por el de `backend/Código.gs`.
3. **Proyecto > Configuración del proyecto > Propiedades del script
4. **Implementar > Nueva implementación > Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**


## 2) Firebase Realtime Database

Crea un proyecto en [Firebase Console](https://console.firebase.google.com),
habilita **Realtime Database** (modo prueba o con reglas propias), y copia:
`apiKey`, `authDomain`, `databaseURL`, `projectId` desde la configuración del
SDK Web.

Antes de marcar asistencia hay que sembrar los datos iniciales directamente
en la consola de Firebase (o vía un script), por ejemplo:

```json
{
  "claves": { "2GB": "clave-seccional-2GB" }
}
```

## 3) Frontend

```bash
cp .env.example .env      # completa con tus valores reales
npm install
npm run dev                # desarrollo
npm run build               # genera dist/ listo para desplegar (Firebase Hosting, Vercel, etc.)
```

## Notas de diseño

- Toda escritura (registrar, marcar, auditar, congelar) pasa por Apps Script
  vía `fetch()` — nunca directo desde el cliente — para centralizar validaciones
  de servidor y no exponer el secreto de Firebase.
- Solo la lectura en tiempo real de la grilla de asistencia usa el SDK de
  Firebase (`onValue`), como pide la rúbrica.
- El pipeline de fotos comprime a 150×150 JPEG calidad 0.5 (~<5KB) para
  mantener el proyecto dentro del plan gratuito de Firebase.
- `registrarEstudiante` en el backend rechaza NIEs duplicados por diseño; el
  panel de "Corrección" en el admin reutiliza esa acción como demo — para
  producción conviene añadir una acción `editarEstudiante` dedicada que
  sobrescriba sin esa validación (ver comentario en `ViewAdmin.jsx`).
- El código OTP diario **no vence por tiempo**. Sigue siendo válido hasta
  que el asistente o el maestro presionan **"Guardar Asistencia del Día"**
  (`BotonGuardarAsistencia.jsx`, acción `congelarReporte`) — a partir de ahí
  el código deja de servir para auto-marcar. Ese cierre además valida que
  **todos** los alumnos de la sección ya tengan un estado (P/A/M) antes de
  permitirlo.
- El maestro/admin **sí puede corregir un estado aunque la sección ya esté
  cerrada** (`congelarReporte`); solo el asistente (clave seccional) queda
  bloqueado tras el cierre — así se pueden arreglar casos como un alumno que
  llegó tarde después de guardada la asistencia.
- Los nombres y apellidos de los alumnos, el motivo de un permiso, y quién
  validó/generó/cerró cada acción se guardan **en mayúsculas** (`_mayus()`
  en `Código.gs`), para mantener la base de datos normalizada.
- Reportes: el CSV usa el mismo formato que el sistema anterior (separador
  `;`, BOM para Excel, estado en texto largo: PRESENTE/FALTA/PERMISO/SIN
  REGISTRO). El texto de WhatsApp usa el mismo formato y estructura que la
  función original (`enviarWhatsAppResumen`). Ambos, y el nuevo botón
  **"Enviar Asistencia a Encargados"** (acción `enviarCorreoEncargados`,
  envía un correo personalizado por alumno vía `MailApp`), muestran la
  fecha normalizada como DD-MM-AAAA (`src/utils/fecha.js` en el frontend,
  `_fechaDDMMAAAA()` en el backend) aunque internamente todo se siga
  guardando como AAAA-MM-DD (formato nativo de Firebase/`<input
  type="date">`).
- **Nota sobre `MailApp`:** las cuentas de Gmail gratuitas tienen un límite
  diario de envíos (normalmente 100/día); cuentas de Google Workspace
  tienen más margen. Si envías a una sección grande varias veces al día,
  podrías toparte con ese límite — Apps Script devuelve un error claro si
  pasa.
- El reporte de la pestaña "Reportes" ahora usa una lectura puntual
  (`leerRuta`, `get()` de Firebase) en vez de un listener en vivo que se
  cancelaba de inmediato — es más simple y más rápido para una consulta que
  no necesita mantenerse suscrita.
- El generador de OTP (`GeneradorOtp.jsx`) es el mismo componente tanto en
  el panel del asistente (autorizado con la clave seccional) como en la
  pestaña "Corrección" del panel de maestro/admin (autorizado con la clave
  de administrador) — ambos pueden generar o renovar el código, y ambos
  tienen acceso al botón de "Guardar Asistencia".
- Las contraseñas (login de admin, login de asistente, asignar clave
  seccional) usan `CampoClave.jsx`, un input con botón de "ojito" para
  mostrar/ocultar el texto. En la pestaña "Claves" del admin también se
  puede consultar la contraseña seccional ya guardada de un grado (útil si
  el asistente la olvidó), leyéndola directo de Firebase.

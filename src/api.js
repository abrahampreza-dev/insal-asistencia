const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export async function llamarApi(action, payload = {}) {
  if (!APPS_SCRIPT_URL) {
    return { ok: false, error: 'VITE_APPS_SCRIPT_URL no está configurada.' };
  }

  try {
    const respuesta = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!respuesta.ok) {
      return { ok: false, error: `Error de servidor (HTTP ${respuesta.status}).` };
    }

    const json = await respuesta.json();
    return json;
  } catch (err) {
    return { ok: false, error: 'No se pudo conectar con el servidor. Revisa tu conexión a internet o que la Web App esté implementada con acceso "Cualquier usuario".' };
  }
}

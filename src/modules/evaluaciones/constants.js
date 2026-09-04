export const TIPOS_PREGUNTA = {
  OPCION_MULTIPLE: 'opcion_multiple',
  VERDADERO_FALSO: 'verdadero_falso',
  ABIERTO: 'abierto',
  ORDENAR: 'ordenar',
  EMPAREJAR: 'emparejar',
  FORMULA: 'formula',
};

export const ESTADOS_EXAMEN = {
  BORRADOR: 'borrador',
  ACTIVO: 'activo',
  EN_CURSO: 'en_curso',
  FINALIZADO: 'finalizado',
  CALIFICADO: 'calificado',
};

export const ETIQUETAS_TIPOS_PREGUNTA = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: 'Opción Múltiple',
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: 'Verdadero/Falso',
  [TIPOS_PREGUNTA.ABIERTO]: 'Desarrollo',
  [TIPOS_PREGUNTA.ORDENAR]: 'Ordenamiento',
  [TIPOS_PREGUNTA.EMPAREJAR]: 'Emparejamiento',
  [TIPOS_PREGUNTA.FORMULA]: 'Fórmula (LaTeX)',
};

export const ICONOS_TIPOS_PREGUNTA = {
  [TIPOS_PREGUNTA.OPCION_MULTIPLE]: 'fa-list-check',
  [TIPOS_PREGUNTA.VERDADERO_FALSO]: 'fa-toggle-on',
  [TIPOS_PREGUNTA.ABIERTO]: 'fa-pen-fancy',
  [TIPOS_PREGUNTA.ORDENAR]: 'fa-up-down-left-right',
  [TIPOS_PREGUNTA.EMPAREJAR]: 'fa-link',
  [TIPOS_PREGUNTA.FORMULA]: 'fa-superscript',
};

export const NIVELES_ACADEMICOS = [
  { id: 'primaria', label: 'Primaria (1.° a 6.° grado)' },
  { id: 'secundaria', label: 'Secundaria (1.° a 3.° ciclo)' },
  { id: 'bachillerato', label: 'Bachillerato' },
  { id: 'universidad', label: 'Universidad' },
  { id: 'preescolar', label: 'Preescolar' },
  { id: 'eso', label: 'Educación Secundaria Obligatoria' },
  { id: 'bachillerato_completo', label: 'Bachillerato Completo' },
];

export const COLOR_ESTADO_EVALUACION = {
  normal: 'bg-emerald-500',
  advertencia: 'bg-amber-500',
  sospecha: 'bg-rose-500',
  inactivo: 'bg-slate-600',
};

export const CONFIG_PROCTORING = {
  fullscreen: true,
  bloquearCopiar: true,
  bloquearPegar: true,
  bloquearCortar: true,
  bloquearContextMenu: true,
  penalizacionTimeout: 30,
  maxAdvertencias: 5,
};

export const CONFIG_TIEMPO = {
  segundosPorPregunta: 90,
  tiempoMaximoExamen: 3600,
};

export const PUNTOS_AI_DETECCION = {
  alto: 0.8,
  medio: 0.6,
  bajo: 0.4,
};

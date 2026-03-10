// =================================================================================
// IDs DE CONFIGURACIÓN
// =================================================================================
const ID_CARPETA_MADRE_CAJAS = "1cuuWHWxwLc1rhHokDwYpI3k_kwo5zHE1";
const ID_CONSOLIDADO_CAJAS = "1vZXDgSnEC1zh9VnT-2Yz9f1DLFlK_O7b5IYz5jAzQO4";
const NOMBRE_HOJA_CAJAS = "Cajas"; 

// NUEVA CONFIGURACIÓN PARA TI
const ID_CARPETA_MADRE_TI = "1Uwzk_1Q8BLKXdfe1sU6cMe94aXHIzc9O";
const ID_CONSOLIDADO_TI = "1Q4pgo_-_Rt58l82LZvROVnQeRc0RAFkAX3lAOJQiO10";
const NOMBRE_HOJA_TI = "TI";

const ID_CONSOLIDADO_FINAL = "1cMN2hWGvutESLZ3VApqLipDxPtqPY4JoeHHOUyMcEKk";
const NOMBRE_HOJA_FINAL = "Consolidado Indicaciones";
const ID_BASE_CONTACTABILIDAD = "1aKgMNJeqkwIvauh0r9FKr9voS97YCtPr1gc4ixKqzGA";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA DE PLANILLAS DE SEGUIMIENTO
// =================================================================================

const CONFIG_PLANILLAS_SEGUIMIENTO = {
  "1": { // CONSULTA MEDICA
    id: "11oadFim6WPMuiykhJFMtgg6QLCm04B5bI20NzIwfgcE",
    nombreHoja: "Hoja 1",
    filtro: ["1.-CONSULTA MEDICA"]
  },
  "2": { // CONSULTA REPETIDA O CONTROL
    id: "1GuhZV0Uc_dvV5WV-KzpT5lqXgBUTgOIg_jNL0wPEPCE",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL"]
  },
  "3": { // PROCEDIMIENTO (General, sin Imagen ni Med. Nuclear)
    id: "1x2tOo20W4YdsyI4D-elHdcGXjvwdhnRI3VK63NP_BAk",
    nombreHoja: "Hoja 1",
    filtro: ["3.-PROCEDIMIENTO"]
  },
  "456": { // QUIRURGICO, COMPLEJO Y HOSPITALIZACION
    id: "1KECGEfR_r8m1ofLCpVUTGnCcw-OfroVCU6X0Z434cGg",
    nombreHoja: "Hoja 1",
    filtro: ["4.-QUIRURGICO", "5.-QUIRURGICO COMPLEJO", "6.-HOSPITALIZACION"]
  },
  "7": { // EXAMENES
    id: "1emHbxN-3N3TkvMONc3V3d4fddvenVoH4Qkbiqlo3He8",
    nombreHoja: "Hoja 1",
    filtro: ["7.-EXAMENES"]
  },
  "IMAGENOLOGIA": { // IMAGENOLOGIA (Subconjunto de Procedimiento)
    id: "1VaMsAROXQnJHQnKxqhJGOI1rb11l8CoWGJhJoed2kpM",
    nombreHoja: "Hoja 1",
    filtro: ["3.-PROCEDIMIENTO"]
  },
  "MED_NUCLEAR": { // MED. NUCLEAR (Subconjunto de Procedimiento)
    id: "1aPwuenEQbipzZsCjwpqDj0vfZKprAotym4qv3EX0I8s", 
    nombreHoja: "Hoja 1",
    filtro: ["3.-PROCEDIMIENTO"]
  },

  // --- NUEVAS ESPECIALIDADES ---

  "DIABETES": { 
    id: "15tPSFjuMCAyScZ1-_oDkDTTnxfDY_7lmopaswu7-hqU",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL"]
  },
  "ENDOSCOPIA": { 
    id: "1zQET_i_f2q7gFzQoDaBKv9UcC9EaXNmB-ViCj8gU2G0",
    nombreHoja: "Hoja 1",
    filtro: ["3.-PROCEDIMIENTO"]
  },
  "UROLOGIA": { // Recibe tanto Tipo 2 como Tipo 3
    id: "1HUNk-ne3S21pG-ouQgzRiibq07Lqo5b-ZDg-heWX5sU",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL", "3.-PROCEDIMIENTO"]
  },
  "TRAUMATOLOGIA": { 
    id: "1qnmeb_2wzS6zN-if5zTDJAGFr9aSagkRVCN9oy9JHgs",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL"]
  },
  "REUMATOLOGIA": { // Recibe tanto Tipo 2 como Tipo 3
    id: "1AVNCV1PPeF0WjY7l_33WJYMSbLIb46E-sccqF_OIN-M",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL", "3.-PROCEDIMIENTO"]
  },
  "OTORRINO": { // Recibe tanto Tipo 2 como Tipo 3
    id: "1p-UgTznCNkZeE15U978wDY6suKotWLzYCoKWa1b6esg",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL", "3.-PROCEDIMIENTO"]
  },
  "GASTROENTEROLOGIA": { 
    id: "1HBwbt3isoopiV9Ln7ty_EeNE791HY_a_qrhscZ2hW9I",
    nombreHoja: "Hoja 1",
    filtro: ["2.-CONSULTA REPETIDA O CONTROL"]
  }
};

// =================================================================================
// DEFINICIÓN DE ESTRUCTURAS (ENCABEZADOS)
// =================================================================================

// Nombres de las columnas auxiliares clave para la sincronización.
const HEADER_ID_UNICO = "ID_UNICO_ORIGEN";
const HEADER_HASH = "HASH_CONTENIDO";

// Encabezados de los consolidados intermedios (Cajas y CA).
const ENCABEZADOS_INTERMEDIOS = [
  'ARCHIVO ORIGEN', 'RUN', 'DV', 'Id Caso', 'No de casos', 'Fecha de Edición', 'NOMBRE COMPLETO',
  'TIPO_PREST', 'TIPO CONSULTA', 'PROCEDIMIENTO', 'CIRUGÍA', 'CODIGO DE PRESTACION',
  'VALIDACION INGRESO', 'OTRA PRESTACIÓN', 'FECHA DE ENTRADA', 'FECHA DE CITACIÓN',
  'HORA DE CITACIÓN', 'OBSERVACIONES', 'COMENTARIOS', 'Dia entrada', 'mes entrada',
  'año entrada', HEADER_ID_UNICO, HEADER_HASH
];

// Nombres de las columnas de retorno
const COLUMNAS_DE_RETORNO = ['FECHA REVISIÓN', 'ESTADO', 'OBS SEGUIMIENTO', 'HISTORIAL DE SEGUIMIENTO', 'FECHA DE CITACIÓN', 'HORA DE CITACIÓN'];

// Filtra las columnas de retorno para incluir solo las que NO están ya en los encabezados intermedios.
// Esto evita duplicados en el Consolidado Final (ej. FECHA DE CITACIÓN).
const columnasDeRetornoUnicas = COLUMNAS_DE_RETORNO.filter(col => !ENCABEZADOS_INTERMEDIOS.includes(col));

// Encabezados del CONSOLIDADO FINAL. Incluye las columnas de retorno.
const ENCABEZADOS_FINALES = [
  ...ENCABEZADOS_INTERMEDIOS,
  ...columnasDeRetornoUnicas
];

// --- ESTRUCTURA DE COLUMNAS DE SEGUIMIENTO ---
const ENCABEZADOS_SEGUIMIENTO = [
  // Bloque de Datos de Origen (A-K)
  'ARCHIVO ORIGEN', 'RUN', 'DV', 'ID CASO', 'N° CASOS', 'FECHA DE EDICIÓN', 'NOMBRE COMPLETO',
  'TIPO PREST', 'PRESTACIÓN', 'CÓDIGO DE PRESTACIÓN', 'FECHA DE ENTRADA', 
  // Bloque de Contexto (L-P)
  'OBSERVACIONES', 'COMENTARIOS', 'FONO FIJO', 'FONO MOVIL', 'EMAIL',
  // Bloque de Seguimiento (Q-V)
  'FECHA REVISIÓN', 'FECHA DE CITACIÓN', 'HORA DE CITACIÓN', 'ESTADO', 'OBS SEGUIMIENTO', 'HISTORIAL DE SEGUIMIENTO', 
  // Bloque de Control (W-X)
  HEADER_ID_UNICO, HEADER_HASH
];

// =================================================================================
// FILTROS Y EXCLUSIONES
// =================================================================================

/**
 * Filtros de imagenología
 */
const FILTROS_IMAGENOLOGIA = {
  // Patrón para buscar los sufijos entre paréntesis. La función que lo usa (evaluarPrestacionParaImagenologia) ya aplica 'i' (ignorar may/min).
  PATRON_INCLUIR: "\\((RAYOS|ECO|TAC|RESONANCIA|MAMO)\\)",                  

  // "$^" es una expresión regular que intencionalmente no coincide con nada. Esto evita que (OFTALMO), (CARDIO), etc., excluyan un caso de imagenología.
  PATRONES_EXCLUIR_UNIFICADO: "$^",

  
  // Códigos específicos a excluir (CONFIRMAR SI ES NECESARIO AHORA QUE TENEMOS LOS CÓDIGOS DEL ARCHIVO "Arbol Exámenes Ley HCUCH")
  CODIGOS_EXCLUIR_IMAGENOLOGIA: []
};

// --- NUEVAS ESPECIALIDADES ---

const FILTROS_ESPECIALIDADES = {
  DIABETES_CONSULTA: ["07-013 DIABETOLOGIA", "07-013", "DIABETOLOGIA"],
  TRAUMATOLOGIA_CONSULTA: ["07-053 TRAUMATOLOGIA Y ORTOPEDIA", "07-053", "TRAUMATOLOGIA Y ORTOPEDIA"],
  GASTRO_CONSULTA: ["07-018 GASTROENTEROLOGIA ADULTO", "07-018", "GASTROENTEROLOGIA ADULTO"],
  UROLOGIA_CONSULTA: ["07-054 UROLOGIA", "07-054", "UROLOGIA"],
  REUMATOLOGIA_CONSULTA: ["07-051 REUMATOLOGIA", "07-051", "REUMATOLOGIA"],
  OTORRINO_CONSULTA: ["07-046 OTORRINOLARINGOLOGIA", "07-046", "OTORRINOLARINGOLOGIA"],
 
  UROLOGIA_PROC: ["(URO/NEFRO)"],
  ENDOSCOPIA_PROC: [
    // 1. Códigos exactos (Prioridad)
    "1801037", "1801002", "1801001", "1801026", "1801025", 
    "1801024", "1801023", "1801031", "1801004", "1801007", 
    "1801006", "1801045", "1801025", "1801029", "1801003", 
    "1801033", "1707056", "1801019", "1801028", "1801018", 
    "1801036", "1801018"
  ], 
  //REUMATOLOGIA_PROC: [],  
  //OTORRINO_PROC: []
};

/**
 * Filtro de exclusión para prestaciones ya realizadas
 */

const REGLAS_EXCLUSION_GLOBAL = {
  PATRON_REALIZADO: /REALIZAD[OAE]S?|EFECTUAD[AOE]S?|COMPLETAD[AOE]S?|FINALIZAD[AOE]S?|YA\s+SE\s+HIZO|TERMINAD[AOE]S?/i
};


/**
 * Filtro de orígenes de datos a excluír
 */

// const ORIGENES_CA_EXCLUIDOS = [
//   "FRANCISCA MUÑOZ",
//   "GILDA CERDA",
//   "MARÍA DÍAZ",
//   "PAZ CASTRO"
// ];

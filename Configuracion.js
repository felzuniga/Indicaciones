// =================================================================================
// IDs DE CONFIGURACIÓN
// =================================================================================
const ID_CARPETA_MADRE_CAJAS = "1IPbiNNUhG4sTjH9Dlm49uOn-KkYfsfjk";
const ID_CONSOLIDADO_CAJAS = "1k9G7qfT6qebtH79JMKLa1C7SO53fM8957Cf_GyzRe-I";
const NOMBRE_HOJA_CAJAS = "Cajas";
const ID_CARPETA_MADRE_CA = "1cfti_K5M4OW4n_RzsmlgbXn-eO2oa-aB";
const ID_CONSOLIDADO_CA = "1swCP2O5C-wADXBRaWaW0sxe2kNf6FQ0HSkY7_ghnGXo";
const NOMBRE_HOJA_CA = "CA";
const ID_CONSOLIDADO_FINAL = "1IaRzYZm7lCY-jBiSxfbvT54PE2lmnzKUCLbJlr6zkyg";
const NOMBRE_HOJA_FINAL = "Consolidado Indicaciones";
const ID_BASE_CONTACTABILIDAD = "1aKgMNJeqkwIvauh0r9FKr9voS97YCtPr1gc4ixKqzGA";

// =================================================================================
// CONFIGURACIÓN CENTRALIZADA DE PLANILLAS DE SEGUIMIENTO
// =================================================================================

const CONFIG_PLANILLAS_SEGUIMIENTO = {
    "1": { // CONSULTA MEDICA
        id: "1qzNPHl9cEtxP7T_9d9vZ8kuZwjZdykT5XgY6GgD3xNw",
        nombreHoja: "Hoja 1",
        filtro: ["1.-CONSULTA MEDICA"]
    },
    "2": { // CONSULTA REPETIDA O CONTROL
        id: "1C0RdtWuT51C-Ge4P7OxG_TCelDBjoMhWi7qqVyalbEs",
        nombreHoja: "Hoja 1",
        filtro: ["2.-CONSULTA REPETIDA O CONTROL"]
    },
    "3": { // PROCEDIMIENTO (General, sin Imagen ni Med. Nuclear)
        id: "1p81nSeAfEfIw-E5dsa4Lc_r-3DHuZgVCSbHfJl-vKGE",
        nombreHoja: "Hoja 1",
        filtro: ["3.-PROCEDIMIENTO"]
    },
    "456": { // QUIRURGICO, COMPLEJO Y HOSPITALIZACION
        id: "1lZntWAKHqzdJ5CgR482gHA8EIV9Ggaa8PbZyAoJ22tw",
        nombreHoja: "Hoja 1",
        filtro: ["4.-QUIRURGICO", "5.-QUIRURGICO COMPLEJO", "6.-HOSPITALIZACION"]
    },
    "7": { // EXAMENES
        id: "1t4Qrc-3Wy8OHR3IWwiiinpZbodzOnFzJdhrM_xkxSjE",
        nombreHoja: "Hoja 1",
        filtro: ["7.-EXAMENES"]
    },
    "IMAGENOLOGIA": { // IMAGENOLOGIA (Subconjunto de Procedimiento)
        id: "1tVU6-AncYp1YeoXR3il0SdFDy8QitUjJwzo3kT28dNs",
        nombreHoja: "Hoja 1",
        filtro: ["3.-PROCEDIMIENTO"]
    },
    "MED_NUCLEAR": { // MED. NUCLEAR (Subconjunto de Procedimiento)
        id: "1r4k9ONqV3d8NU5eiXgmsUF2RyH_h9l6ujGit8-H-Gyw",
        nombreHoja: "Hoja 1",
        filtro: ["3.-PROCEDIMIENTO"]
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
const COLUMNAS_DE_RETORNO = ['FECHA REVISIÓN', 'ESTADO', 'OBS SEGUIMIENTO', 'HISTORIAL DE SEGUIMIENTO'];

// Encabezados del CONSOLIDADO FINAL. Incluye las columnas de retorno.
const ENCABEZADOS_FINALES = [
    ...ENCABEZADOS_INTERMEDIOS,
    ...COLUMNAS_DE_RETORNO
];

// --- ESTRUCTURA DE COLUMNAS DE SEGUIMIENTO ---
const ENCABEZADOS_SEGUIMIENTO = [
    'ARCHIVO ORIGEN', 'RUN', 'DV', 'ID CASO', 'N° CASOS', 'FECHA DE EDICIÓN', 'NOMBRE COMPLETO',
    'TIPO PREST', 'PRESTACIÓN', 'CÓDIGO DE PRESTACIÓN', 'FECHA DE ENTRADA', 'FECHA DE CITACIÓN',
    'HORA DE CITACIÓN', 'OBSERVACIONES', 'COMENTARIOS', 'FONO FIJO', 'FONO MOVIL', 'EMAIL',
    'FECHA REVISIÓN', 'ESTADO', 'OBS SEGUIMIENTO', 'HISTORIAL DE SEGUIMIENTO', HEADER_ID_UNICO, HEADER_HASH
];

// =================================================================================
// FILTROS Y EXCLUSIONES
// =================================================================================

/**
 * Filtros de imagenología
 */
const FILTROS_IMAGENOLOGIA = {
    // Patrón principal para identificar prestaciones de imagenología
    PATRON_INCLUIR: "\\b(?:RAYOS|RADIOGRAF[IÍ]A|RX|EXAMENES RADIOLOGICOS SIMPLES|EXAMENES RADIOLOGICOS COMPLEJOS|TAC|TOMOGRAFIA AXIAL COMPUTARIZADA|TOMOGRAF[IÍ]A|RESONANCIA|RM|RESONANCIA MAGN[ÉE]TICA|ULTRASONOGRAF[IÍ]A|ECO|ECOGRAF[IÍ]A|ESC[AÁ]NER|SCANNER)\\b",

    // Patrones para EXCLUIR especialidades que no van a imagenología
    PATRONES_EXCLUIR_UNIFICADO: "MED\\.?\\s*NUCLEAR|RADIOTERAPIA|PET-CT|\\bPET\\b|KINE|FISIOTERAPIA|KINESIOLOGIA|PSIQUIATRIA|ENDOCRINOLOGIA|TIROIDES|NEUROLOGIA|NEUROCIRUGIA|OFTALMO|OFTALMOLOG[ÍI]A|OTORRINO|DERMATOLOGIA|CARDIO|CARDIOLOGIA|NEUMOLOG|TORAX|GASTRO|GASTROENTEROLOGIA|URO|NEFRO|UROLOG[ÍI]A|NEFROLOG[ÍI]A|DIALISIS|GINE|OBSTETRICIA|GINECOLOG[ÍI]A|TRANSVAGINAL|TRAUMATO|ORTOPEDICOS|ORTESIS|PROTESIS|ODONTO|ODONTOLOG[ÍI]A|ODONTOL[ÓO]GICOS",


    // Códigos específicos a excluir
    CODIGOS_EXCLUIR_IMAGENOLOGIA: [
        "04-01-001",  // (RAYOS) Radiografía de las glándulas salivales "sialografía"
        "04-01-004",  // (RAYOS) Radiografía de tórax, proyección complementaria
        "04-01-006",  // (RAYOS) Estudio radiológico de corazón
        "04-01-022",  // (RAYOS) Estudio radiológico de deglución faríngea
        "04-01-030",  // (RAYOS) Radiografía agujeros ópticos, ambos lados
        "04-01-034",  // (RAYOS) Radiografía de globo ocular, estudio de cuerpo extraño
        "04-01-057",  // (RAYOS) Radiografía Edad ósea : rodilla frontal
        "04-02-001",  // (RAYOS) Vía lagrimal (un lado)
        "04-02-005",  // (RAYOS) Galactografía, un lado
        "04-02-008",  // (RAYOS) Colangiopancreatografía endoscópica
        "04-02-009",  // (RAYOS) Fistulografía
        "04-02-012",  // (RAYOS) Pielografía ascendente
        "04-02-015",  // (RAYOS) Artrografía facetaria
        "04-02-016",  // (RAYOS) Discografía
        "04-02-017",  // (RAYOS) Neumoartrografía de cadera, hombro, codo, muñeca, etc.
        "04-02-018",  // (RAYOS) Neumoartrografía de rodilla
        "04-02-019",  // (RAYOS) Angiografía selectiva de carótida externa o interna
        "04-02-020",  // (RAYOS) Angiografía selectiva medular
        "04-02-024",  // (RAYOS) Aortografía con AOT o cineangiografía
        "04-02-025",  // (RAYOS) Arteriografía de cada extremidad
        "04-02-027",  // (RAYOS) Arteriografía selectiva con AOT o cineangiografía
        "04-02-029",  // (RAYOS) Carótida vertebral por cateterización
        "04-02-031",  // (RAYOS) Embolización o balonización
        "04-02-032",  // (RAYOS) Instalación de catéter o sonda intracardíaca
        "04-02-035",  // (RAYOS) Cavografía
        "04-02-038",  // (RAYOS) Flebografía extremidad inferior o superior
        "04-02-040",  // (RAYOS) Flebografía orbitaria o yugular
        "04-02-041",  // (RAYOS) Flebografía selectiva
        "04-02-050",  // (RAYOS) Mielografía por punción lumbar
        "04-03-004",  // (TAC) Tomografía Computarizada cortes coronales complementarios
        "04-03-009",  // (TAC) Tomografía Computarizada de columna dorsal o lumbar
        "04-03-010",  // (TAC) Cada espacio adicional
        "04-03-024",  // (TAC) Tomografía Computarizada Planificación Radioterapia
        "04-04-002",  // (ULTRASONOGRAFIA) Ecografía obstétrica
        "04-04-005",  // (ULTRASONOGRAFIA) Ecografía transvaginal o transrectal
        "04-04-007",  // (ULTRASONOGRAFIA) Ecografía transvaginal para seguimiento de ovulación
        "04-04-008",  // (ULTRASONOGRAFIA) Ecografía para seguimiento de ovulación
        "04-04-013",  // (ULTRASONOGRAFIA) Ecografía ocular, uno o ambos ojos
        "04-04-120",  // (ULTRASONOGRAFIA) Ecografía transcraneana
        "04-04-122",  // (ULTRASONOGRAFIA) Ecografía doppler de vasos placentarios
        "04-05-008",  // (RESONANCIA) Angiografía por resonancia
        "04-05-014",  // (RESONANCIA) Resonancia Magnética extremidad superior
        "04-05-015"   // (RESONANCIA) Resonancia Extremidad inferior
    ]
};

// =================================================================================
// CONFIRMAR UTLIZACIÓN DE ESTOS FILTROS PARA SEGUIMIENTO !!!!!!!!!!!!!!!!!!!!!!!!!!
// =================================================================================

/**
 * Filtro de exclusión para prestaciones ya realizadas
 */

const REGLAS_EXCLUSION_GLOBAL = {
    PATRON_REALIZADO: /REALIZAD[OAE]S?|EFECTUAD[AOE]S?|COMPLETAD[AOE]S?|FINALIZAD[AOE]S?|YA\s+SE\s+HIZO|TERMINAD[AOE]S?/i
};


/**
 * Filtro de orígenes de datos a excluír
 */

const ORIGENES_CA_EXCLUIDOS = [
    "FRANCISCA MUÑOZ",
    "GILDA CERDA",
    "MARÍA DÍAZ",
    "PAZ CASTRO"
];
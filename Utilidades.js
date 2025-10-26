// =================================================================================
// FUNCIONES AUXILIARES Y DE UTILIDAD
// =================================================================================

/**
 * Asegura que la hoja tenga los encabezados correctos. Si no, los restaura.
 */
function asegurarEncabezados(hoja, encabezados) {
    if (
        hoja.getLastRow() === 0 ||
        hoja.getRange(1, 1, 1, encabezados.length).getValues()[0].join('') !== encabezados.join('')
    ) {
        Logger.log("⚠️ ¡Encabezados no encontrados o corruptos! Restaurando...");
        hoja.clear();
        hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight("bold");
        SpreadsheetApp.flush();
    }
}

/**
 * Verifica la integridad de las columnas de seguimiento del consolidado final.
 */
function verificarEstructuraConsolidadoFinal() {
    const hojaFinal = SpreadsheetApp.openById(ID_CONSOLIDADO_FINAL).getSheetByName(NOMBRE_HOJA_FINAL);
    if (!hojaFinal) {
        Logger.log("ERROR: No se encontró la hoja del consolidado final");
        return;
    }
    const encabezadosActuales = hojaFinal.getRange(1, 1, 1, hojaFinal.getLastColumn()).getValues()[0];
    Logger.log("=== ESTRUCTURA DEL CONSOLIDADO FINAL ===");
    Logger.log(`Total de columnas: ${encabezadosActuales.length}`);
    Logger.log(`Columnas esperadas: ${ENCABEZADOS_FINALES.length}`);
    ENCABEZADOS_FINALES.forEach((columna, index) => {
        const actual = encabezadosActuales[index] || "[NO EXISTE]";
        const coincide = columna === actual ? "✅" : "❌";
        Logger.log(`${coincide} Columna ${index + 1}: "${columna}" ${coincide === "❌" ? `(actual: "${actual}")` : ""}`);
    });
    const indiceHoraAsignada = encabezadosActuales.indexOf('HORA ASIGNADA');
    if (indiceHoraAsignada > -1) {
        Logger.log(`\n📌 Columnas de seguimiento empiezan en: ${indiceHoraAsignada + 1}`);
        Logger.log("Columnas de seguimiento encontradas:");
        for (let i = indiceHoraAsignada; i < encabezadosActuales.length; i++) {
            Logger.log(`  - ${encabezadosActuales[i]}`);
        }
    }
}

/**
 * Busca la última fila con datos válidos según reglas de negocio.
 */
function encontrarUltimaFilaConDatosReales(sheet) {
    try {
        const rangoCompleto = sheet.getDataRange();
        const todosLosValores = rangoCompleto.getValues();
        const encabezados = todosLosValores.shift();
        // Índices de columnas clave
        const indiceRUN = encabezados.indexOf("RUN");
        const indiceNombre = encabezados.indexOf("NOMBRE COMPLETO");
        const indiceTipoPrest = encabezados.indexOf("TIPO_PREST");
        const indicePrestaMin1y2 = encabezados.indexOf("TIPO CONSULTA\n\n\nPRESTA_MIN\nTIPO=1 Y 2");
        const indicePrestaMin3 = encabezados.indexOf("PRESTA_MIN\nTIPO=3");
        const indicePrestaMin4 = encabezados.indexOf("PRESTA_MIN\nTIPO=4");
        const indiceOtroPresta = encabezados.indexOf("OTRO PRESTA_MIN");
        // Revisa desde la última fila hacia arriba
        for (let i = todosLosValores.length - 1; i >= 0; i--) {
            const filaActual = todosLosValores[i];
            if (filaActual.join("").trim() === "") continue;
            // Verifica si existe al menos un dato de prestación
            const tieneTipoPrest = filaActual[indiceTipoPrest] && String(filaActual[indiceTipoPrest]).trim() !== '';
            const tienePresta1y2 = filaActual[indicePrestaMin1y2] && String(filaActual[indicePrestaMin1y2]).trim() !== '';
            const tienePresta3 = filaActual[indicePrestaMin3] && String(filaActual[indicePrestaMin3]).trim() !== '';
            const tienePresta4 = filaActual[indicePrestaMin4] && String(filaActual[indicePrestaMin4]).trim() !== '';
            const tieneOtroPresta = filaActual[indiceOtroPresta] && String(filaActual[indiceOtroPresta]).trim() !== '';
            const tieneCualquierPrestacion = tieneTipoPrest || tienePresta1y2 || tienePresta3 || tienePresta4 || tieneOtroPresta;
            if (!tieneCualquierPrestacion) continue;
            // Si tiene prestación, comprueba si además tiene un RUN o un Nombre
            const tieneRun = filaActual[indiceRUN] && String(filaActual[indiceRUN]).trim() !== '';
            const tieneNombre = filaActual[indiceNombre] && String(filaActual[indiceNombre]).trim() !== '';
            if (tieneRun || tieneNombre) return i + 2;
        }
        return 0;
    } catch (e) {
        Logger.log(`Error en encontrarUltimaFilaConDatosReales: ${e.message}`);
        return 0;
    }
}

/**
 * Función de utilidad para crear un mapa de 'Nombre de Columna' -> 'Índice'.
 * @param {Array} encabezados - La primera fila de una hoja.
 * @returns {Object}
 */
function crearMapaColumnas(encabezados) {
    const mapa = {};
    encabezados.forEach((col, i) => { mapa[col] = i; });
    return mapa;
}

/**
 * Función para determinar si una prestación va a imagenología
 * @param {string} contextoCompleto - Texto combinado de prestación, obs y comentarios.
 * @param {string} codigoPrestacion - Código de la prestación.
 * @returns {Object} - Resultado con información detallada del filtrado.
 */
function evaluarPrestacionParaImagenologia(contextoCompleto, codigoPrestacion = '') {
    const resultado = {
        esImagenologia: false,
        razonExclusion: '',
        // Objeto de detalles simplificado, ya que las exclusiones son una sola regla.
        detalles: {
            coincidePatronPrincipal: false
        }
    };

    // El texto ya viene en mayúsculas desde el Paso 3, así que podemos usarlo directamente.
    const textoABuscar = contextoCompleto;

    if (!textoABuscar || typeof textoABuscar !== 'string' || textoABuscar.trim() === '') {
        resultado.razonExclusion = 'Contexto vacío o inválido';
        return resultado;
    }

    const codigoUpper = codigoPrestacion ? codigoPrestacion.toString().toUpperCase() : '';

    // 1. VERIFICAR SI COINCIDE CON PATRÓN PRINCIPAL DE IMAGENOLOGÍA
    const patronPrincipal = new RegExp(FILTROS_IMAGENOLOGIA.PATRON_INCLUIR, 'i');
    resultado.detalles.coincidePatronPrincipal = patronPrincipal.test(textoABuscar);

    if (!resultado.detalles.coincidePatronPrincipal) {
        resultado.razonExclusion = 'No es una prestación de imagenología';
        return resultado;
    }

    // 2. VERIFICAR EXCLUSIONES (se ejecutan sobre el mismo textoABuscar)

    const patronExclusion = new RegExp(FILTROS_IMAGENOLOGIA.PATRONES_EXCLUIR_UNIFICADO, 'i');
    if (patronExclusion.test(textoABuscar)) {
        resultado.razonExclusion = 'Prestación corresponde a otra especialidad (excluida)';
        return resultado;
    }

    if (FILTROS_IMAGENOLOGIA.CODIGOS_EXCLUIR_IMAGENOLOGIA.includes(codigoUpper.trim())) {
        resultado.razonExclusion = `Código excluído de Imagenología: ${codigoUpper}`;
        return resultado;
    }

    // 4. SI LLEGÓ HASTA AQUÍ, ES VÁLIDA PARA IMAGENOLOGÍA
    resultado.esImagenologia = true;
    resultado.razonExclusion = '';

    return resultado;
}

/**
 * Normaliza un valor de texto para una comparación segura.
 * Quita espacios al inicio/final y estandariza los saltos de línea.
 */
function normalizarTexto(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }
    return String(valor).trim().replace(/\r\n|\r/g, '\n');
}
// =================================================================================
// LÓGICA DE SINCRONIZACIÓN DE RETORNO
// =================================================================================

/**
 * Revisa todas las hojas de seguimiento y archiva cualquier fila que tenga datos de revisión nuevos que no estén en el historial.
 * Configurar en un activador para la actualización diaria.
 */
function archivarPendientesDiarios() {
    Logger.log("--- [Archivado] Iniciando archivado de seguimientos pendientes ---");
    let totalFilasArchivadas = 0;

    try {
        for (const key in CONFIG_PLANILLAS_SEGUIMIENTO) {
            const config = CONFIG_PLANILLAS_SEGUIMIENTO[key];
            let filasArchivadasEstaHoja = 0;

            try {
                const hoja = SpreadsheetApp.openById(config.id).getSheetByName(config.nombreHoja);
                if (hoja.getLastRow() <= 1) continue;
                Logger.log(`Revisando hoja: ${hoja.getParent().getName()}`);

                const rangoCompleto = hoja.getDataRange();
                const todosLosDatos = rangoCompleto.getValues();
                const encabezados = todosLosDatos.shift();
                const idxFecha = encabezados.indexOf('FECHA REVISIÓN');
                const idxEstado = encabezados.indexOf('ESTADO');
                const idxObs = encabezados.indexOf('OBS SEGUIMIENTO');
                const idxHistorial = encabezados.indexOf('HISTORIAL DE SEGUIMIENTO');

                if ([idxFecha, idxEstado, idxObs, idxHistorial].includes(-1)) {
                    Logger.log(`  -> Saltando hoja. No se encontraron todas las columnas.`);
                    continue;
                }

                todosLosDatos.forEach((fila, index) => {
                    const fecha = fila[idxFecha];
                    const estado = fila[idxEstado];
                    const obs = fila[idxObs];
                    const historial = fila[idxHistorial] || '';

                    if (!fecha && !estado && !obs) {
                        return;
                    }

                    const fechaFormateada = (fecha instanceof Date) ? Utilities.formatDate(fecha, Session.getScriptTimeZone(), 'dd/MM/yyyy') : fecha;
                    const nuevaEntrada = `[${fechaFormateada} - ${estado}]: ${obs}`;

                    if (!historial.includes(nuevaEntrada)) {
                        const nuevoHistorial = nuevaEntrada + (historial ? '\n' + historial : '');
                        hoja.getRange(index + 2, idxHistorial + 1).setValue(nuevoHistorial);
                        filasArchivadasEstaHoja++;
                    }
                });

                if (filasArchivadasEstaHoja > 0) {
                    Logger.log(`  -> Se archivaron ${filasArchivadasEstaHoja} seguimientos.`);
                    totalFilasArchivadas += filasArchivadasEstaHoja;
                }

            } catch (e) {
                Logger.log(`ERROR al procesar la hoja de ${config.nombreHoja}: ${e.message}`);
            }
        }
        Logger.log(`--- [Archivado] Finalizado. Total archivado: ${totalFilasArchivadas} ---`);

    } catch (err) {
        Logger.log(`ERROR CRÍTICO en archivarPendientesDiarios: ${err.message}`);
    }
}

/**
 * ACCIÓN 4: Sincroniza el retorno de datos hacia el "Consolidado Indicaciones".
 * Configurar en un activador para la actualización diaria (Ejecutar después del archivado de seguimientos pendientes).
 */

function Paso4_SincronizarRetornoDeDatos() {
    Logger.log("--- [PASO 4] INICIANDO SINCRONIZACIÓN DE RETORNO DE DATOS ---");
    try {
        const mapaDatosRetorno = new Map();
        const indiceIdSeguimiento = ENCABEZADOS_SEGUIMIENTO.indexOf(HEADER_ID_UNICO);
        const indicesColumnasRetorno = COLUMNAS_DE_RETORNO.map(h => ENCABEZADOS_SEGUIMIENTO.indexOf(h));

        // 1. Recolectar datos de seguimiento (getValues)
        for (const key in CONFIG_PLANILLAS_SEGUIMIENTO) {
            const config = CONFIG_PLANILLAS_SEGUIMIENTO[key];
            try {
                const hojaSeguimiento = SpreadsheetApp.openById(config.id).getSheetByName(config.nombreHoja);
                if (hojaSeguimiento.getLastRow() <= 1) continue;
                const datosSeguimiento = hojaSeguimiento.getRange(2, 1, hojaSeguimiento.getLastRow() - 1, hojaSeguimiento.getLastColumn()).getValues();
                datosSeguimiento.forEach(fila => {
                    const idUnico = fila[indiceIdSeguimiento];
                    if (idUnico) {
                        const valoresRetorno = indicesColumnasRetorno.map(indice => fila[indice]);
                        if (valoresRetorno.some(valor => valor !== undefined && valor !== null && valor !== '')) {
                            mapaDatosRetorno.set(idUnico, valoresRetorno);
                        }
                    }
                });
            } catch (e) { Logger.log(`⚠️ ERROR al leer la planilla ${key}: ${e.message}.`); }
        }

        if (mapaDatosRetorno.size === 0) {
            Logger.log("ℹ️ No se encontraron datos para retornar.");
            return;
        }

        // 2. Leer datos del consolidado
        const hojaFinal = SpreadsheetApp.openById(ID_CONSOLIDADO_FINAL).getSheetByName(NOMBRE_HOJA_FINAL);
        const rangoFinal = hojaFinal.getDataRange();
        const datosFinales = rangoFinal.getValues(); // Leemos los valores reales

        const encabezadosFinales = datosFinales[0];
        const indiceIdFinal = encabezadosFinales.indexOf(HEADER_ID_UNICO);
        const indicesRetornoFinal = COLUMNAS_DE_RETORNO.map(h => encabezadosFinales.indexOf(h));

        if (indiceIdFinal === -1 || indicesRetornoFinal.some(i => i === -1)) {
            Logger.log("❌ ERROR: Columnas no encontradas en Consolidado. Abortando.");
            return;
        }

        let cambiosRealizados = 0;

        // 3. Lógica de Comparación Normalizada (para escribir)
        for (let i = 1; i < datosFinales.length; i++) { // Iteramos sobre los datos reales
            const filaConsolidado = datosFinales[i];
            const idUnico = filaConsolidado[indiceIdFinal];

            if (mapaDatosRetorno.has(idUnico)) {
                const valoresSeguimiento = mapaDatosRetorno.get(idUnico);
                let filaModificada = false;

                indicesRetornoFinal.forEach((indiceColumna, j) => {
                    const nombreColumna = encabezadosFinales[indiceColumna];
                    let valConsolidado = filaConsolidado[indiceColumna];
                    let valSeguimiento = valoresSeguimiento[j];

                    // 1. Formatear Fechas para comparar
                    if (nombreColumna === 'FECHA REVISIÓN' && valConsolidado instanceof Date) {
                        valConsolidado = Utilities.formatDate(valConsolidado, Session.getScriptTimeZone(), 'dd/MM/yyyy');
                    }
                    if (nombreColumna === 'FECHA REVISIÓN' && valSeguimiento instanceof Date) {
                        valSeguimiento = Utilities.formatDate(valSeguimiento, Session.getScriptTimeZone(), 'dd/MM/yyyy');
                    }

                    // 2. Normalizar Texto para comparar
                    const valConsNorm = normalizarTexto(valConsolidado);
                    const valSegNorm = normalizarTexto(valSeguimiento);

                    if (valConsNorm !== valSegNorm) {
                        // Si son diferentes, actualizamos la matriz de datos REALES con el valor REAL de seguimiento
                        datosFinales[i][indiceColumna] = valoresSeguimiento[j]; // Actualizamos con el objeto original (fecha, texto, etc.)
                        filaModificada = true;
                    }
                });
                if (filaModificada) cambiosRealizados++;
            }
        }

        if (cambiosRealizados > 0) {
            rangoFinal.setValues(datosFinales);
            Logger.log(`✅ Se sincronizaron de vuelta ${cambiosRealizados} cambios al consolidado final.`);
        } else {
            Logger.log("✅ El consolidado final ya estaba sincronizado. No se realizaron cambios.");
        }
    } catch (e) {
        Logger.log(`❌ ERROR en Paso4_SincronizarRetornoDeDatos: ${e.message}\nStack: ${e.stack}`);
    }
    Logger.log("--- [PASO 4] SINCRONIZACIÓN DE RETORNO DE DATOS FINALIZADA ---");
}

/**
 * REVISA y CUENTA los cambios pendientes.
 */
function prepararSincronizacionDeRetorno() {
    Logger.log("--- [Pre-chequeo] Iniciando revisión de cambios para sincronizar ---");
    try {
        const mapaDatosRetorno = new Map();
        const indiceIdSeguimiento = ENCABEZADOS_SEGUIMIENTO.indexOf(HEADER_ID_UNICO);
        const indicesColumnasRetorno = COLUMNAS_DE_RETORNO.map(h => ENCABEZADOS_SEGUIMIENTO.indexOf(h));

        // 1. Recolectar datos de las planillas de seguimiento (usamos getValues() de nuevo)
        for (const key in CONFIG_PLANILLAS_SEGUIMIENTO) {
            const config = CONFIG_PLANILLAS_SEGUIMIENTO[key];
            try {
                const hojaSeguimiento = SpreadsheetApp.openById(config.id).getSheetByName(config.nombreHoja);
                if (hojaSeguimiento.getLastRow() <= 1) continue;
                const datosSeguimiento = hojaSeguimiento.getRange(2, 1, hojaSeguimiento.getLastRow() - 1, hojaSeguimiento.getLastColumn()).getValues(); // VOLVEMOS A GETVALUES()

                datosSeguimiento.forEach(fila => {
                    const idUnico = fila[indiceIdSeguimiento];
                    if (idUnico) {
                        const valoresRetorno = indicesColumnasRetorno.map(indice => fila[indice]);
                        if (valoresRetorno.some(valor => valor !== undefined && valor !== null && valor !== '')) {
                            mapaDatosRetorno.set(idUnico, valoresRetorno);
                        }
                    }
                });
            } catch (e) { /* Ignorar errores de lectura */ }
        }

        if (mapaDatosRetorno.size === 0) return 0;

        // 2. Comparar con el consolidado final
        const hojaFinal = SpreadsheetApp.openById(ID_CONSOLIDADO_FINAL).getSheetByName(NOMBRE_HOJA_FINAL);
        const datosFinales = hojaFinal.getDataRange().getValues();
        const encabezadosFinales = datosFinales[0]; // Encabezados reales
        const indiceIdFinal = encabezadosFinales.indexOf(HEADER_ID_UNICO);
        const indicesRetornoFinal = COLUMNAS_DE_RETORNO.map(h => encabezadosFinales.indexOf(h));

        let cambiosContados = 0;

        // Iteramos desde 1 para saltar encabezados
        for (let i = 1; i < datosFinales.length; i++) {
            const filaConsolidado = datosFinales[i];
            const idUnico = filaConsolidado[indiceIdFinal];

            if (mapaDatosRetorno.has(idUnico)) {
                const valoresSeguimiento = mapaDatosRetorno.get(idUnico);
                let filaModificada = false;

                indicesRetornoFinal.forEach((indiceColumna, j) => {
                    const nombreColumna = encabezadosFinales[indiceColumna];
                    let valConsolidado = filaConsolidado[indiceColumna];
                    let valSeguimiento = valoresSeguimiento[j];

                    // 1. Formatear Fechas: Si la columna es FECHA REVISIÓN y el valor es una Fecha, convertirlo a texto estándar.
                    if (nombreColumna === 'FECHA REVISIÓN' && valConsolidado instanceof Date) {
                        valConsolidado = Utilities.formatDate(valConsolidado, Session.getScriptTimeZone(), 'dd/MM/yyyy');
                    }
                    if (nombreColumna === 'FECHA REVISIÓN' && valSeguimiento instanceof Date) {
                        valSeguimiento = Utilities.formatDate(valSeguimiento, Session.getScriptTimeZone(), 'dd/MM/yyyy');
                    }

                    // 2. Normalizar Texto: Convertir todo lo demás a texto normalizado para comparar.
                    const valConsNorm = normalizarTexto(valConsolidado);
                    const valSegNorm = normalizarTexto(valSeguimiento);

                    if (valConsNorm !== valSegNorm) {
                        filaModificada = true;
                    }
                });
                if (filaModificada) cambiosContados++;
            }
        }

        Logger.log(`--- [Pre-chequeo] Se encontraron ${cambiosContados} cambios pendientes.`);
        return cambiosContados;

    } catch (e) {
        Logger.log(`ERROR en pre-chequeo: ${e.message} ${e.stack}`);
        return -1;
    }
}
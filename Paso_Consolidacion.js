// =================================================================================
// LÓGICA DE CONSOLIDACIÓN DE DATOS
// =================================================================================

/**
 * ACCIÓN 1: Ejecutar solo UNA VEZ para la carga inicial con el sistema de HASH.
 */
function Paso1_CargaInicialCompleta_CON_HASH() {
    Logger.log("--- [PASO 1] INICIANDO CARGA INICIAL COMPLETA ---");
    ejecutarCargaCompletaConHash("Cajas", ID_CARPETA_MADRE_CAJAS, ID_CONSOLIDADO_CAJAS, NOMBRE_HOJA_CAJAS);
    ejecutarCargaCompletaConHash("CA", ID_CARPETA_MADRE_CA, ID_CONSOLIDADO_CA, NOMBRE_HOJA_CA);
    actualizarConsolidadoFinal();
    Logger.log("✅ CARGA INICIAL CON HASH FINALIZADA ✅");
}

/**
 * ACCIÓN 2: Configurar en un activador para la actualización diaria (nuevos + modificados).
 */
function Paso2_ActualizacionPorContenido_Diaria() {
    Logger.log("--- [PASO 2] INICIANDO ACTUALIZACIÓN DIARIA POR CONTENIDO ---");
    ejecutarActualizacionPorContenido("Cajas", ID_CARPETA_MADRE_CAJAS, ID_CONSOLIDADO_CAJAS, NOMBRE_HOJA_CAJAS);
    ejecutarActualizacionPorContenido("CA", ID_CARPETA_MADRE_CA, ID_CONSOLIDADO_CA, NOMBRE_HOJA_CA);
    actualizarConsolidadoFinal();
    Logger.log("✅ ACTUALIZACIÓN DIARIA POR CONTENIDO FINALIZADA ✅");
}

/**
 * Realiza la carga completa de todos los archivos de una carpeta madre a un consolidado intermedio, generando hashes.
 */
function ejecutarCargaCompletaConHash(tipo, idCarpeta, idConsolidado, nombreHoja) {
    const hojaDestino = SpreadsheetApp.openById(idConsolidado).getSheetByName(nombreHoja);
    if (!hojaDestino) { Logger.log(`Error: No se encontró la hoja ${nombreHoja}`); return; }
    asegurarEncabezados(hojaDestino, ENCABEZADOS_INTERMEDIOS);
    if (hojaDestino.getLastRow() > 1) {
        hojaDestino.getRange(2, 1, hojaDestino.getMaxRows() - 1, hojaDestino.getLastColumn()).clearContent();
    }
    const todasLasFilas = [];
    const carpetaMadre = DriveApp.getFolderById(idCarpeta);
    const subcarpetas = carpetaMadre.getFolders();
    while (subcarpetas.hasNext()) {
        const subcarpeta = subcarpetas.next();
        const archivos = subcarpeta.getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
            const archivo = archivos.next();
            const datosExtraidos = obtenerDatosConHash(archivo.getId());
            if (datosExtraidos) {
                todasLasFilas.push(...datosExtraidos);
            }
        }
    }
    if (todasLasFilas.length > 0) {
        hojaDestino.getRange(2, 1, todasLasFilas.length, todasLasFilas[0].length).setValues(todasLasFilas);
        Logger.log(`Carga completa para "${nombreHoja}": Se cargaron ${todasLasFilas.length} filas.`);
    }
}

/**
 * Actualiza un consolidado intermedio solo con filas nuevas o modificadas, usando hashes.
 */
function ejecutarActualizacionPorContenido(tipo, idCarpeta, idConsolidado, nombreHoja) {
    Logger.log(`--- Iniciando actualización para: ${tipo} ---`);
    const hojaDestino = SpreadsheetApp.openById(idConsolidado).getSheetByName(nombreHoja);
    if (!hojaDestino) return;
    asegurarEncabezados(hojaDestino, ENCABEZADOS_INTERMEDIOS);

    const encabezados = hojaDestino.getRange(1, 1, 1, hojaDestino.getLastColumn()).getValues()[0];
    const indiceId = encabezados.indexOf(HEADER_ID_UNICO);
    const indiceHash = encabezados.indexOf(HEADER_HASH);
    if (indiceId === -1 || indiceHash === -1) {
        Logger.log(`ERROR: Faltan columnas auxiliares en ${nombreHoja}.`);
        return;
    }

    const mapaExistente = new Map();
    if (hojaDestino.getLastRow() > 1) {
        hojaDestino.getRange(2, 1, hojaDestino.getLastRow() - 1, hojaDestino.getLastColumn()).getValues().forEach(fila => {
            if (fila[indiceId]) mapaExistente.set(fila[indiceId], fila[indiceHash]);
        });
    }
    Logger.log(`Total de filas actuales en "${nombreHoja}": ${mapaExistente.size}`);

    const filasNuevas = [], filasModificadas = [], idsParaMantener = new Set();
    const carpetaMadre = DriveApp.getFolderById(idCarpeta);
    const subcarpetas = carpetaMadre.getFolders();
    while (subcarpetas.hasNext()) {
        const subcarpeta = subcarpetas.next();
        const archivos = subcarpeta.getFilesByType(MimeType.GOOGLE_SHEETS);
        while (archivos.hasNext()) {
            const archivo = archivos.next();
            const datosOrigen = obtenerDatosConHash(archivo.getId());
            if (datosOrigen) {
                datosOrigen.forEach(filaConMetadatos => {
                    const idActual = filaConMetadatos[indiceId];
                    const hashActual = filaConMetadatos[indiceHash];
                    if (!mapaExistente.has(idActual)) {
                        filasNuevas.push(filaConMetadatos);
                        Logger.log(`  [+] Fila NUEVA encontrada en el archivo: "${archivo.getName()}"`);
                    } else if (mapaExistente.get(idActual) !== hashActual) {
                        filasModificadas.push(filaConMetadatos);
                        Logger.log(`  [*] Fila MODIFICADA encontrada en el archivo: "${archivo.getName()}"`);
                    } else {
                        idsParaMantener.add(idActual);
                    }
                });
            }
        }
    }

    if (filasNuevas.length === 0 && filasModificadas.length === 0) {
        Logger.log(`➡️ No se encontraron filas nuevas o modificadas para "${tipo}".`);
        return;
    }

    Logger.log("--- RESUMEN DE CAMBIOS ---");
    Logger.log(`Total de Filas Nuevas a agregar: ${filasNuevas.length}`);
    Logger.log(`Total de Filas Modificadas a actualizar: ${filasModificadas.length}`);

    // Mantener filas antiguas sin cambios
    const datosAntiguosSinCambios = [];
    if (hojaDestino.getLastRow() > 1) {
        hojaDestino.getDataRange().getValues().slice(1).forEach(fila => {
            if (idsParaMantener.has(fila[indiceId])) datosAntiguosSinCambios.push(fila);
        });
    }

    if (hojaDestino.getMaxRows() > 1) {
        hojaDestino.getRange(2, 1, hojaDestino.getMaxRows() - 1, hojaDestino.getLastColumn()).clearContent();
    }

    const datosFinales = [...datosAntiguosSinCambios, ...filasNuevas, ...filasModificadas];
    if (datosFinales.length > 0) {
        hojaDestino.getRange(2, 1, datosFinales.length, datosFinales[0].length).setValues(datosFinales);
    }
    Logger.log(`Actualización para "${nombreHoja}" completada. Total final de filas: ${datosFinales.length}.`);
}

/**
 * Extrae los datos de una hoja "NUEVA LE" y les agrega ID único y hash de contenido.
 */
function obtenerDatosConHash(archivoId) {
    try {
        const spreadsheet = SpreadsheetApp.openById(archivoId);
        const spreadsheetName = spreadsheet.getName();
        const hoja = spreadsheet.getSheetByName("NUEVA LE");
        if (!hoja) return null;

        const ultimaFilaReal = encontrarUltimaFilaConDatosReales(hoja);
        if (ultimaFilaReal < 2) return null;

        // 1. Leemos los VALORES REALES (objetos de Fecha, números, etc.)
        const datos = hoja.getRange(2, 1, ultimaFilaReal - 1, hoja.getLastColumn()).getValues();
        // 2. Leemos los VALORES DE TEXTO por separado, solo para columnas específicas (como la hora)
        const datosTexto = hoja.getRange(2, 1, ultimaFilaReal - 1, hoja.getLastColumn()).getDisplayValues();

        const columnasSeleccionadas = [1, 4, 5, 6, 10, 11, 13, 14, 15, 16, 28, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
        const indiceId = ENCABEZADOS_INTERMEDIOS.indexOf(HEADER_ID_UNICO);
        const indiceHash = ENCABEZADOS_INTERMEDIOS.indexOf(HEADER_HASH);

        const POSICION_CODIGO_PRESTACION = ENCABEZADOS_INTERMEDIOS.indexOf('CODIGO DE PRESTACION') - 1; // -1 porque es sobre la fila procesada
        const POSICION_HORA_EN_FILA_PROCESADA = ENCABEZADOS_INTERMEDIOS.indexOf('HORA DE CITACIÓN') - 1; // -1 porque es sobre la fila procesada

        return datos.map((fila, index) => { // Iteramos sobre los datos REALES
            const numFilaOriginal = index + 2;
            const idUnico = `${archivoId}|${numFilaOriginal}`;

            // 3. Mapeo usando el índice correcto (colIndex - 1)
            const filaProcesada = columnasSeleccionadas.map((i, idx) => {
                // Si el índice corresponde a la HORA o al CÓDIGO DE PRESTACIÓN, leemos el valor de TEXTO para evitar problemas de formato.
                if (idx === POSICION_HORA_EN_FILA_PROCESADA || idx === POSICION_CODIGO_PRESTACION) {
                    return datosTexto[index][i] || "";
                }
                return fila[i] !== undefined ? fila[i] : "";
            });

            // 4. Aplicamos la limpieza y blindaje del código de prestación
            let codigo = filaProcesada[POSICION_CODIGO_PRESTACION];
            if (codigo) {
                // 4.1. Limpieza de apóstrofes/comillas
                codigo = String(codigo).replace(/^['"]+/, '');
                // 4.2. Estandarización final con apóstrofe
                filaProcesada[POSICION_CODIGO_PRESTACION] = "'" + codigo;
            }

            const contenidoParaHash = filaProcesada.join('|');
            const hashBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, contenidoParaHash, Utilities.Charset.UTF_8);
            const hash = hashBytes.map(b => (b + 256).toString(16).slice(-2)).join('');

            const filaConDatos = [spreadsheetName, ...filaProcesada];
            filaConDatos[indiceId] = idUnico;
            filaConDatos[indiceHash] = hash;
            return filaConDatos;
        }).filter(fila => fila);
    } catch (e) {
        Logger.log(`Error en obtenerDatosConHash para archivo ${archivoId}: ${e.message}`);
        return null;
    }
}

/**
 * Sincroniza los datos de los consolidados intermedios con el consolidado final, preservando columnas de seguimiento.
 */
function actualizarConsolidadoFinal() {
    Logger.log("--- Iniciando sincronización inteligente del Consolidado Indicaciones ---");
    try {
        const hojaFinal = SpreadsheetApp.openById(ID_CONSOLIDADO_FINAL).getSheetByName(NOMBRE_HOJA_FINAL);
        const hojaCajas = SpreadsheetApp.openById(ID_CONSOLIDADO_CAJAS).getSheetByName(NOMBRE_HOJA_CAJAS);
        const hojaCA = SpreadsheetApp.openById(ID_CONSOLIDADO_CA).getSheetByName(NOMBRE_HOJA_CA);
        if (!hojaFinal || !hojaCajas || !hojaCA) {
            Logger.log("Error: No se encontró una de las hojas de consolidado.");
            return;
        }
        asegurarEncabezados(hojaFinal, ENCABEZADOS_FINALES);
        const numColumnasOriginales = ENCABEZADOS_INTERMEDIOS.length;

        // Cargar datos de fuentes intermedias
        const mapaFuentes = new Map();
        const encabezadosIntermedios = hojaCajas.getRange(1, 1, 1, hojaCajas.getLastColumn()).getValues()[0];
        const indiceIdIntermedio = encabezadosIntermedios.indexOf(HEADER_ID_UNICO);
        const indiceHashIntermedio = encabezadosIntermedios.indexOf(HEADER_HASH);
        const indiceCodigoPrestacion = encabezadosIntermedios.indexOf('CODIGO DE PRESTACION'); // Obtenemos el índice

        if (hojaCajas.getLastRow() > 1) {
            hojaCajas.getRange(2, 1, hojaCajas.getLastRow() - 1, hojaCajas.getLastColumn()).getValues().forEach(fila => {
                if (fila[indiceIdIntermedio]) {
                    // Volvemos a blindar el código de prestación para protegerlo en el paso final.
                    if (indiceCodigoPrestacion !== -1 && fila[indiceCodigoPrestacion]) {
                        fila[indiceCodigoPrestacion] = "'" + String(fila[indiceCodigoPrestacion]).replace(/^['"]+/, '');
                    }
                    mapaFuentes.set(fila[indiceIdIntermedio], { data: fila, hash: fila[indiceHashIntermedio] });
                }
            });
        }
        if (hojaCA.getLastRow() > 1) {
            hojaCA.getRange(2, 1, hojaCA.getLastRow() - 1, hojaCA.getLastColumn()).getValues().forEach(fila => {
                if (fila[indiceIdIntermedio]) {
                    if (indiceCodigoPrestacion !== -1 && fila[indiceCodigoPrestacion]) {
                        fila[indiceCodigoPrestacion] = "'" + String(fila[indiceCodigoPrestacion]).replace(/^['"]+/, '');
                    }
                    mapaFuentes.set(fila[indiceIdIntermedio], { data: fila, hash: fila[indiceHashIntermedio] });
                }
            });
        }
        Logger.log(`Total de registros en fuentes intermedias: ${mapaFuentes.size}`);
        // Cargar estado actual de la hoja final
        const mapaFinal = new Map();
        const encabezadosFinales = hojaFinal.getRange(1, 1, 1, hojaFinal.getLastColumn()).getValues()[0];
        const indiceIdFinal = encabezadosFinales.indexOf(HEADER_ID_UNICO);
        const indiceHashFinal = encabezadosFinales.indexOf(HEADER_HASH);
        if (indiceIdFinal === -1 || indiceHashFinal === -1) {
            Logger.log("ERROR: No se encontraron las columnas ID_UNICO o HASH en el consolidado final");
            return;
        }
        if (hojaFinal.getLastRow() > 1) {
            hojaFinal.getRange(2, 1, hojaFinal.getLastRow() - 1, hojaFinal.getLastColumn()).getValues().forEach((fila, index) => {
                if (fila[indiceIdFinal]) {
                    mapaFinal.set(fila[indiceIdFinal], { fila: fila, numeroFila: index + 2, hash: fila[indiceHashFinal] });
                }
            });
        }
        Logger.log(`Total de registros actuales en consolidado final: ${mapaFinal.size}`);
        // Comparar y decidir qué hacer
        const filasNuevas = [], filasParaModificar = [];
        let contadorSinCambios = 0;
        mapaFuentes.forEach((infoFuente, id) => {
            if (!mapaFinal.has(id)) {
                filasNuevas.push(infoFuente.data);
            } else {
                const infoFinal = mapaFinal.get(id);
                if (infoFuente.hash !== infoFinal.hash) {
                    filasParaModificar.push({ numeroFila: infoFinal.numeroFila, nuevaData: infoFuente.data, filaExistente: infoFinal.fila });
                } else {
                    contadorSinCambios++;
                }
            }
        });
        // Aplicar los cambios
        if (filasParaModificar.length > 0) {
            Logger.log(`Actualizando ${filasParaModificar.length} filas modificadas...`);
            filasParaModificar.forEach(item => {
                const filaActualizada = [...item.filaExistente];
                for (let i = 0; i < numColumnasOriginales; i++) {
                    if (i < item.nuevaData.length) filaActualizada[i] = item.nuevaData[i];
                }
                hojaFinal.getRange(item.numeroFila, 1, 1, filaActualizada.length).setValues([filaActualizada]);
            });
            Logger.log(`✅ Se actualizaron ${filasParaModificar.length} filas.`);
        }
        if (filasNuevas.length > 0) {
            Logger.log(`Agregando ${filasNuevas.length} filas nuevas...`);
            const anchoFinal = ENCABEZADOS_FINALES.length;
            const nuevasFilasFormateadas = filasNuevas.map(fila => {
                const filaCompleta = [];
                for (let i = 0; i < numColumnasOriginales; i++) {
                    filaCompleta[i] = i < fila.length ? fila[i] : "";
                }
                for (let i = numColumnasOriginales; i < anchoFinal; i++) {
                    filaCompleta[i] = "";
                }
                return filaCompleta;
            });
            hojaFinal.getRange(hojaFinal.getLastRow() + 1, 1, nuevasFilasFormateadas.length, anchoFinal).setValues(nuevasFilasFormateadas);
            Logger.log(`✅ Se agregaron ${filasNuevas.length} filas nuevas.`);
        }
        // Resumen final
        const totalFilas = hojaFinal.getLastRow() > 1 ? hojaFinal.getLastRow() - 1 : 0;
        Logger.log("--- RESUMEN DE SINCRONIZACIÓN ---");
        Logger.log(`Total de filas en Consolidado Final: ${totalFilas}`);
        Logger.log(`Filas sin cambios: ${contadorSinCambios}`);
        Logger.log(`Filas actualizadas: ${filasParaModificar.length}`);
        Logger.log(`Filas nuevas: ${filasNuevas.length}`);
        Logger.log(`Columnas de datos originales: ${numColumnasOriginales}`);
        Logger.log(`Total de columnas (con seguimiento): ${ENCABEZADOS_FINALES.length}`);
    } catch (e) {
        Logger.log(`ERROR al sincronizar el Consolidado Final: ${e.message}`);
        Logger.log(`Stack trace: ${e.stack}`);
    }
}
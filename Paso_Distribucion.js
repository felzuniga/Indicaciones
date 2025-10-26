// =================================================================================
// LÓGICA DE DISTRIBUCIÓN A HOJAS DE TRABAJO
// =================================================================================

/**
 * ACCIÓN 3: Distribuye datos del consolidado final a las hojas de trabajo de seguimiento.
 * Configurar en un activador para la actualización diaria (Ejecutar después de la actualización del consolidado final).
 */
function Paso3_DistribuirAHojasTrabajo() {
    Logger.log("--- [PASO 3] INICIANDO DISTRIBUCIÓN A PLANILLAS DE SEGUIMIENTO ---");
    try {
        // Cargar la base de datos de contactabilidad en memoria
        const mapaContactos = new Map();
        // Apunta a la hoja correcta "BD Contact Limpia".
        const hojaContactos = SpreadsheetApp.openById(ID_BASE_CONTACTABILIDAD).getSheetByName("BD Contact Limpia");
        if (hojaContactos && hojaContactos.getLastRow() > 1) {
            const datosContactos = hojaContactos.getRange(2, 1, hojaContactos.getLastRow() - 1, 4).getValues(); // Lee columnas A, B, C, D
            datosContactos.forEach(fila => {
                const run = fila[0] ? fila[0].toString().trim() : null; // RUN en la primera columna (A)
                if (run) {
                    mapaContactos.set(run, {
                        fonoFijo: fila[1] || '',  // Fono_Fijo en columna B
                        fonoMovil: fila[2] || '', // Fono_Movil en columna C
                        email: fila[3] || ''      // Email en columna D
                    });
                }
            });
            Logger.log(`📞 Base de contactabilidad cargada con ${mapaContactos.size} registros.`);
        } else {
            Logger.log(`⚠️ No se pudo encontrar la hoja "BD Contact Limpia" o está vacía. Se continuará sin datos de contacto.`);
        }

        const hojaConsolidado = SpreadsheetApp.openById(ID_CONSOLIDADO_FINAL).getSheetByName(NOMBRE_HOJA_FINAL);
        if (hojaConsolidado.getLastRow() <= 1) {
            Logger.log("⚠️ No hay datos en el consolidado final para distribuir. Proceso omitido.");
            return;
        }

        const datosOrigen = hojaConsolidado.getDataRange().getValues();
        const encabezadosOrigen = datosOrigen.shift();
        const mapaColumnasOrigen = crearMapaColumnas(encabezadosOrigen);

        for (const key in CONFIG_PLANILLAS_SEGUIMIENTO) {
            const config = CONFIG_PLANILLAS_SEGUIMIENTO[key];
            Logger.log(`\n🔄️ Procesando destino: ${key}`);

            // 1. Filtrar los datos del consolidado que corresponden a este destino
            const datosFiltrados = datosOrigen.filter(fila => {

                // --- INICIO DE FILTROS GLOBALES DE EXCLUSIÓN ---

                //== FILTRO 1: EXCLUIR PRESTACIONES YA REALIZADAS (DESCOMENTAR PARA ACTIVAR) ==
                const prestacionFiltro = String(fila[mapaColumnasOrigen['PROCEDIMIENTO']] || fila[mapaColumnasOrigen['TIPO CONSULTA']] || fila[mapaColumnasOrigen['CIRUGÍA']] || fila[mapaColumnasOrigen['OTRA PRESTACIÓN']] || '');
                const obsFiltro = String(fila[mapaColumnasOrigen['OBSERVACIONES']] || '');
                const comFiltro = String(fila[mapaColumnasOrigen['COMENTARIOS']] || '');
                const textoCompleto = `${prestacionFiltro} ${obsFiltro} ${comFiltro}`.toUpperCase();

                if (REGLAS_EXCLUSION_GLOBAL.PATRON_REALIZADO.test(textoCompleto)) {
                    return false; // Excluir esta fila
                }


                //== FILTRO 2: EXCLUIR ORÍGENES ESPECÍFICOS DE CA (DESCOMENTAR PARA ACTIVAR) ==
                const archivoOrigen = String(fila[mapaColumnasOrigen['ARCHIVO ORIGEN']] || '').toUpperCase();
                const esOrigenExcluido = ORIGENES_CA_EXCLUIDOS.some(nombre => archivoOrigen.includes(nombre));

                if (esOrigenExcluido) {
                    return false; // Excluir esta fila
                }


                // --- FIN DE FILTROS GLOBALES DE EXCLUSIÓN ---

                const tipoPrest = fila[mapaColumnasOrigen['TIPO_PREST']];
                if (!config.filtro.includes(tipoPrest)) {
                    return false;
                }

                // --- LÓGICA PARA LA DIVISIÓN EN 3 GRUPOS ---
                if (tipoPrest === "3.-PROCEDIMIENTO") {

                    const prestacionTexto = String(fila[mapaColumnasOrigen['PROCEDIMIENTO']] || '').trim().toUpperCase();
                    const obsTexto = String(fila[mapaColumnasOrigen['OBSERVACIONES']] || '').trim().toUpperCase();
                    const comTexto = String(fila[mapaColumnasOrigen['COMENTARIOS']] || '').trim().toUpperCase();

                    const contextoCompleto = `${prestacionTexto} ${obsTexto} ${comTexto}`; // El texto completo para buscar PET-CT             
                    const codigo = String(fila[mapaColumnasOrigen['CODIGO DE PRESTACION']] || '');

                    // --- REGLA 1: DEFINICIÓN DE MED. NUCLEAR ---

                    // Regla 1.A: La columna PROCEDIMIENTO comienza con (MED. NUCLEAR)
                    const reglaTextoProc = prestacionTexto.includes('(MED. NUCLEAR)');

                    // Regla 1.B: O el CONTEXTO TOTAL contiene PET-CT o PET
                    const reglaTextoPET = contextoCompleto.includes('PET-CT') || /\bPET\b/.test(contextoCompleto);

                    // Un caso es Med Nuclear SI cumple CUALQUIERA de las dos reglas
                    const esMedNuclear = reglaTextoProc || reglaTextoPET;

                    if (key === "MED_NUCLEAR") {
                        return esMedNuclear; // Si cumple la regla, enviarlo aquí.
                    }

                    // --- REGLA 2: IDENTIFICAR IMAGENOLOGÍA ---
                    // (La función evaluar... ya excluye PET-CT y (MED. NUCLEAR) gracias a la Config)
                    const evaluacionImg = evaluarPrestacionParaImagenologia(contextoCompleto, codigo);

                    if (key === "IMAGENOLOGIA") {
                        return evaluacionImg.esImagenologia && !esMedNuclear; // Es Imagen PERO NO es Med Nuclear
                    }

                    // --- REGLA 3: PROCEDIMIENTO GENERAL ---
                    if (key === "3") {
                        return !esMedNuclear && !evaluacionImg.esImagenologia; // NO es Med Nuclear Y TAMPOCO es Imagen
                    }
                }

                return true; // Para todos los demás casos (consultas, exámenes, etc.)
            });

            if (datosFiltrados.length === 0) {
                Logger.log(`  -> No se encontraron filas para este destino.`);
                continue;
            }
            Logger.log(`  -> Se encontraron ${datosFiltrados.length} filas.`);

            // Pasamos el mapaContactos a la función de mapeo
            const datosMapeados = datosFiltrados.map(fila => mapearFilaParaSeguimiento(fila, mapaColumnasOrigen, mapaContactos));

            actualizarHojaSeguimiento(config.id, config.nombreHoja, datosMapeados);
        }

    } catch (e) {
        Logger.log(`❌ ERROR en Paso3_DistribuirAHojasTrabajo: ${e.message}\nStack: ${e.stack}`);
    }
    Logger.log("--- [PASO 3] DISTRIBUCIÓN A PLANILLAS DE SEGUIMIENTO FINALIZADA ---");
}

/**
 * Función auxiliar para mapear una fila del consolidado al formato de seguimiento.
 * @param {Array} filaConsolidado - La fila de datos del consolidado.
 * @param {Object} mapaColumnas - Objeto que mapea nombres de columna a índices.
 * @param {Map} mapaContactos - El mapa con los datos de contacto.
 * @returns {Array} - La fila formateada según ENCABEZADOS_SEGUIMIENTO.
 */
function mapearFilaParaSeguimiento(filaConsolidado, mapaColumnas, mapaContactos) {
    const tipoPrest = filaConsolidado[mapaColumnas['TIPO_PREST']];
    const run = (filaConsolidado[mapaColumnas['RUN']] || '').toString().trim();
    // Búsqueda de datos de contacto
    const contacto = mapaContactos.get(run) || { fonoFijo: '', fonoMovil: '', email: '' };
    // Lógica para obtener la prestación correcta según el TIPO_PREST
    let prestacion;
    switch (tipoPrest) {
        case "1.-CONSULTA MEDICA":
        case "2.-CONSULTA REPETIDA O CONTROL":
            prestacion = filaConsolidado[mapaColumnas['TIPO CONSULTA']]; break;
        case "3.-PROCEDIMIENTO":
            prestacion = filaConsolidado[mapaColumnas['PROCEDIMIENTO']]; break;
        case "4.-QUIRURGICO":
        case "5.-QUIRURGICO COMPLEJO":
            prestacion = filaConsolidado[mapaColumnas['CIRUGÍA']]; break;
        case "6.-HOSPITALIZACION":
        case "7.-EXAMENES":
            prestacion = filaConsolidado[mapaColumnas['OTRA PRESTACIÓN']]; break;
        default:
            prestacion = '';
    }

    // Se construye la fila en el orden exacto de ENCABEZADOS_SEGUIMIENTO
    return [
        filaConsolidado[mapaColumnas['ARCHIVO ORIGEN']] || '',
        filaConsolidado[mapaColumnas['RUN']] || '',
        filaConsolidado[mapaColumnas['DV']] || '',
        filaConsolidado[mapaColumnas['Id Caso']] || '',
        filaConsolidado[mapaColumnas['No de casos']] || '',
        filaConsolidado[mapaColumnas['Fecha de Edición']] || '',
        filaConsolidado[mapaColumnas['NOMBRE COMPLETO']] || '',
        tipoPrest || '',
        prestacion || '',
        // Se asegura de que el código siempre se trate como texto en la hoja de destino.
        filaConsolidado[mapaColumnas['CODIGO DE PRESTACION']] ? "'" + String(filaConsolidado[mapaColumnas['CODIGO DE PRESTACION']]).replace(/^['"]+/, '') : '',
        filaConsolidado[mapaColumnas['FECHA DE ENTRADA']] || '',
        filaConsolidado[mapaColumnas['FECHA DE CITACIÓN']] || '',
        filaConsolidado[mapaColumnas['HORA DE CITACIÓN']] || '',
        filaConsolidado[mapaColumnas['OBSERVACIONES']] || '',
        filaConsolidado[mapaColumnas['COMENTARIOS']] || '',
        contacto.fonoFijo, //FONO FIJO (desde la BD)
        contacto.fonoMovil, // FONO MOVIL (desde la BD)
        contacto.email, // EMAIL (desde la BD)
        '', // FECHA REVISIÓN (se deja en blanco en la carga)
        '', // ESTADO (se deja en blanco en la carga)
        '', // OBS SEGUIMIENTO (se deja en blanco en la carga)
        '', // HISTORIAL SEGUIMIENTO  (se deja en blanco en la carga)
        filaConsolidado[mapaColumnas[HEADER_ID_UNICO]] || '',
        filaConsolidado[mapaColumnas[HEADER_HASH]] || ''
    ];
}

/**
 * Función auxiliar que actualiza una hoja de destino de forma incremental.
 * Preserva los datos de las columnas de retorno si una fila se modifica.
 * @param {string} idPlanilla - El ID de la planilla de destino.
 * @param {string} nombreHoja - El nombre de la hoja dentro de la planilla.
 * @param {Array<Array>} datosParaEscribir - Los datos ya filtrados y mapeados.
 */
function actualizarHojaSeguimiento(idPlanilla, nombreHoja, datosParaEscribir) {
    try {
        const hojaDestino = SpreadsheetApp.openById(idPlanilla).getSheetByName(nombreHoja);
        asegurarEncabezados(hojaDestino, ENCABEZADOS_SEGUIMIENTO);

        const indiceId = ENCABEZADOS_SEGUIMIENTO.indexOf(HEADER_ID_UNICO);
        const indiceHash = ENCABEZADOS_SEGUIMIENTO.indexOf(HEADER_HASH);
        const indicesRetorno = COLUMNAS_DE_RETORNO.map(h => ENCABEZADOS_SEGUIMIENTO.indexOf(h));

        // Cargar datos existentes de la hoja de destino para comparación
        const mapaExistente = new Map();
        if (hojaDestino.getLastRow() > 1) {
            hojaDestino.getRange(2, 1, hojaDestino.getLastRow() - 1, hojaDestino.getLastColumn()).getValues()
                .forEach((fila, i) => {
                    const id = fila[indiceId];
                    if (id) mapaExistente.set(id, { fila: fila, numeroFila: i + 2 });
                });
        }
        Logger.log(`  -> Planilla de destino tiene ${mapaExistente.size} filas existentes.`);

        const filasParaAgregar = [];
        const filasParaActualizar = [];

        datosParaEscribir.forEach(nuevaFila => {
            const idUnico = nuevaFila[indiceId];
            if (mapaExistente.has(idUnico)) {
                // La fila ya existe, verificar si cambió el contenido
                const infoExistente = mapaExistente.get(idUnico);
                const hashViejo = infoExistente.fila[indiceHash];
                const hashNuevo = nuevaFila[indiceHash];

                if (hashNuevo !== hashViejo) {
                    // El contenido cambió. Hay que actualizar.
                    // Se preservan los datos de las columnas de retorno.
                    indicesRetorno.forEach(indice => {
                        nuevaFila[indice] = infoExistente.fila[indice]; // Se mantiene el valor antiguo de ESTADO y OBS
                    });
                    filasParaActualizar.push({ numeroFila: infoExistente.numeroFila, data: nuevaFila });
                }
            } else {
                // La fila es completamente nueva
                filasParaAgregar.push(nuevaFila);
            }
        });

        // Ejecutar las actualizaciones por lotes para mayor eficiencia
        if (filasParaActualizar.length > 0) {
            Logger.log(`  -> Actualizando ${filasParaActualizar.length} filas modificadas (preservando seguimiento).`);
            filasParaActualizar.forEach(item => {
                hojaDestino.getRange(item.numeroFila, 1, 1, item.data.length).setValues([item.data]);
            });
        }
        if (filasParaAgregar.length > 0) {
            Logger.log(`  -> Agregando ${filasParaAgregar.length} filas nuevas.`);
            hojaDestino.getRange(hojaDestino.getLastRow() + 1, 1, filasParaAgregar.length, filasParaAgregar[0].length).setValues(filasParaAgregar);
        }
        if (filasParaAgregar.length === 0 && filasParaActualizar.length === 0) {
            Logger.log("  -> No se encontraron cambios (nuevos o modificados) para esta planilla.");
        }

    } catch (e) {
        Logger.log(`❌ ERROR al actualizar la hoja ${nombreHoja} (ID: ${idPlanilla}): ${e.message}`);
    }
}
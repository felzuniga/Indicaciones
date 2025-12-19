// =================================================================================
// LÓGICA DE CONSOLIDACIÓN DE DATOS
// =================================================================================

/**
 * ACCIÓN 1: Ejecutar solo UNA VEZ para la carga inicial con el sistema de HASH.
 */
function Paso1_CargaInicialCompleta_CON_HASH() {
  Logger.log("--- [PASO 1] INICIANDO CARGA INICIAL COMPLETA ---");
  ejecutarCargaCompletaConHash("Cajas", ID_CARPETA_MADRE_CAJAS, ID_CONSOLIDADO_CAJAS, NOMBRE_HOJA_CAJAS);
  ejecutarCargaCompletaConHash("TI", ID_CARPETA_MADRE_TI, ID_CONSOLIDADO_TI, NOMBRE_HOJA_TI);
  actualizarConsolidadoFinal();
  Logger.log("CARGA INICIAL CON HASH FINALIZADA");
}

/**
 * ACCIÓN 2: Configurar en un activador para la actualización diaria (nuevos + modificados).
 */
function Paso2_ActualizacionPorContenido_Diaria() {
  Logger.log("--- [PASO 2] INICIANDO ACTUALIZACIÓN DIARIA POR CONTENIDO ---");
  ejecutarActualizacionPorContenido("Cajas", ID_CARPETA_MADRE_CAJAS, ID_CONSOLIDADO_CAJAS, NOMBRE_HOJA_CAJAS);
  ejecutarActualizacionPorContenido("TI", ID_CARPETA_MADRE_TI, ID_CONSOLIDADO_TI, NOMBRE_HOJA_TI);
  actualizarConsolidadoFinal();
  Logger.log("ACTUALIZACIÓN DIARIA POR CONTENIDO FINALIZADA");
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
    Logger.log(`No se encontraron filas nuevas o modificadas para "${tipo}".`);
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

    // Leemos valores REALES (para fechas y números) y TEXTO (para códigos y horas)
    const datos = hoja.getRange(2, 1, ultimaFilaReal - 1, hoja.getLastColumn()).getValues();
    const datosTexto = hoja.getRange(2, 1, ultimaFilaReal - 1, hoja.getLastColumn()).getDisplayValues();

    // Indices BASADOS EN 0 (A=0, B=1...).
    const columnasSeleccionadas = [1, 4, 5, 6, 10, 11, 13, 14, 15, 16, 28, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27];
    
    const indiceId = ENCABEZADOS_INTERMEDIOS.indexOf(HEADER_ID_UNICO);
    const indiceHash = ENCABEZADOS_INTERMEDIOS.indexOf(HEADER_HASH);

    // Índices (0-based) DENTRO DE 'columnasSeleccionadas' que deben tratarse como TEXTO para no perder formato.
    // 4  = 10 (Fecha Edición)
    // 10 = 28 (Código Prestación)
    // 13 = 20 (Fecha Entrada)
    // 14 = 21 (Fecha Citación)
    // 15 = 22 (Hora Citación)
    const INDICES_COMO_TEXTO = [4, 10, 13, 14, 15];

    return datos.map((fila, index) => { // Iteramos sobre los datos REALES
      const numFilaOriginal = index + 2;
      const idUnico = `${archivoId}|${numFilaOriginal}`;

      // Construimos la fila mapeando cada columna seleccionada
      const filaProcesada = columnasSeleccionadas.map((columnaOrigen, idxDestino) => {
        // CORRECCIÓN: Si es fecha, hora o código, usamos el TEXTO VISUAL (datosTexto)
        if (INDICES_COMO_TEXTO.includes(idxDestino)) {
           return datosTexto[index][columnaOrigen] || "";
        }
        // Para todo lo demás, usamos el VALOR REAL (para que números sigan siendo números)
        return fila[columnaOrigen] !== undefined ? fila[columnaOrigen] : "";
      });

      // Blindaje final del Código (ya viene de la columna AC que tiene fórmula, pero aseguramos)
      let codigo = filaProcesada[10];
      if (codigo && !String(codigo).startsWith("'")) {
         filaProcesada[10] = "'" + codigo;
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
    const hojaTI = SpreadsheetApp.openById(ID_CONSOLIDADO_TI).getSheetByName(NOMBRE_HOJA_TI);
    
    if (!hojaFinal || !hojaCajas || !hojaTI) {
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

    // Función auxiliar interna para procesar hojas (evita repetir código)
    const procesarHoja = (hoja) => {
      if (hoja.getLastRow() > 1) {
        hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues().forEach(fila => {
          if (fila[indiceIdIntermedio]) {
            if (indiceCodigoPrestacion !== -1 && fila[indiceCodigoPrestacion]) {
              let cod = String(fila[indiceCodigoPrestacion]);
               if (!cod.startsWith("'")) fila[indiceCodigoPrestacion] = "'" + cod;
            }
            mapaFuentes.set(fila[indiceIdIntermedio], { data: fila, hash: fila[indiceHashIntermedio] });
          }
        });
      }
    };

    // 1. Procesar Cajas
    procesarHoja(hojaCajas);
    // 2. Procesar TI
    procesarHoja(hojaTI);

    Logger.log(`Total de registros en fuentes intermedias: ${mapaFuentes.size}`);


    // Cargar final
    const mapaFinal = new Map();
    if (hojaFinal.getLastRow() > 1) {
      const datosFinales = hojaFinal.getDataRange().getValues();
      const encabezadosFinales = datosFinales.shift();
      const indiceIdFinal = encabezadosFinales.indexOf(HEADER_ID_UNICO);
      const indiceHashFinal = encabezadosFinales.indexOf(HEADER_HASH);
      datosFinales.forEach((fila, index) => {
        if (fila[indiceIdFinal]) {
          mapaFinal.set(fila[indiceIdFinal], { fila: fila, hash: fila[indiceHashFinal] });
        }
      });
    }

    Logger.log(`Total de registros actuales en consolidado final: ${mapaFinal.size}`);

    // Comparar y decidir qué hacer
    const filasNuevas = [], filasParaModificar = [];
    mapaFuentes.forEach((infoFuente, id) => {
      if (!mapaFinal.has(id)) {
        filasNuevas.push(infoFuente.data);
      } else {
        const infoFinal = mapaFinal.get(id);
        if (infoFuente.hash !== infoFinal.hash) {
          filasParaModificar.push({ data: infoFuente.data, filaExistente: infoFinal.fila });
        }
      }
    });

    // Escritura
    if (filasParaModificar.length > 0) {
      Logger.log(`Actualizando ${filasParaModificar.length} filas modificadas...`);
      const dataRange = hojaFinal.getDataRange();
      const values = dataRange.getValues();
      const headers = values.shift();
      const idIdx = headers.indexOf(HEADER_ID_UNICO);

      filasParaModificar.forEach(item => {
        for (let i = 0; i < values.length; i++) {
          if(values[i][idIdx] === item.data[headers.indexOf(HEADER_ID_UNICO)]) {
             for(let j=0; j<numColumnasOriginales; j++) {
               values[i][j] = item.data[j];
             }
             break;
          }
        }        
      });
      hojaFinal.getRange(2, 1, values.length, values[0].length).setValues(values);
      Logger.log(`Se actualizaron ${filasParaModificar.length} filas.`);
    }

    if (filasNuevas.length > 0) {
      Logger.log(`Agregando ${filasNuevas.length} filas nuevas...`);
      const anchoFinal = ENCABEZADOS_FINALES.length;
      const nuevasFilasFormateadas = filasNuevas.map(fila => {
        const filaCompleta = new Array(anchoFinal).fill("");
        for (let i = 0; i < numColumnasOriginales; i++) {
          filaCompleta[i] = i < fila.length ? fila[i] : "";
        }
        return filaCompleta;
      });
      hojaFinal.getRange(hojaFinal.getLastRow() + 1, 1, nuevasFilasFormateadas.length, anchoFinal).setValues(nuevasFilasFormateadas);
      Logger.log(`Se agregaron ${filasNuevas.length} filas nuevas.`);
    }
    Logger.log(`Sincronización Finalizada. Nuevas: ${filasNuevas.length}, Modificadas: ${filasParaModificar.length}`);
  } catch (e) {
    Logger.log(`ERROR al sincronizar el Consolidado Final: ${e.message}`);
    Logger.log(`Stack trace: ${e.stack}`);
  }
}

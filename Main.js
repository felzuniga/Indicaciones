// =================================================================================
// ACCIONES PRINCIPALES
// =================================================================================

/**
 * Se ejecuta automáticamente CADA VEZ QUE SE ABRE EL "CONSOLIDADO INDICACIONES".
 * Crea el menú de control centralizado.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  // Crea un solo menú con un solo botón que lo hace todo
  ui.createMenu('⚙️ Sincronización')
    .addItem('Sincronizar Todo (Seguimiento e Historial)', 'iniciarSincronizacionManual')
    .addToUi();
}

/**
 * Inicia el proceso COMPLETO de sincronización manual:
 * 1. Archiva todos los pendientes en las hojas de seguimiento.
 * 2. Pre-chequea los cambios (incluyendo los nuevos historiales).
 * 3. Pide confirmación al usuario.
 * 4. Sincroniza todo de vuelta al Consolidado.
 */
function iniciarSincronizacionManual() {
  const ui = SpreadsheetApp.getUi();
  
  // --- PASO 1: EJECUTAR EL ARCHIVADO PRIMERO ---
  Logger.log("Ejecutando archivado de pendientes previo a la sincronización...");
  ui.alert('Paso 1 de 3: Archivando seguimientos pendientes en las planillas de seguimiento... Por favor, espera.');
  archivarPendientesDiarios(); // Llama a la función

  // --- PASO 2: EJECUTAR EL PRE-CHEQUEO ---
  Logger.log("Ejecutando pre-chequeo de sincronización...");
  ui.alert('Paso 2 de 3: Contando todos los cambios para sincronizar...');
  const cambiosPendientes = prepararSincronizacionDeRetorno();

  // --- PASO 3: CONFIRMAR Y SINCRONIZAR ---
  if (cambiosPendientes > 0) {
    const mensaje = `Se encontraron ${cambiosPendientes} registros con actualizaciones (incluyendo el historial recién archivado).\n\n¿Deseas sincronizar estos cambios ahora en el "Consolidado Indicaciones"?`;
    const respuesta = ui.alert('Paso 3 de 3: Confirmación de Sincronización', mensaje, ui.ButtonSet.YES_NO);

    if (respuesta == ui.Button.YES) {
      ui.alert('Iniciando sincronización final... Por favor, espera.');
      Paso4_SincronizarRetornoDeDatos();
      ui.alert('¡Proceso completado!', 'Todos los datos han sido archivados y sincronizados exitosamente.', ui.ButtonSet.OK);
    } else {
      ui.alert('Sincronización cancelada.', 'Se han archivado los seguimientos, pero no se han traído al consolidado.', ui.ButtonSet.OK);
    }
  } else if (cambiosPendientes === 0) {
    ui.alert('Todo está al día. No se encontraron cambios nuevos para sincronizar.');
  } else {
    ui.alert('Ocurrió un error al revisar los cambios. Contacte al administrador del sistema.');
  }
}

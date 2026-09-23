/**
 * ==============================================================================
 * SISTEMA ADMINISTRATIVO DE GESTIÓN Y CUENTAS DE COBRO - GOOGLE APPS SCRIPT
 * ==============================================================================
 * Backend Serverless para Google Sheets (Base de Datos) y Google Drive (Almacenamiento).
 * Costo de infraestructura: $0
 * Respuestas estandarizadas: { success: boolean, data?: any, error?: string }
 */

// Nombres estándar de las hojas de cálculo
const SHEETS = {
  COLABORADORES: 'Colaboradores',
  CONFIGURACION: 'Configuracion',
  HISTORIAL: 'Historial',
  LOGS: 'Logs'
};

/**
 * Punto de entrada HTTP GET
 */
function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || 'ping';

    switch (action) {
      case 'ping':
        return createResponse(true, { message: 'Servicio en línea', timestamp: new Date().toISOString() });
      case 'init':
        return createResponse(true, initializeSheets());
      case 'getColaboradores':
        return createResponse(true, getColaboradores());
      case 'getConfiguracion':
        return createResponse(true, getConfiguracion());
      case 'getHistorial':
        return createResponse(true, getHistorial());
      case 'checkDuplicate':
        return createResponse(true, checkDuplicateAccount(
          params.colaborador,
          params.periodoInicio,
          params.periodoFin,
          params.consecutivo
        ));
      case 'vincularDocumentosMasivos':
        return createResponse(true, vincularDocumentosMasivosDrive());
      default:
        return createResponse(false, null, 'Acción GET no reconocida: ' + action);
    }
  } catch (err) {
    logOperation('ERROR_GET', err.toString());
    return createResponse(false, null, err.toString());
  }
}

/**
 * Punto de entrada HTTP POST
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse(false, null, 'No se recibieron datos en el cuerpo de la petición');
    }

    let payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createResponse(false, null, 'El formato JSON recibido es inválido: ' + parseErr.message);
    }

    const action = payload.action;

    switch (action) {
      case 'saveColaborador':
        return createResponse(true, saveColaborador(payload.data));
      case 'deactivateColaborador':
        return createResponse(true, deactivateColaborador(payload.id));
      case 'saveConfiguracion':
        return createResponse(true, saveConfiguracion(payload.data));
      case 'recordHistorial':
        return createResponse(true, recordHistorial(payload.data));
      case 'uploadPdf':
        return createResponse(true, uploadPdfToDrive(payload.data));
      case 'uploadDocumentoColaborador':
        return createResponse(true, uploadDocumentoColaborador(payload.data));
      case 'vincularDocumentosMasivos':
        return createResponse(true, vincularDocumentosMasivosDrive());
      case 'init':
        return createResponse(true, initializeSheets());
      default:
        return createResponse(false, null, 'Acción POST no reconocida: ' + action);
    }
  } catch (err) {
    logOperation('ERROR_POST', err.toString());
    return createResponse(false, null, err.toString());
  }
}

/**
 * Genera una respuesta JSON estándar
 */
function createResponse(success, data, error) {
  const result = { success: Boolean(success) };
  if (data !== undefined && data !== null) result.data = data;
  if (error) result.error = String(error);

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Obtiene la hoja de cálculo activa y garantiza que las hojas existan
 */
function getDbSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupSheetHeaders(sheet, sheetName);
  }
  return sheet;
}

/**
 * Configura los encabezados estándar para cada hoja
 */
function setupSheetHeaders(sheet, sheetName) {
  let headers = [];
  if (sheetName === SHEETS.COLABORADORES) {
    headers = ['ID', 'Nombre', 'Cedula', 'Cargo', 'Consecutivo', 'Valor', 'Estado', 'FechaCreacion', 'FechaActualizacion'];
  } else if (sheetName === SHEETS.CONFIGURACION) {
    headers = ['Clave', 'Valor', 'Descripcion'];
  } else if (sheetName === SHEETS.HISTORIAL) {
    headers = ['ID', 'FechaGeneracion', 'Colaborador', 'Cedula', 'PeriodoInicio', 'PeriodoFin', 'Consecutivo', 'Valor', 'NombreArchivo', 'DriveFileId', 'DriveUrl', 'Estado'];
  } else if (sheetName === SHEETS.LOGS) {
    headers = ['Fecha', 'Tipo', 'Detalle'];
  }

  if (headers.length > 0 && sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#059669');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
}

/**
 * Inicializa automáticamente todas las hojas con sus estructuras y valores iniciales
 */
function initializeSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.values(SHEETS).forEach(name => {
    getDbSheet(name);
  });

  // Si la configuración está vacía, agregar las claves predeterminadas
  const configSheet = getDbSheet(SHEETS.CONFIGURACION);
  if (configSheet.getLastRow() <= 1) {
    const defaultConfigs = [
      ['NombreLegalFundacion', 'FUNDACION HOGAR GERIATRICO MIS AÑOS DORADOS', 'Nombre legal oficial de la entidad'],
      ['NIT', '901481005', 'Número de identificación tributaria'],
      ['Direccion', '', 'Dirección de la sede principal'],
      ['Ciudad', '', 'Ciudad y departamento'],
      ['Telefono', '', 'Teléfono de contacto'],
      ['Correo', '', 'Correo electrónico oficial'],
      ['RepresentanteLegal', '', 'Nombre completo del representante legal'],
      ['CedulaRepresentante', '', 'Cédula de ciudadanía del representante'],
      ['InformacionBancaria', '', 'Datos de cuenta bancaria institucional'],
      ['CarpetaDrivePrincipal', 'CUENTAS DE COBRO', 'Nombre o ID de la carpeta raíz en Drive'],
      ['OtrosDatosInstitucionales', '', 'Observaciones o textos adicionales']
    ];
    defaultConfigs.forEach(row => configSheet.appendRow(row));
  }

  return { message: 'Estructura de Google Sheets inicializada correctamente' };
}

/**
 * Garantiza que las columnas nuevas de documentos y firma existan en la hoja Colaboradores
 */
function ensureColaboradoresHeaders(sheet, mapping) {
  const needed = [
    { name: 'RUT_Url', key: 'rut_url' },
    { name: 'CC_Url', key: 'cc_url' },
    { name: 'Diploma_Url', key: 'diploma_url' },
    { name: 'Firma_Url', key: 'firma_url' }
  ];
  let lastCol = sheet.getLastColumn();
  needed.forEach(col => {
    if (mapping[col.key] === undefined) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(col.name).setFontWeight('bold').setBackground('#059669').setFontColor('#ffffff');
      mapping[col.key] = lastCol - 1;
    }
  });
}

/**
 * Resuelve dinámicamente el índice de cada columna por su nombre de encabezado
 */
function getColumnMapping(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).getValues()[0];
  const mapping = {};
  headers.forEach((header, index) => {
    if (header) {
      mapping[String(header).trim().toLowerCase()] = index;
    }
  });
  return mapping;
}

/**
 * OBTENER COLABORADORES
 */
function getColaboradores() {
  const sheet = getDbSheet(SHEETS.COLABORADORES);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const mapping = getColumnMapping(sheet);
  ensureColaboradoresHeaders(sheet, mapping);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const colabs = [];
  data.forEach((row, index) => {
    const nombre = String(row[mapping['nombre']] || '').trim();
    const cedula = String(row[mapping['cedula']] || '').trim();
    if (!nombre && !cedula) return; // Omitir filas completamente vacías

    let id = String(row[mapping['id']] || '').trim();
    if (!id) {
      // Si el usuario pegó la fila en Google Sheets y dejó el ID vacío, el sistema le asigna uno automáticamente
      id = 'colab-' + (index + 1);
      try {
        sheet.getRange(index + 2, mapping['id'] + 1).setValue(id);
      } catch (e) {}
    }

    colabs.push({
      id: id,
      nombre: nombre,
      cedula: cedula,
      cargo: String(row[mapping['cargo']] || '').trim(),
      consecutivo: String(row[mapping['consecutivo']] || '').trim(),
      valor: Number(row[mapping['valor']]) || 0,
      estado: String(row[mapping['estado']] || 'Activo').trim(),
      rutUrl: mapping['rut_url'] !== undefined ? String(row[mapping['rut_url']] || '').trim() : '',
      ccUrl: mapping['cc_url'] !== undefined ? String(row[mapping['cc_url']] || '').trim() : '',
      diplomaUrl: mapping['diploma_url'] !== undefined ? String(row[mapping['diploma_url']] || '').trim() : '',
      firmaUrl: mapping['firma_url'] !== undefined ? String(row[mapping['firma_url']] || '').trim() : '',
      fechaCreacion: row[mapping['fechacreacion']] ? new Date(row[mapping['fechacreacion']]).toISOString() : '',
      fechaActualizacion: row[mapping['fechaactualizacion']] ? new Date(row[mapping['fechaactualizacion']]).toISOString() : ''
    });
  });

  return colabs;
}

/**
 * GUARDAR O ACTUALIZAR COLABORADOR
 */
function saveColaborador(colabData) {
  if (!colabData) throw new Error('Datos del colaborador vacíos');

  let id = String(colabData.id || '').trim();
  if (!id) {
    id = 'colab-' + Date.now();
  }

  const nombre = String(colabData.nombre || '').trim();
  const cedula = String(colabData.cedula || '').trim();
  const cargo = String(colabData.cargo || '').trim();
  const consecutivo = String(colabData.consecutivo || '').trim();
  const valor = Number(colabData.valor);
  const estado = colabData.estado === 'Inactivo' ? 'Inactivo' : 'Activo';

  // Validaciones del servidor
  if (!nombre) throw new Error('El nombre completo es obligatorio.');
  if (!cedula) throw new Error('La cédula es obligatoria.');
  if (!cargo) throw new Error('El cargo es obligatorio.');
  if (!consecutivo) throw new Error('El consecutivo es obligatorio.');
  if (isNaN(valor) || valor <= 0) throw new Error('El valor a pagar debe ser un número mayor a cero.');

  const sheet = getDbSheet(SHEETS.COLABORADORES);
  const mapping = getColumnMapping(sheet);
  ensureColaboradoresHeaders(sheet, mapping);
  const lastRow = sheet.getLastRow();
  const nowStr = new Date().toISOString();

  let targetRow = -1;
  let id = colabData.id;

  if (id && lastRow > 1) {
    const idColumnValues = sheet.getRange(2, mapping['id'] + 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < idColumnValues.length; i++) {
      if (String(idColumnValues[i][0]) === String(id)) {
        targetRow = i + 2;
        break;
      }
    }
  }

  if (targetRow > 1) {
    // Actualizar registro existente
    sheet.getRange(targetRow, mapping['nombre'] + 1).setValue(nombre);
    sheet.getRange(targetRow, mapping['cedula'] + 1).setValue(cedula);
    sheet.getRange(targetRow, mapping['cargo'] + 1).setValue(cargo);
    sheet.getRange(targetRow, mapping['consecutivo'] + 1).setValue(consecutivo);
    sheet.getRange(targetRow, mapping['valor'] + 1).setValue(valor);
    sheet.getRange(targetRow, mapping['estado'] + 1).setValue(estado);
    if (colabData.rutUrl !== undefined && mapping['rut_url'] !== undefined) {
      sheet.getRange(targetRow, mapping['rut_url'] + 1).setValue(String(colabData.rutUrl || ''));
    }
    if (colabData.ccUrl !== undefined && mapping['cc_url'] !== undefined) {
      sheet.getRange(targetRow, mapping['cc_url'] + 1).setValue(String(colabData.ccUrl || ''));
    }
    if (colabData.diplomaUrl !== undefined && mapping['diploma_url'] !== undefined) {
      sheet.getRange(targetRow, mapping['diploma_url'] + 1).setValue(String(colabData.diplomaUrl || ''));
    }
    if (colabData.firmaUrl !== undefined && mapping['firma_url'] !== undefined) {
      sheet.getRange(targetRow, mapping['firma_url'] + 1).setValue(String(colabData.firmaUrl || ''));
    }
    sheet.getRange(targetRow, mapping['fechaactualizacion'] + 1).setValue(nowStr);

    logOperation('UPDATE_COLABORADOR', 'Actualizado: ' + nombre + ' (ID: ' + id + ')');
    return {
      id: id,
      nombre: nombre,
      cedula: cedula,
      cargo: cargo,
      consecutivo: consecutivo,
      valor: valor,
      estado: estado,
      rutUrl: colabData.rutUrl || '',
      ccUrl: colabData.ccUrl || '',
      diplomaUrl: colabData.diplomaUrl || '',
      firmaUrl: colabData.firmaUrl || '',
      fechaActualizacion: nowStr
    };
  } else {
    // Generar nuevo ID
    id = Utilities.getUuid();
    const newRow = [];
    const totalCols = sheet.getLastColumn();
    for (let c = 0; c < totalCols; c++) newRow.push('');

    newRow[mapping['id']] = id;
    newRow[mapping['nombre']] = nombre;
    newRow[mapping['cedula']] = cedula;
    newRow[mapping['cargo']] = cargo;
    newRow[mapping['consecutivo']] = consecutivo;
    newRow[mapping['valor']] = valor;
    newRow[mapping['estado']] = estado;
    if (mapping['rut_url'] !== undefined) newRow[mapping['rut_url']] = String(colabData.rutUrl || '');
    if (mapping['cc_url'] !== undefined) newRow[mapping['cc_url']] = String(colabData.ccUrl || '');
    if (mapping['diploma_url'] !== undefined) newRow[mapping['diploma_url']] = String(colabData.diplomaUrl || '');
    if (mapping['firma_url'] !== undefined) newRow[mapping['firma_url']] = String(colabData.firmaUrl || '');
    newRow[mapping['fechacreacion']] = nowStr;
    newRow[mapping['fechaactualizacion']] = nowStr;

    sheet.appendRow(newRow);
    logOperation('CREATE_COLABORADOR', 'Creado: ' + nombre + ' (ID: ' + id + ')');
    return {
      id: id,
      nombre: nombre,
      cedula: cedula,
      cargo: cargo,
      consecutivo: consecutivo,
      valor: valor,
      estado: estado,
      rutUrl: colabData.rutUrl || '',
      ccUrl: colabData.ccUrl || '',
      diplomaUrl: colabData.diplomaUrl || '',
      firmaUrl: colabData.firmaUrl || '',
      fechaCreacion: nowStr,
      fechaActualizacion: nowStr
    };
  }
}

/**
 * DESACTIVAR COLABORADOR
 */
function deactivateColaborador(id) {
  if (!id) throw new Error('ID de colaborador no proporcionado');
  const sheet = getDbSheet(SHEETS.COLABORADORES);
  const mapping = getColumnMapping(sheet);
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) throw new Error('No existen colaboradores en el sistema');

  const idValues = sheet.getRange(2, mapping['id'] + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idValues.length; i++) {
    if (String(idValues[i][0]) === String(id)) {
      const row = i + 2;
      sheet.getRange(row, mapping['estado'] + 1).setValue('Inactivo');
      sheet.getRange(row, mapping['fechaactualizacion'] + 1).setValue(new Date().toISOString());
      logOperation('DEACTIVATE_COLABORADOR', 'Desactivado ID: ' + id);
      return { success: true, id: id, estado: 'Inactivo' };
    }
  }
  throw new Error('Colaborador no encontrado con ID: ' + id);
}

/**
 * OBTENER CONFIGURACIÓN
 */
function getConfiguracion() {
  const sheet = getDbSheet(SHEETS.CONFIGURACION);
  const lastRow = sheet.getLastRow();
  const config = {};

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    values.forEach(row => {
      if (row[0]) {
        config[String(row[0]).trim()] = String(row[1] || '').trim();
      }
    });
  }
  return config;
}

/**
 * GUARDAR CONFIGURACIÓN
 */
function saveConfiguracion(configData) {
  if (!configData || typeof configData !== 'object') {
    throw new Error('Datos de configuración inválidos');
  }

  const sheet = getDbSheet(SHEETS.CONFIGURACION);
  const lastRow = sheet.getLastRow();
  const existingMap = {};

  if (lastRow > 1) {
    const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    values.forEach((r, i) => {
      if (r[0]) existingMap[String(r[0]).trim()] = i + 2;
    });
  }

  for (const key in configData) {
    const val = String(configData[key] || '');
    if (existingMap[key]) {
      sheet.getRange(existingMap[key], 2).setValue(val);
    } else {
      sheet.appendRow([key, val, 'Configurado desde la aplicación']);
    }
  }

  logOperation('SAVE_CONFIG', 'Configuración institucional actualizada');
  return { success: true, config: configData };
}

/**
 * OBTENER HISTORIAL
 */
function getHistorial() {
  const sheet = getDbSheet(SHEETS.HISTORIAL);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const mapping = getColumnMapping(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return values.map(row => {
    return {
      id: String(row[mapping['id']] || ''),
      fechaGeneracion: row[mapping['fechageneracion']] ? new Date(row[mapping['fechageneracion']]).toISOString() : '',
      colaborador: String(row[mapping['colaborador']] || ''),
      cedula: String(row[mapping['cedula']] || ''),
      periodoInicio: String(row[mapping['periodoinicio']] || ''),
      periodoFin: String(row[mapping['periodofin']] || ''),
      consecutivo: String(row[mapping['consecutivo']] || ''),
      valor: Number(row[mapping['valor']]) || 0,
      nombreArchivo: String(row[mapping['nombrearchivo']] || ''),
      driveFileId: String(row[mapping['drivefileid']] || ''),
      driveUrl: String(row[mapping['driveurl']] || ''),
      estado: String(row[mapping['estado']] || 'Generado')
    };
  }).filter(h => h.id !== '').reverse(); // Más recientes primero
}

/**
 * REGISTRAR EN HISTORIAL
 */
function recordHistorial(entry) {
  if (!entry) throw new Error('Entrada de historial vacía');

  const sheet = getDbSheet(SHEETS.HISTORIAL);
  const mapping = getColumnMapping(sheet);
  const id = entry.id || Utilities.getUuid();
  const nowStr = entry.fechaGeneracion || new Date().toISOString();

  const newRow = [];
  const totalCols = sheet.getLastColumn();
  for (let c = 0; c < totalCols; c++) newRow.push('');

  newRow[mapping['id']] = id;
  newRow[mapping['fechageneracion']] = nowStr;
  newRow[mapping['colaborador']] = entry.colaborador || '';
  newRow[mapping['cedula']] = entry.cedula || '';
  newRow[mapping['periodoinicio']] = entry.periodoInicio || '';
  newRow[mapping['periodofin']] = entry.periodoFin || '';
  newRow[mapping['consecutivo']] = entry.consecutivo || '';
  newRow[mapping['valor']] = Number(entry.valor) || 0;
  newRow[mapping['nombrearchivo']] = entry.nombreArchivo || '';
  newRow[mapping['drivefileid']] = entry.driveFileId || '';
  newRow[mapping['driveurl']] = entry.driveUrl || '';
  newRow[mapping['estado']] = entry.estado || 'Generado';

  sheet.appendRow(newRow);
  logOperation('RECORD_HISTORIAL', 'Registrada cuenta para: ' + entry.colaborador + ' - ' + entry.nombreArchivo);
  return { success: true, id: id };
}

/**
 * COMPROBAR DUPLICADO DE CUENTA
 * Verifica si ya existe una cuenta para: Colaborador + PeriodoInicio + PeriodoFin + Consecutivo
 */
function checkDuplicateAccount(colaborador, periodoInicio, periodoFin, consecutivo) {
  const sheet = getDbSheet(SHEETS.HISTORIAL);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { exists: false };

  const mapping = getColumnMapping(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  const cNorm = String(colaborador || '').trim().toLowerCase();
  const piNorm = String(periodoInicio || '').trim();
  const pfNorm = String(periodoFin || '').trim();
  const numNorm = String(consecutivo || '').trim().toLowerCase();

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const rowColab = String(row[mapping['colaborador']] || '').trim().toLowerCase();
    const rowPi = String(row[mapping['periodoinicio']] || '').trim();
    const rowPf = String(row[mapping['periodofin']] || '').trim();
    const rowCons = String(row[mapping['consecutivo']] || '').trim().toLowerCase();

    if (rowColab === cNorm && rowPi === piNorm && rowPf === pfNorm && rowCons === numNorm) {
      return {
        exists: true,
        match: {
          id: row[mapping['id']],
          fecha: row[mapping['fechageneracion']],
          nombreArchivo: row[mapping['nombrearchivo']],
          driveUrl: row[mapping['driveurl']]
        }
      };
    }
  }

  return { exists: false };
}

/**
 * SUBIDA DE PDF A GOOGLE DRIVE ORGANIZADO EN CARPETAS POR AÑO Y MES
 */
function uploadPdfToDrive(data) {
  if (!data || !data.base64Content || !data.fileName) {
    throw new Error('Faltan datos para subir el archivo (base64Content o fileName)');
  }

  const year = String(data.year || new Date().getFullYear());
  const monthName = String(data.monthName || 'General');
  const monthNum = String(data.monthNumber || '01').padStart(2, '0');
  const monthFolderTitle = monthNum + ' - ' + monthName;

  // Obtener la carpeta raíz de cuentas de cobro
  const rootFolder = getOrCreateRootFolder(data.rootFolderId);

  // Obtener o crear carpeta de Año
  const yearFolder = getOrCreateSubfolder(rootFolder, year);

  // Obtener o crear carpeta de Mes
  const monthFolder = getOrCreateSubfolder(yearFolder, monthFolderTitle);

  // Decodificar Base64
  const decodedBlob = Utilities.newBlob(
    Utilities.base64Decode(data.base64Content),
    'application/pdf',
    data.fileName
  );

  // Crear archivo en la carpeta destino
  const file = monthFolder.createFile(decodedBlob);
  file.setDescription('Cuenta de cobro generada por el Sistema Administrativo');

  // Asegurar acceso con enlace de lectura para los usuarios que tengan el link
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (sharingErr) {
    // Puede estar deshabilitado por directivas de dominio de Google Workspace
  }

  const fileId = file.getId();
  const fileUrl = file.getUrl();

  logOperation('UPLOAD_PDF', 'Subido archivo: ' + data.fileName + ' ID: ' + fileId);

  return {
    fileId: fileId,
    driveUrl: fileUrl,
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId,
    folderPath: 'CUENTAS DE COBRO/' + year + '/' + monthFolderTitle
  };
}

/**
 * SUBIDA DE DOCUMENTOS DEL COLABORADOR (RUT, CC, DIPLOMA, FIRMA) A GOOGLE DRIVE
 */
function uploadDocumentoColaborador(data) {
  if (!data || !data.base64Content || !data.fileName || !data.colaboradorNombre) {
    throw new Error('Datos incompletos para subir el documento.');
  }

  const rootFolder = getOrCreateRootFolder(data.rootFolderId);
  const docsFolder = getOrCreateSubfolder(rootFolder, 'DOCUMENTOS COLABORADORES');
  const colabFolder = getOrCreateSubfolder(docsFolder, data.colaboradorNombre.trim());

  let mimeType = 'application/pdf';
  const fLower = data.fileName.toLowerCase();
  if (fLower.endsWith('.png') || data.fileType === 'Firma') {
    mimeType = 'image/png';
  } else if (fLower.endsWith('.jpg') || fLower.endsWith('.jpeg')) {
    mimeType = 'image/jpeg';
  }

  const decodedBlob = Utilities.newBlob(
    Utilities.base64Decode(data.base64Content),
    mimeType,
    data.fileName
  );

  const file = colabFolder.createFile(decodedBlob);
  file.setDescription((data.fileType || 'Documento') + ' de ' + data.colaboradorNombre);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}

  const fileId = file.getId();
  const fileUrl = file.getUrl();

  logOperation('UPLOAD_DOC', 'Subido documento: ' + data.fileName + ' para: ' + data.colaboradorNombre);

  return {
    fileId: fileId,
    driveUrl: fileUrl,
    downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
  };
}

/**
 * Localiza o crea la carpeta raíz "CUENTAS DE COBRO"
 */
function getOrCreateRootFolder(rootFolderId) {
  if (rootFolderId && rootFolderId.trim() !== '') {
    try {
      return DriveApp.getFolderById(rootFolderId.trim());
    } catch (e) {
      // Si el ID es inválido o no accesible, recurrir a búsqueda por nombre
    }
  }

  const rootName = 'CUENTAS DE COBRO';
  const folders = DriveApp.getFoldersByName(rootName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(rootName);
}

/**
 * Localiza o crea una subcarpeta dentro de un padre sin crear duplicados
 */
function getOrCreateSubfolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

/**
 * Registra operaciones en la hoja Logs
 */
function logOperation(tipo, detalle) {
  try {
    const sheet = getDbSheet(SHEETS.LOGS);
    sheet.appendRow([new Date().toISOString(), tipo, detalle]);
  } catch (e) {
    // Evitar romper la ejecución por fallo de log
  }
}

/**
 * ESCANEAR Y VINCULAR AUTOMÁTICAMENTE DOCUMENTOS DE CARGA MASIVA EN DRIVE
 * Lee la carpeta "CARGA_MASIVA_DOCUMENTOS", empareja los archivos por cédula o nombre,
 * los mueve a la subcarpeta del colaborador y actualiza los enlaces en Google Sheets.
 */
function vincularDocumentosMasivosDrive() {
  const rootFolder = getOrCreateRootFolder();
  const bulkFolder = getOrCreateSubfolder(rootFolder, 'CARGA_MASIVA_DOCUMENTOS');
  const files = bulkFolder.getFiles();

  const sheet = getDbSheet(SHEETS.COLABORADORES);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return { procesados: 0, asociados: 0, mensaje: 'No hay colaboradores registrados en la hoja' };
  }

  const mapping = getColumnMapping(sheet);
  ensureColaboradoresHeaders(sheet, mapping);
  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  let procesados = 0;
  let asociados = 0;
  const docsFolder = getOrCreateSubfolder(rootFolder, 'DOCUMENTOS COLABORADORES');

  while (files.hasNext()) {
    const file = files.next();
    procesados++;
    const fileName = file.getName();
    const normFileName = fileName.toLowerCase().replace(/[\u0300-\u036f]/g, '');

    // Detección del tipo de soporte
    let tipoKey = '';
    if (normFileName.includes('rut')) {
      tipoKey = 'rut_url';
    } else if (normFileName.includes('cc') || normFileName.includes('cedula') || normFileName.includes('identificacion')) {
      tipoKey = 'cc_url';
    } else if (normFileName.includes('diploma') || normFileName.includes('titulo') || normFileName.includes('acta')) {
      tipoKey = 'diploma_url';
    } else if (normFileName.includes('firma')) {
      tipoKey = 'firma_url';
    }

    if (!tipoKey) continue;

    // Buscar coincidencia en colaboradores por cédula o nombre
    let matchedRowIndex = -1;
    let matchedColabName = '';

    for (let i = 0; i < data.length; i++) {
      const colabName = String(data[i][mapping['nombre']] || '').trim();
      const colabCedula = String(data[i][mapping['cedula']] || '').replace(/\D/g, '');
      const normColabName = colabName.toLowerCase().replace(/[\u0300-\u036f]/g, '');

      // 1. Coincidencia por número de cédula
      if (colabCedula && colabCedula.length >= 4 && normFileName.includes(colabCedula)) {
        matchedRowIndex = i + 2; // Fila real en la hoja
        matchedColabName = colabName;
        break;
      }

      // 2. Coincidencia por nombre completo o parcial
      if (normColabName && normFileName.includes(normColabName)) {
        matchedRowIndex = i + 2;
        matchedColabName = colabName;
        break;
      }
    }

    if (matchedRowIndex > 1 && mapping[tipoKey] !== undefined) {
      // Mover el archivo a la subcarpeta del colaborador
      const safeColabName = matchedColabName.replace(/[\/\\:*?"<>|]/g, '_');
      const colabFolder = getOrCreateSubfolder(docsFolder, safeColabName);
      file.moveTo(colabFolder);

      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}

      const fileUrl = file.getUrl();
      sheet.getRange(matchedRowIndex, mapping[tipoKey] + 1).setValue(fileUrl);
      asociados++;
    }
  }

  logOperation('VINCULAR_MASIVO', 'Procesados: ' + procesados + ', asociados: ' + asociados);
  return { procesados: procesados, asociados: asociados };
}

/**
 * Menú contextual personalizado en Google Sheets
 */
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('⚡ Cuentas de Cobro')
      .addItem('📂 Vincular Documentos de Carga Masiva', 'vincularDocumentosMasivosDrive')
      .addItem('🔄 Reparar Encabezados de Tablas', 'setupDatabase')
      .addToUi();
  } catch (e) {}
}


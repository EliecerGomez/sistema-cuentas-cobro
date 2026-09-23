import { jsPDF } from 'jspdf';
import { Colaborador, ConfiguracionFundacion, PeriodoFacturacion } from '../types';
import { formatCurrencyCOP, isValidCurrencyCOP } from '../utils/currency';
import { formatDateDMY } from '../utils/dates';
import { generateCuentaPdfFilename } from '../utils/sanitizer';

export interface GenerarPdfParams {
  colaborador: Colaborador;
  config: ConfiguracionFundacion;
  periodo: PeriodoFacturacion;
}

export interface GenerarPdfResultado {
  doc: jsPDF;
  blob: Blob;
  base64: string;
  filename: string;
}

/**
 * Valida minuciosamente los datos antes de permitir la generación del PDF.
 * Si falta algún dato obligatorio, lanza un error descriptivo para el usuario.
 */
export function validarDatosParaPdf(params: GenerarPdfParams): void {
  const { colaborador, config, periodo } = params;

  if (!colaborador) {
    throw new Error('No se proporcionaron los datos del colaborador.');
  }

  const nombre = (colaborador.nombre || '').trim();
  if (!nombre) {
    throw new Error('El colaborador no tiene un nombre completo registrado.');
  }

  const cedula = (colaborador.cedula || '').trim();
  if (!cedula) {
    throw new Error(`No se puede generar la cuenta de cobro de "${nombre}" porque falta la cédula.`);
  }

  const cargo = (colaborador.cargo || '').trim();
  if (!cargo) {
    throw new Error(`No se puede generar la cuenta de cobro de "${nombre}" porque falta el cargo o concepto.`);
  }

  const consecutivo = (colaborador.consecutivo || '').trim();
  if (!consecutivo) {
    throw new Error(`No se puede generar la cuenta de cobro de "${nombre}" porque falta el consecutivo.`);
  }

  if (!isValidCurrencyCOP(colaborador.valor)) {
    throw new Error(`No se puede generar la cuenta de cobro de "${nombre}" porque el valor a pagar no es válido.`);
  }

  if (!periodo || !periodo.fechaInicio || !periodo.fechaFin) {
    throw new Error('El periodo de facturación (fechas de inicio y fin) no está definido.');
  }

  const fundacionNombre = (config.NombreLegalFundacion || '').trim();
  if (!fundacionNombre) {
    throw new Error('Falta el Nombre Legal de la fundación en la configuración del sistema.');
  }

  const fundacionNit = (config.NIT || '').trim();
  if (!fundacionNit) {
    throw new Error('Falta el NIT de la fundación en la configuración del sistema.');
  }
}

/**
 * Genera el documento PDF oficial replicando exactamente la estructura institucional:
 * - Encabezado con datos del colaborador y consecutivo en verde esmeralda.
 * - Caja institucional con Nombre de la entidad, NIT y Fecha de Expedición.
 * - Tabla con barra verde superior (DESCRIPCIÓN DEL CONCEPTO / VALOR).
 * - Fila de Total a Pagar destacado en verde.
 * - Nota legal del Art. 383 E.T.
 * - Firma centrada al pie de página.
 */
export function generarPdfCuentaCobro(params: GenerarPdfParams): GenerarPdfResultado {
  // Validación estricta previa
  validarDatosParaPdf(params);

  const { colaborador, config, periodo } = params;

  // Documento Carta en orientación vertical (215.9 x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = pageWidth - 20;
  const contentWidth = marginRight - marginLeft;

  // Paleta de colores corporativos
  const COLOR_PRIMARY = [4, 120, 87];   // Verde esmeralda (#047857)
  const COLOR_TEXT_DARK = [15, 23, 42]; // Azul marino oscuro (#0f172a)
  const COLOR_MUTED = [100, 116, 139];  // Gris (#64748b)
  const COLOR_BG_BOX = [248, 250, 252]; // Fondo suave (#f8fafc)
  const COLOR_BORDER = [226, 232, 240]; // Borde (#e2e8f0)

  let cursorY = 28;

  // ==========================================
  // 1. ENCABEZADO SUPERIOR
  // ==========================================
  // Lado Izquierdo: Nombre del Colaborador y Cédula
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(colaborador.nombre.toUpperCase(), marginLeft, cursorY);

  cursorY += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(`C.C. / NIT: ${colaborador.cedula}`, marginLeft, cursorY);

  // Lado Derecho: Tarjeta de Cuenta de Cobro y Consecutivo
  const headerRightBoxWidth = 55;
  const headerRightBoxHeight = 18;
  const headerRightBoxX = marginRight - headerRightBoxWidth;
  const headerRightBoxY = 19;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(headerRightBoxX, headerRightBoxY, headerRightBoxWidth, headerRightBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('CUENTA DE COBRO', headerRightBoxX + headerRightBoxWidth / 2, headerRightBoxY + 6, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(`N° ${colaborador.consecutivo}`, headerRightBoxX + headerRightBoxWidth / 2, headerRightBoxY + 13.5, { align: 'center' });

  // ==========================================
  // 2. CAJA INSTITUCIONAL
  // ==========================================
  cursorY = 46;
  const infoBoxHeight = 22;

  doc.setFillColor(COLOR_BG_BOX[0], COLOR_BG_BOX[1], COLOR_BG_BOX[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginLeft, cursorY, contentWidth, infoBoxHeight, 2, 2, 'FD');

  // Información de la Fundación
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('SEÑOR(ES):', marginLeft + 5, cursorY + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(config.NombreLegalFundacion.toUpperCase(), marginLeft + 5, cursorY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(`NIT: ${config.NIT}`, marginLeft + 5, cursorY + 17);

  // Fecha de Expedición (Derecha dentro de la caja)
  const fechaExpedicionStr = formatDateDMY(periodo.fechaFin);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text('FECHA EXPEDICIÓN:', marginRight - 5, cursorY + 6, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(fechaExpedicionStr, marginRight - 5, cursorY + 12, { align: 'right' });

  // ==========================================
  // 3. TABLA DE CONCEPTO Y VALOR
  // ==========================================
  cursorY += infoBoxHeight + 8;
  const tableHeaderHeight = 9;

  // Barra de Encabezado de Tabla Verde Esmeralda
  doc.setFillColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.roundedRect(marginLeft, cursorY, contentWidth, tableHeaderHeight, 1.5, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DESCRIPCIÓN DEL CONCEPTO', marginLeft + 5, cursorY + 6);
  doc.text('VALOR', marginRight - 5, cursorY + 6, { align: 'right' });

  cursorY += tableHeaderHeight;

  // Cuerpo de la Tabla
  const rowHeight = 26;
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.2);
  doc.rect(marginLeft, cursorY, contentWidth, rowHeight);

  // Texto del Concepto
  const textoConcepto = `${colaborador.cargo}`;
  const periodoTexto = `Periodo: ${formatDateDMY(periodo.fechaInicio)} al ${formatDateDMY(periodo.fechaFin)}`;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(textoConcepto, marginLeft + 5, cursorY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(periodoTexto, marginLeft + 5, cursorY + 14);

  // Valor formateado en COP
  const valorFormateado = formatCurrencyCOP(colaborador.valor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(valorFormateado, marginRight - 5, cursorY + 11, { align: 'right' });

  cursorY += rowHeight;

  // ==========================================
  // 4. TOTAL A PAGAR
  // ==========================================
  const totalBoxWidth = 75;
  const totalBoxHeight = 11;
  const totalBoxX = marginRight - totalBoxWidth;

  doc.setFillColor(COLOR_BG_BOX[0], COLOR_BG_BOX[1], COLOR_BG_BOX[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalBoxX, cursorY + 4, totalBoxWidth, totalBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text('TOTAL A PAGAR:', totalBoxX + 4, cursorY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLOR_PRIMARY[0], COLOR_PRIMARY[1], COLOR_PRIMARY[2]);
  doc.text(valorFormateado, marginRight - 4, cursorY + 11.5, { align: 'right' });

  cursorY += totalBoxHeight + 15;

  // ==========================================
  // 5. NOTA LEGAL TRIBUTARIA
  // ==========================================
  const notaLegalBoxHeight = 16;
  doc.setFillColor(COLOR_BG_BOX[0], COLOR_BG_BOX[1], COLOR_BG_BOX[2]);
  doc.setDrawColor(COLOR_BORDER[0], COLOR_BORDER[1], COLOR_BORDER[2]);
  doc.setLineWidth(0.2);
  doc.roundedRect(marginLeft, cursorY, contentWidth, notaLegalBoxHeight, 1.5, 1.5, 'FD');

  const textoNotaLegal = 'Nota Legal: Favor realizar las retenciones en la fuente conforme a lo establecido en el artículo 383, parágrafo 2 del Estatuto Tributario. Declaro, bajo la gravedad del juramento, que no he contratado a dos o más trabajadores para la ejecución de la actividad objeto de este servicio.';

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  const splitNota = doc.splitTextToSize(textoNotaLegal, contentWidth - 10);
  doc.text(splitNota, marginLeft + 5, cursorY + 5.5);

  // ==========================================
  // 6. LÍNEA DE FIRMA
  // ==========================================
  const signatureY = 240;
  const signatureLineWidth = 75;
  const signatureStartX = (pageWidth - signatureLineWidth) / 2;
  const signatureEndX = signatureStartX + signatureLineWidth;

  // Estampar firma digital si está registrada
  if (colaborador.firmaUrl && colaborador.firmaUrl.trim()) {
    try {
      const imgFormat = colaborador.firmaUrl.includes('image/jpeg') || colaborador.firmaUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      const sigImgWidth = 46;
      const sigImgHeight = 18;
      const sigImgX = (pageWidth - sigImgWidth) / 2;
      const sigImgY = signatureY - sigImgHeight - 1;
      doc.addImage(colaborador.firmaUrl, imgFormat, sigImgX, sigImgY, sigImgWidth, sigImgHeight);
    } catch (sigErr) {
      console.warn('No se pudo estampar la imagen de la firma en el PDF:', sigErr);
    }
  }

  doc.setDrawColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.setLineWidth(0.4);
  doc.line(signatureStartX, signatureY, signatureEndX, signatureY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLOR_TEXT_DARK[0], COLOR_TEXT_DARK[1], COLOR_TEXT_DARK[2]);
  doc.text(colaborador.nombre.toUpperCase(), pageWidth / 2, signatureY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(COLOR_MUTED[0], COLOR_MUTED[1], COLOR_MUTED[2]);
  doc.text(`C.C. ${colaborador.cedula}`, pageWidth / 2, signatureY + 10.5, { align: 'center' });

  // Generación de salidas
  const blob = doc.output('blob');
  const base64 = doc.output('datauristring').split(',')[1]; // Solo la carga útil Base64

  // Nombre de archivo basado directamente en el consecutivo (ej. 001.pdf)
  const filename = generateCuentaPdfFilename(colaborador.consecutivo);

  return {
    doc,
    blob,
    base64,
    filename
  };
}

export interface GenerarPdfCompletoParams extends GenerarPdfParams {
  unirSoportes?: boolean;
}

/**
 * Convierte un Uint8Array a Base64 de forma eficiente en bloques
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

/**
 * Resuelve y decodifica el contenido binario de un documento de soporte
 */
async function resolveSupportBytes(url: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  if (!url || !url.trim()) return null;

  // Si es DataURL (base64)
  if (url.startsWith('data:')) {
    const commaIdx = url.indexOf(',');
    if (commaIdx === -1) return null;
    const meta = url.substring(5, commaIdx);
    const mimeType = meta.split(';')[0] || 'application/octet-stream';
    const isBase64 = meta.includes('base64');
    const dataPart = url.substring(commaIdx + 1);
    const binary = isBase64 ? atob(dataPart) : decodeURIComponent(dataPart);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return { bytes, mimeType };
  }

  // Si es URL remota (Google Drive o enlace HTTP)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const arrayBuffer = await resp.arrayBuffer();
      const mimeType = resp.headers.get('content-type') || 'application/pdf';
      return { bytes: new Uint8Array(arrayBuffer), mimeType };
    } catch {
      return null;
    }
  }

  return null;
}

export const generarCuentaCobroPdf = generarPdfCuentaCobro;

/**
 * Genera la cuenta de cobro oficial y une automáticamente los documentos
 * de soporte (Cédula de Ciudadanía, RUT y Diploma) en un solo archivo PDF unificado.
 */
export async function generarCuentaCobroCompletaPdf(
  params: GenerarPdfCompletoParams
): Promise<GenerarPdfResultado> {
  const baseResult = generarPdfCuentaCobro(params);

  // Si no se solicitó unir soportes, retorna la cuenta base
  if (params.unirSoportes === false) {
    return baseResult;
  }

  const { colaborador } = params;
  const supportsToAppend: { name: string; url?: string }[] = [
    { name: 'Cédula de Ciudadanía', url: colaborador.ccUrl },
    { name: 'RUT', url: colaborador.rutUrl },
    { name: 'Diploma', url: colaborador.diplomaUrl },
  ].filter(s => !!s.url && s.url.trim().length > 0);

  // Si no tiene ningún soporte adjunto, retorna la cuenta base
  if (supportsToAppend.length === 0) {
    return baseResult;
  }

  try {
    const { PDFDocument } = await import('pdf-lib');
    const mergedPdf = await PDFDocument.create();

    // 1. Añadir la hoja de cuenta de cobro oficial
    const basePdfBytes = baseResult.doc.output('arraybuffer');
    const cuentaPdfDoc = await PDFDocument.load(basePdfBytes);
    const cuentaPages = await mergedPdf.copyPages(cuentaPdfDoc, cuentaPdfDoc.getPageIndices());
    cuentaPages.forEach(page => mergedPdf.addPage(page));

    // 2. Anexar cada documento de soporte en orden institucional (CC, RUT, Diploma)
    for (const sup of supportsToAppend) {
      try {
        const resolved = await resolveSupportBytes(sup.url!);
        if (!resolved || resolved.bytes.length === 0) continue;

        const isPdf =
          resolved.mimeType.includes('application/pdf') ||
          (resolved.bytes[0] === 0x25 && resolved.bytes[1] === 0x50 && resolved.bytes[2] === 0x44 && resolved.bytes[3] === 0x46); // Cabecera %PDF

        if (isPdf) {
          const supportPdf = await PDFDocument.load(resolved.bytes, { ignoreEncryption: true });
          const pages = await mergedPdf.copyPages(supportPdf, supportPdf.getPageIndices());
          pages.forEach(p => mergedPdf.addPage(p));
        } else {
          // Si es una imagen (PNG o JPEG)
          const a4Width = 595.28;
          const a4Height = 841.89;
          const page = mergedPdf.addPage([a4Width, a4Height]);

          let img;
          if (resolved.mimeType.includes('png')) {
            img = await mergedPdf.embedPng(resolved.bytes);
          } else {
            img = await mergedPdf.embedJpg(resolved.bytes);
          }

          const margin = 40;
          const maxWidth = a4Width - margin * 2;
          const maxHeight = a4Height - margin * 2;
          const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
          const renderW = img.width * scale;
          const renderH = img.height * scale;
          const x = (a4Width - renderW) / 2;
          const y = (a4Height - renderH) / 2;

          page.drawImage(img, {
            x,
            y,
            width: renderW,
            height: renderH,
          });
        }
      } catch (err) {
        console.warn(`No se pudo anexar el soporte "${sup.name}" al PDF unificado:`, err);
      }
    }

    const mergedBytes = await mergedPdf.save();
    const mergedBlob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const mergedBase64 = uint8ArrayToBase64(mergedBytes);

    return {
      doc: baseResult.doc,
      blob: mergedBlob,
      base64: mergedBase64,
      filename: baseResult.filename,
    };
  } catch (mergeError) {
    console.warn('Error al unificar soportes en PDF, usando cuenta de cobro base:', mergeError);
    return baseResult;
  }
}



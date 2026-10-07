import { jsPDF } from 'jspdf';
import { diaSemana, formatFechaCorta } from '@/lib/formatDate';

// Genera el PDF del informe semanal con resumen IA, métricas clave y desglose por tipo.
// data = { settings, desde, hasta, cargas, recepciones, acondicionamientos, descargas,
//          tratamientos, inspecciones, bins, resumenIA, tempMax, tempMin, tiposOrganicos }
export function generarInformeSemanalPDF(data) {
  const {
    settings, desde, hasta,
    cargas, recepciones, acondicionamientos, descargas, tratamientos, inspecciones, bins,
    resumenIA, tempMax, tempMin, tiposOrganicos,
  } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (need) => {
    if (y + need > pageH - margin) { doc.addPage(); y = margin; }
  };

  const writeLine = (text, opts = {}) => {
    const { size = 10, bold = false, color = [30, 41, 59], gap = 1.5 } = opts;
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, margin, y);
    y += size * 0.35 + gap;
  };

  const sectionTitle = (title) => {
    ensureSpace(12);
    y += 2;
    doc.setFillColor(45, 106, 79); // emerald-700
    doc.rect(margin, y - 4, contentW, 1.2, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(45, 106, 79);
    doc.text(title, margin, y + 2);
    y += 7;
  };

  const tableHeaders = (headers, widths) => {
    ensureSpace(8);
    doc.setFillColor(240, 235, 230);
    doc.rect(margin, y - 4, contentW, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    let x = margin;
    headers.forEach((h, i) => {
      doc.text(h, x + 1, y);
      x += widths[i];
    });
    y += 6;
  };

  const tableRow = (cells, widths, opts = {}) => {
    ensureSpace(6);
    const { fill = false } = opts;
    if (fill) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 4, contentW, 5.5, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    let x = margin;
    cells.forEach((c, i) => {
      const val = String(c ?? '');
      const maxChars = Math.floor((widths[i] - 1) / 1.5);
      const txt = val.length > maxChars ? val.slice(0, maxChars - 1) + '…' : val;
      doc.text(txt, x + 1, y);
      x += widths[i];
    });
    y += 5.5;
  };

  // ===== Encabezado =====
  doc.setFillColor(21, 34, 67); // navy
  doc.rect(0, 0, pageW, 24, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Informe Semanal · BioComp', margin, 11);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(settings?.sede || 'Sede', margin, 17);
  doc.text(`Semana del ${formatFechaCorta(desde)} al ${formatFechaCorta(hasta)}`, margin, 21);
  doc.setFontSize(8);
  doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, pageW - margin, 21, { align: 'right' });
  y = 32;

  // ===== Resumen IA =====
  if (resumenIA) {
    sectionTitle('Resumen ejecutivo (IA)');
    const boxY = y - 3;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    const lines = doc.splitTextToSize(resumenIA, contentW - 6);
    const blockH = lines.length * 4.4 + 4;
    ensureSpace(blockH + 2);
    doc.setFillColor(236, 247, 242); // emerald-50 claro
    doc.roundedRect(margin, boxY, contentW, blockH, 2, 2, 'F');
    doc.setTextColor(26, 46, 38);
    let ty = boxY + 5;
    lines.forEach((ln) => {
      doc.text(ln, margin + 3, ty);
      ty += 4.4;
    });
    y = boxY + blockH + 3;
  }

  // ===== Métricas clave =====
  const cargasSemana = cargas.length;
  const recL = recepciones.reduce((s, r) => s + (r.totalOrganicoL || 0), 0);
  const recKg = recepciones.reduce((s, r) => s + (r.totalOrganicoKg || 0), 0);
  const livL = recepciones.reduce((s, r) => s + (r.subtotalLivianoL ?? 0), 0);
  const livKg = recepciones.reduce((s, r) => s + (r.subtotalLivianoKg ?? 0), 0);
  const denL = recepciones.reduce((s, r) => s + (r.subtotalDensoL ?? 0), 0);
  const denKg = recepciones.reduce((s, r) => s + (r.subtotalDensoKg ?? 0), 0);
  const critL = recepciones.reduce((s, r) => s + (r.criticoLitros || 0), 0);
  const critKg = recepciones.reduce((s, r) => s + (r.criticoKg || 0), 0);
  const descL = descargas.reduce((s, d) => s + (d.litrosDescargados || 0), 0);
  const descKg = descargas.reduce((s, d) => s + (d.kgDescargados || 0), 0);
  const binsUsados = descargas.reduce((s, d) => s + (d.binsUsados || 0), 0);

  sectionTitle('Métricas de la semana');
  const resumen = [
    ['Cargas recibidas', String(cargasSemana)],
    ['Recepción orgánica total', `${Math.round(recL)} L · ${Math.round(recKg)} kg`],
    ['  · Liviano', `${Math.round(livL)} L · ${Math.round(livKg)} kg`],
    ['  · Denso', `${Math.round(denL)} L · ${Math.round(denKg)} kg`],
    ['Crítico descartado (papa/cebolla)', `${Math.round(critL)} L · ${Math.round(critKg)} kg`],
    ['Material descargado (compost maduro)', `${Math.round(descL)} L · ${Math.round(descKg)} kg`],
    ['Bins utilizados', String(binsUsados)],
    ['Temp. máxima registrada', tempMax ? `${tempMax.val}°C (${tempMax.cuando})` : '—'],
    ['Temp. mínima registrada', tempMin ? `${tempMin.val}°C (${tempMin.cuando})` : '—'],
    ['Lecturas de temperatura', String(tratamientos.length)],
    ['Inspecciones', String(inspecciones.length)],
  ];
  resumen.forEach(([k, v]) => {
    ensureSpace(5);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(k, margin, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(v, margin + 78, y);
    y += 5;
  });

  // ===== Tipos de orgánicos cargados =====
  if (tiposOrganicos && tiposOrganicos.length > 0) {
    sectionTitle('Tipos de orgánico cargados');
    tableHeaders(['Tipo', 'Litros', 'Kg', 'Categoría'], [70, 30, 28, 34]);
    tiposOrganicos.forEach((t, i) => {
      tableRow([
        t.tipo || '—',
        String(Math.round(t.litros)),
        String(Math.round(t.kg)),
        t.categoria || '—',
      ], [70, 30, 28, 34], { fill: i % 2 === 0 });
    });
  }

  // ===== Cargas =====
  if (cargas.length) {
    sectionTitle('Cargas de la semana');
    tableHeaders(['Código', 'Estado', 'F. recepción', 'Ingreso BioComp'], [30, 30, 35, 45]);
    cargas.forEach((c, i) => {
      tableRow([
        c.codigo || '—',
        c.estado === 'en_biocomp' ? 'En BioComp' : c.estado === 'descargada' ? 'Descargada' : 'Recepción',
        c.fechaRealInicio || '—',
        c.fechaRealIngresoBiocomp || '—',
      ], [30, 30, 35, 45], { fill: i % 2 === 0 });
    });
  }

  // ===== Recepciones =====
  if (recepciones.length) {
    sectionTitle('Recepciones');
    tableHeaders(['Carga', 'Liviano L/kg', 'Denso L/kg', 'Crítico L', 'Total L/kg'], [22, 32, 32, 20, 34]);
    recepciones.forEach((r, i) => {
      const c = cargas.find(x => x.id === r.cargaId);
      tableRow([
        c?.codigo || '—',
        `${r.subtotalLivianoL || 0}/${r.subtotalLivianoKg || 0}`,
        `${r.subtotalDensoL || 0}/${r.subtotalDensoKg || 0}`,
        String(r.criticoLitros || 0),
        `${r.totalOrganicoL || 0}/${r.totalOrganicoKg || 0}`,
      ], [22, 32, 32, 20, 34], { fill: i % 2 === 0 });
    });
  }

  // ===== Acondicionamientos =====
  if (acondicionamientos.length) {
    sectionTitle('Acondicionamientos');
    tableHeaders(['Carga', 'Viruta necesaria', 'Viruta real L/kg', 'Total entrada L/kg', 'F. ingreso'], [22, 30, 32, 32, 24]);
    acondicionamientos.forEach((a, i) => {
      const c = cargas.find(x => x.id === a.cargaId);
      tableRow([
        c?.codigo || '—',
        `${a.virutaNecesariaL || 0} L`,
        `${a.virutaRealL || 0}/${a.virutaRealKg || 0}`,
        `${a.totalEntradaL || 0}/${a.totalEntradaKg || 0}`,
        a.fechaRealIngresoBiocomp || '—',
      ], [22, 30, 32, 32, 24], { fill: i % 2 === 0 });
    });
  }

  // ===== Temperaturas (tratamientos) =====
  if (tratamientos.length) {
    sectionTitle('Temperaturas');
    tableHeaders(['Fecha', 'Momento', 'T. entrada', 'T. salida', 'Estado', 'Obs'], [24, 22, 22, 22, 20, 30]);
    tratamientos.forEach((t, i) => {
      tableRow([
        t.fecha || '—',
        t.momento || '—',
        `${t.tempEntrada || 0}°C`,
        `${t.tempSalida || 0}°C`,
        t.cicloEstado === 'parado' ? 'Parado' : 'En ciclo',
        t.obs || '',
      ], [24, 22, 22, 22, 20, 30], { fill: i % 2 === 0 });
    });
  }

  // ===== Descargas =====
  if (descargas.length) {
    sectionTitle('Descargas');
    tableHeaders(['Fecha', 'Litros', 'Kg', 'Bins', 'Obs'], [28, 24, 24, 18, 36]);
    descargas.forEach((d, i) => {
      tableRow([
        d.fecha || '—',
        String(d.litrosDescargados || 0),
        String(d.kgDescargados || 0),
        String(d.binsUsados || 0),
        d.obs || '',
      ], [28, 24, 24, 18, 36], { fill: i % 2 === 0 });
    });
  }

  // ===== Inspecciones =====
  if (inspecciones.length) {
    sectionTitle('Inspecciones');
    tableHeaders(['Fecha', 'Temp', 'Humedad', 'Olor', 'Textura', 'Obs'], [22, 18, 20, 22, 24, 24]);
    inspecciones.forEach((ins, i) => {
      tableRow([
        ins.fecha || '—',
        `${ins.temperatura || 0}°C`,
        `${ins.humedad || 0}%`,
        ins.olor || '',
        ins.textura || '',
        ins.observaciones || '',
      ], [22, 18, 20, 22, 24, 24], { fill: i % 2 === 0 });
    });
  }

  // ===== Bins =====
  if (bins.length) {
    sectionTitle('Estado de bins');
    tableHeaders(['Estado', 'Fecha', 'Litros', 'Obs'], [35, 35, 25, 35]);
    bins.forEach((b, i) => {
      tableRow([
        b.estado === 'ocupado' ? 'Ocupado' : 'Vacío',
        b.fecha || '—',
        String(b.litros || 0),
        b.obs || '',
      ], [35, 35, 25, 35], { fill: i % 2 === 0 });
    });
  }

  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `BioComp Gestor · Informe semanal · Pág. ${p}/${pageCount}`,
      pageW / 2, pageH - 6, { align: 'center' }
    );
  }

  const fname = `Informe_BioComp_${desde}_${hasta}.pdf`;
  doc.save(fname);
}
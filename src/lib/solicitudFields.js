export const ENTITY_FIELDS = {
  Carga: {
    label: 'Carga',
    fields: [
      { key: 'codigo', label: 'Código', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'select', options: [{ value: 'recepcion', label: 'Recepción' }, { value: 'en_biocomp', label: 'En BioComp' }] },
      { key: 'fechaRealInicio', label: 'Fecha real de recepción', type: 'date' },
      { key: 'fechaRealIngresoBiocomp', label: 'Fecha de ingreso al BioComp', type: 'date' },
    ],
  },
  Recepcion: {
    label: 'Recepción',
    fields: [
      { key: 'subtotalVerduraL', label: 'Subtotal verdura (L)', type: 'number' },
      { key: 'subtotalVerduraKg', label: 'Subtotal verdura (kg)', type: 'number' },
      { key: 'subtotalCarneL', label: 'Subtotal carne (L)', type: 'number' },
      { key: 'subtotalCarneKg', label: 'Subtotal carne (kg)', type: 'number' },
      { key: 'densosLitros', label: 'Densos (L)', type: 'number' },
      { key: 'densosKg', label: 'Densos (kg)', type: 'number' },
      { key: 'descarteLitros', label: 'Descarte (L)', type: 'number' },
      { key: 'descarteKg', label: 'Descarte (kg)', type: 'number' },
      { key: 'totalOrganicoL', label: 'Total orgánico (L)', type: 'number' },
      { key: 'totalOrganicoKg', label: 'Total orgánico (kg)', type: 'number' },
    ],
  },
  Acondicionamiento: {
    label: 'Acondicionamiento',
    fields: [
      { key: 'virutaRealL', label: 'Viruta real (L)', type: 'number' },
      { key: 'virutaRealKg', label: 'Viruta real (kg)', type: 'number' },
      { key: 'totalEntradaL', label: 'Total entrada (L)', type: 'number' },
      { key: 'totalEntradaKg', label: 'Total entrada (kg)', type: 'number' },
      { key: 'fechaRealIngresoBiocomp', label: 'Fecha ingreso BioComp', type: 'date' },
    ],
  },
  Tratamiento: {
    label: 'Tratamiento',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date' },
      { key: 'momento', label: 'Momento', type: 'select', options: [{ value: 'mañana', label: 'Mañana' }, { value: 'mediodia', label: 'Mediodía' }, { value: 'noche', label: 'Noche' }] },
      { key: 'tempEntrada', label: 'Temp. entrada (°C)', type: 'number' },
      { key: 'tempSalida', label: 'Temp. salida (°C)', type: 'number' },
      { key: 'cicloEstado', label: 'Estado del ciclo', type: 'select', options: [{ value: 'en_ciclo', label: 'En ciclo' }, { value: 'parado', label: 'Parado' }] },
      { key: 'obs', label: 'Observaciones', type: 'text' },
    ],
  },
  Inspeccion: {
    label: 'Inspección',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date' },
      { key: 'temperatura', label: 'Temperatura (°C)', type: 'number' },
      { key: 'humedad', label: 'Humedad (%)', type: 'number' },
      { key: 'olor', label: 'Olor', type: 'text' },
      { key: 'textura', label: 'Textura', type: 'text' },
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'responsable', label: 'Responsable', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'text' },
    ],
  },
  Descarga: {
    label: 'Descarga',
    fields: [
      { key: 'fecha', label: 'Fecha', type: 'date' },
      { key: 'litrosDescargados', label: 'Litros descargados', type: 'number' },
      { key: 'kgDescargados', label: 'Kg descargados', type: 'number' },
      { key: 'binsUsados', label: 'Bins usados', type: 'number' },
      { key: 'obs', label: 'Observaciones', type: 'text' },
    ],
  },
  Bin: {
    label: 'Bin',
    fields: [
      { key: 'estado', label: 'Estado', type: 'select', options: [{ value: 'ocupado', label: 'Ocupado' }, { value: 'vacio', label: 'Vacío' }] },
      { key: 'fecha', label: 'Fecha', type: 'date' },
      { key: 'litros', label: 'Litros', type: 'number' },
      { key: 'obs', label: 'Observaciones', type: 'text' },
    ],
  },
};

export function recordLabel(entityType, record, cargas = []) {
  if (!record) return '—';
  switch (entityType) {
    case 'Carga':
      return record.codigo || '—';
    case 'Recepcion': {
      const c = cargas.find((x) => x.id === record.cargaId);
      return c?.codigo || `Recepción ${(record.cargaId || '').slice(-6)}`;
    }
    case 'Acondicionamiento': {
      const c = cargas.find((x) => x.id === record.cargaId);
      return `Acond. ${c?.codigo || (record.cargaId || '').slice(-6)}`;
    }
    case 'Tratamiento':
      return `${record.fecha || ''} · ${record.momento || ''}`;
    case 'Inspeccion':
      return record.fecha || '—';
    case 'Descarga':
      return `${record.fecha || ''} · ${record.litrosDescargados || 0}L`;
    case 'Bin':
      return `Bin ${record.fecha || ''} · ${record.estado || ''}`;
    default:
      return (record.id || '').slice(-6);
  }
}
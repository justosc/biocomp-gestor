// Formato de fechas con día de la semana (es-AR)

export function formatFechaLarga(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatFechaCorta(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha + 'T00:00:00');
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}

export function diaSemana(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long' });
}
import { base44 } from '@/api/base44Client';

// Dispara la sincronización a Google Sheets en segundo plano, sin bloquear
// la interfaz ni mostrar errores al operario (es accesorio al guardado).
export function syncSheetsSilently() {
  try {
    base44.functions.invoke('syncToGoogleSheets', {}).catch(() => {});
  } catch (_) {
    // ignore
  }
}
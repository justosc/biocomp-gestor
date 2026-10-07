import { base44 } from '@/api/base44Client';

// Re-export pure calculation functions from the shared module
export {
  DEFAULT_SETTINGS,
  decayMasaLineal,
  decayVolumen,
  diasTranscurridos,
  estimacionCargaHoy,
  calcFIFOFraccionRestante,
  masaRealTotal,
  masaOrganicaTotal,
  masaBrutaTotal,
  masaMaduraTotal,
  densidadGL,
  densidadPercent,
  humedadPercent,
  generarCodigoCarga,
  virutaNecesaria,
  calcularTotalesRecepcion,
  binsNecesarios,
} from '../../base44/shared/biocomp';

import { DEFAULT_SETTINGS } from '../../base44/shared/biocomp';

// --- Settings (entity-backed, frontend only) ---

let cachedSettings = null;

export async function getSettings() {
  if (cachedSettings) return cachedSettings;
  try {
    const list = await base44.entities.Setting.list();
    if (list.length > 0) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...list[0] };
      return cachedSettings;
    }
    try {
      const created = await base44.entities.Setting.create(DEFAULT_SETTINGS);
      cachedSettings = { ...DEFAULT_SETTINGS, ...created };
    } catch {
      cachedSettings = { ...DEFAULT_SETTINGS };
    }
    return cachedSettings;
  } catch {
    // Fallo transitorio (token, red): devolver defaults sin cachear para reintentar en el próximo llamado
    return { ...DEFAULT_SETTINGS };
  }
}

export function clearSettingsCache() {
  cachedSettings = null;
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Download, Upload, Database, AlertTriangle, FileJson, CheckCircle2 } from 'lucide-react';

const ENTITIES = [
  { name: 'Carga', label: 'Cargas' },
  { name: 'Recepcion', label: 'Recepciones' },
  { name: 'Acondicionamiento', label: 'Acondicionamientos' },
  { name: 'Tratamiento', label: 'Tratamientos' },
  { name: 'Inspeccion', label: 'Inspecciones' },
  { name: 'Descarga', label: 'Descargas' },
  { name: 'Bin', label: 'Bins' },
  { name: 'Setting', label: 'Configuración' },
];

// Accept multiple key-name variants for our own export format
const KEY_MAP = {
  Carga: ['Carga', 'Cargas', 'carga', 'cargas'],
  Recepcion: ['Recepcion', 'Recepciones', 'recepcion', 'recepciones'],
  Acondicionamiento: ['Acondicionamiento', 'Acondicionamientos', 'acondicionamiento', 'acondicionamientos'],
  Tratamiento: ['Tratamiento', 'Tratamientos', 'tratamiento', 'tratamientos'],
  Inspeccion: ['Inspeccion', 'Inspecciones', 'inspeccion', 'inspecciones'],
  Descarga: ['Descarga', 'Descargas', 'descarga', 'descargas'],
  Bin: ['Bin', 'Bins', 'bin', 'bins'],
  Setting: ['Setting', 'Settings', 'setting', 'settings', 'config', 'configuracion'],
};

// --- Helpers for legacy format transformation ---

function toDateOnly(val) {
  if (!val) return '';
  return String(val).slice(0, 10);
}

function toNumber(val) {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

function normalizeTachos(tachos) {
  if (!Array.isArray(tachos)) return [];
  return tachos.map(t => ({
    litros: toNumber(t.litros),
    pesoBrutoKg: toNumber(t.pesoBrutoKg),
    taraKg: toNumber(t.taraKg) || 12,
  }));
}

// --- Legacy record transformers (old web app → our entity schemas) ---

function transformLegacyCarga(r) {
  return {
    id: r.id,
    codigo: r.codigo || '',
    estado: r.estado || 'recepcion',
    fechaRealInicio: toDateOnly(r.fechaRealInicio),
    fechaRegistro: toDateOnly(r.fechaRegistro),
    fechaRealIngresoBiocomp: toDateOnly(r.fechaRealIngresoBiocomp),
  };
}

function transformLegacyRecepcion(r) {
  return {
    cargaId: r.cargaId,
    tachosVerdura: normalizeTachos(r.tachosVerdura),
    tachosCarne: normalizeTachos(r.tachosCarne),
    densosLitros: toNumber(r.densosL ?? r.densos?.litros),
    densosKg: toNumber(r.densosKg ?? r.densos?.kg),
    densosObs: r.densos?.observaciones || '',
    descarteLitros: toNumber(r.descarteL ?? r.descarte?.litros),
    descarteKg: toNumber(r.descarteKg ?? r.descarte?.kg),
    descarteMotivo: r.descarteMotivo || r.descarte?.motivo || '',
    subtotalVerduraL: toNumber(r.totalVerduraL),
    subtotalVerduraKg: toNumber(r.totalVerduraKg),
    subtotalCarneL: toNumber(r.totalCarneL),
    subtotalCarneKg: toNumber(r.totalCarneKg),
    totalOrganicoL: toNumber(r.totalOrganicoL),
    totalOrganicoKg: toNumber(r.totalOrganicoKg),
    densidadOrganica: toNumber(r.densidadOrganicoGL),
  };
}

function transformLegacyAcond(r) {
  return {
    cargaId: r.cargaId,
    virutaNecesariaL: toNumber(r.virutaNecesariaL),
    virutaRealL: toNumber(r.virutaRealL),
    virutaRealKg: toNumber(r.virutaRealKg),
    totalEntradaL: toNumber(r.totalEntradaL),
    totalEntradaKg: toNumber(r.totalEntradaKg),
    fechaRealIngresoBiocomp: toDateOnly(r.fecha),
  };
}

function transformLegacyDescarga(r) {
  return {
    fecha: toDateOnly(r.fecha),
    litrosDescargados: toNumber(r.litrosDescargados),
    kgDescargados: toNumber(r.kgDescargados),
    binsUsados: toNumber(r.binsUsados),
    obs: r.observaciones || '',
  };
}

function transformLegacyInspeccion(r) {
  return {
    fecha: toDateOnly(r.fecha),
    temperatura: toNumber(r.temperatura),
    humedad: toNumber(r.humedad),
    olor: r.olor || '',
    textura: r.textura || '',
    color: r.color || '',
    responsable: r.responsable || '',
    observaciones: r.observaciones || '',
  };
}

function transformLegacyTratamiento(r) {
  let momento = r.momento || 'mañana';
  if (momento === 'mediodía') momento = 'mediodia';
  return {
    fecha: toDateOnly(r.fecha),
    momento,
    tempEntrada: toNumber(r.tempEntrada),
    tempSalida: toNumber(r.tempSalida),
    cicloEstado: r.cicloEstado === 'parado' ? 'parado' : 'en_ciclo',
    obs: r.obs || '',
  };
}

function transformLegacyBin(r) {
  return {
    estado: r.estado === 'ocupado' ? 'ocupado' : 'vacio',
    fecha: toDateOnly(r.fechaLlenado || r.fechaVaciado),
    litros: toNumber(r.litros),
    obs: r.obs || (r.codigo ? r.codigo : ''),
  };
}

function transformLegacySetting(s) {
  return {
    sede: s.sede || 'Vicente López',
    capacidadBinL: toNumber(s.capacidadBinL),
    binsTotales: toNumber(s.binsTotales),
    capacidadTachoL: toNumber(s.capacidadTachoL),
    taraTacho220Kg: toNumber(s.taraTacho220Kg),
    virutaBolsaL: toNumber(s.virutaBolsaL),
    virutaBolsaKg: toNumber(s.virutaBolsaKg),
    diasEstabilizacion: toNumber(s.diasEstabilizacion),
    factorFinalVerdura: toNumber(s.factorFinalVerdura),
    factorFinalCarne: toNumber(s.factorFinalCarne),
    tempIdealMinC: toNumber(s.tempIdealMinC),
    tempIdealMaxC: toNumber(s.tempIdealMaxC),
    tableroOffsetC: toNumber(s.tableroOffsetC),
    humedadIdealMinPercent: toNumber(s.humedadIdealMinPercent),
    humedadIdealPercent: toNumber(s.humedadIdealPercent),
    litrosSemanaReferencia: toNumber(s.litrosSemanaReferencia),
    kgSemanaReferencia: toNumber(s.kgSemanaReferencia),
  };
}

function isLegacyFormat(raw) {
  return raw.schemaVersion !== undefined || Array.isArray(raw.cargas);
}

function normalizeLegacyData(raw) {
  const result = {};
  if (raw.settings && !Array.isArray(raw.settings)) {
    result.Setting = [transformLegacySetting(raw.settings)];
  }
  if (Array.isArray(raw.cargas)) result.Carga = raw.cargas.map(transformLegacyCarga);
  if (Array.isArray(raw.recepciones)) result.Recepcion = raw.recepciones.map(transformLegacyRecepcion);
  if (Array.isArray(raw.acondicionamientos)) result.Acondicionamiento = raw.acondicionamientos.map(transformLegacyAcond);
  if (Array.isArray(raw.descargas)) result.Descarga = raw.descargas.map(transformLegacyDescarga);
  if (Array.isArray(raw.inspecciones)) result.Inspeccion = raw.inspecciones.map(transformLegacyInspeccion);
  if (Array.isArray(raw.tratamientos)) result.Tratamiento = raw.tratamientos.map(transformLegacyTratamiento);
  if (Array.isArray(raw.bins)) result.Bin = raw.bins.map(transformLegacyBin);
  return result;
}

function mapJsonToEntities(raw) {
  if (isLegacyFormat(raw)) {
    return normalizeLegacyData(raw);
  }
  const mapped = {};
  for (const [entityName, aliases] of Object.entries(KEY_MAP)) {
    for (const alias of aliases) {
      if (Array.isArray(raw[alias]) && raw[alias].length > 0) {
        mapped[entityName] = raw[alias];
        break;
      }
    }
  }
  return mapped;
}

export default function Datos() {
  const { toast } = useToast();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const loadCounts = async () => {
    setLoading(true);
    const entries = await Promise.all(
      ENTITIES.map(e => base44.entities[e.name].list('-created_date', 5000).then(r => [e.name, r.length]))
    );
    setCounts(Object.fromEntries(entries));
    setLoading(false);
  };

  useEffect(() => { loadCounts(); }, []);

  const totalRecords = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = {};
      for (const e of ENTITIES) {
        data[e.name] = await base44.entities[e.name].list('-created_date', 5000);
      }
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biocomp-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Respaldo descargado', description: `${totalRecords} registros` });
    } catch (e) {
      toast({ title: 'Error al exportar', description: e.message, variant: 'destructive' });
    }
    setExporting(false);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    setImportFile(file);
    setPreview(null);
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        setPreview({ error: 'El JSON debe ser un objeto con claves por entidad (Carga, Recepcion, etc.).' });
        return;
      }
      const mapped = mapJsonToEntities(raw);
      const found = Object.keys(mapped).map(name => ({
        name,
        label: ENTITIES.find(en => en.name === name).label,
        count: mapped[name].length,
      }));
      setPreview({
        found,
        total: found.reduce((s, f) => s + f.count, 0),
        rawKeys: Object.keys(raw),
        legacy: isLegacyFormat(raw),
      });
    } catch (err) {
      setPreview({ error: 'No se pudo leer el JSON: ' + err.message });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: 'Seleccioná un archivo JSON', variant: 'destructive' });
      return;
    }
    if (!preview || preview.error || preview.found.length === 0) {
      toast({ title: 'Nada que importar', description: 'El archivo no contiene entidades reconocidas', variant: 'destructive' });
      return;
    }
    const ok = window.confirm(
      `Se van a importar ${preview.total} registros (${preview.found.map(f => f.label).join(', ')}).\n\nEsto BORRARÁ los datos actuales de esas entidades. ¿Continuar?`
    );
    if (!ok) return;

    setImporting(true);
    try {
      const text = await importFile.text();
      const raw = JSON.parse(text);
      const data = mapJsonToEntities(raw);

      const stripBuiltins = (r) => {
        const { id, created_date, updated_date, created_by_id, ...rest } = r;
        return rest;
      };

      // Preserve Google Sheets connection across import
      let existingSheetId = '', existingSheetUrl = '';
      const existingSettings = await base44.entities.Setting.list();
      if (existingSettings.length > 0) {
        existingSheetId = existingSettings[0].sheetId || '';
        existingSheetUrl = existingSettings[0].sheetUrl || '';
      }

      const imported = [];

      // Import Cargas first to build old→new ID mapping
      const cargaIdMap = {};
      if (data.Carga) {
        await base44.entities.Carga.deleteMany({});
        if (data.Carga.length > 0) {
          const created = await base44.entities.Carga.bulkCreate(data.Carga.map(stripBuiltins));
          if (Array.isArray(created)) {
            data.Carga.forEach((old, i) => { if (old.id) cargaIdMap[old.id] = created[i]?.id; });
          }
          imported.push(`${data.Carga.length} cargas`);
        }
      }

      // Import Recepciones with remapped cargaId
      if (data.Recepcion) {
        await base44.entities.Recepcion.deleteMany({});
        if (data.Recepcion.length > 0) {
          const records = data.Recepcion.map(r => {
            const clean = stripBuiltins(r);
            if (clean.cargaId) clean.cargaId = cargaIdMap[clean.cargaId] || clean.cargaId;
            return clean;
          });
          await base44.entities.Recepcion.bulkCreate(records);
          imported.push(`${data.Recepcion.length} recepciones`);
        }
      }

      // Import Acondicionamientos with remapped cargaId
      if (data.Acondicionamiento) {
        await base44.entities.Acondicionamiento.deleteMany({});
        if (data.Acondicionamiento.length > 0) {
          const records = data.Acondicionamiento.map(r => {
            const clean = stripBuiltins(r);
            if (clean.cargaId) clean.cargaId = cargaIdMap[clean.cargaId] || clean.cargaId;
            return clean;
          });
          await base44.entities.Acondicionamiento.bulkCreate(records);
          imported.push(`${data.Acondicionamiento.length} acondicionamientos`);
        }
      }

      // Import entities without foreign key references
      for (const name of ['Tratamiento', 'Inspeccion', 'Descarga', 'Bin']) {
        if (data[name]) {
          await base44.entities[name].deleteMany({});
          if (data[name].length > 0) {
            await base44.entities[name].bulkCreate(data[name].map(stripBuiltins));
            const label = ENTITIES.find(e => e.name === name).label.toLowerCase();
            imported.push(`${data[name].length} ${label}`);
          }
        }
      }

      // Import Settings (preserving sheetId/sheetUrl)
      if (data.Setting) {
        await base44.entities.Setting.deleteMany({});
        if (data.Setting.length > 0) {
          const records = data.Setting.map(r => ({
            ...stripBuiltins(r),
            sheetId: existingSheetId,
            sheetUrl: existingSheetUrl,
          }));
          await base44.entities.Setting.bulkCreate(records);
          imported.push(`configuración`);
        }
      }

      toast({ title: 'Importación completa', description: imported.join(' · ') || 'Sin cambios' });
      setImportFile(null);
      setPreview(null);
      await loadCounts();
    } catch (e) {
      toast({ title: 'Error al importar', description: e.message, variant: 'destructive' });
    }
    setImporting(false);
  };

  const canImport = importFile && preview && !preview.error && preview.found.length > 0;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Datos</h1>
        <p className="text-sm text-gray-500">Respaldo y restauración en JSON</p>
      </div>

      {/* Resumen de registros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Registros actuales · {totalRecords} total</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ENTITIES.map(e => (
            <div key={e.name} className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">{e.label}</p>
              <p className="font-bold text-gray-900">{counts[e.name] || 0}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exportar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Download className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Exportar respaldo</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">Descarga todos los datos en un archivo JSON para guardar como respaldo.</p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {exporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Descargando...' : 'Descargar JSON'}
        </button>
      </div>

      {/* Importar */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Upload className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Restaurar desde respaldo</h3>
        </div>
        <div className="flex items-start gap-2 mb-3 p-2 bg-amber-50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">La importación <strong>borra y reemplaza</strong> los datos actuales de las entidades presentes en el archivo. Acepta respaldos de esta app y de la versión web anterior.</p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="text-sm text-gray-600 w-full file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 file:font-medium file:cursor-pointer"
            />
            {importFile && <FileJson className="w-5 h-5 text-emerald-600 shrink-0" />}
          </div>

          {/* Vista previa del archivo */}
          {preview?.error && (
            <div className="p-2 bg-red-50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{preview.error}</p>
            </div>
          )}
          {preview && !preview.error && preview.found.length > 0 && (
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-900">{preview.total} registros para importar</p>
                {preview.legacy && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">formato web anterior</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {preview.found.map(f => (
                  <span key={f.name} className="text-xs px-2 py-1 bg-white rounded-md text-emerald-700 font-medium border border-emerald-100">
                    {f.label}: {f.count}
                  </span>
                ))}
              </div>
            </div>
          )}
          {preview && !preview.error && preview.found.length === 0 && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-start gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-amber-900">No se reconocieron entidades de BioComp</p>
              </div>
              <p className="text-xs text-amber-700 ml-6 mb-1">Claves encontradas en el archivo: <code className="text-amber-900 bg-amber-100 px-1 rounded">{preview.rawKeys.join(', ')}</code></p>
              <p className="text-xs text-amber-700 ml-6">Se esperan: Carga, Recepcion, Acondicionamiento, Tratamiento, Inspeccion, Descarga, Bin, Setting (o sus plurales en minúsculas).</p>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={importing || !canImport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {importing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
            {importing ? 'Importando...' : 'Restaurar datos'}
          </button>
        </div>
      </div>
    </div>
  );
}
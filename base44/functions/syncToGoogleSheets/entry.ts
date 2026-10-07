import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { DEFAULT_SETTINGS, estimacionCargaHoy, masaRealTotal, densidadGL, densidadPercent } from '../../shared/biocomp.ts';

const SHEET_TITLES = ['Resumen', 'Cargas Activas', 'Descargas', 'Recepciones', 'Tratamientos'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // Sólo usuarios autorizados (admin siempre) pueden disparar la sincronización:
    // la función opera con asServiceRole sobre todas las entidades y la cuenta
    // de Google del propietario, y actualiza la configuración global.
    if (user.role !== 'admin' && user.autorizado !== true) {
      return Response.json({ error: 'Forbidden: usuario no autorizado' }, { status: 403 });
    }

    // Get settings
    const settingsList = await base44.asServiceRole.entities.Setting.list();
    const setting = settingsList[0] || { ...DEFAULT_SETTINGS };

    // Get Google Sheets OAuth token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

    // Fetch all operational data
    const [cargas, recepciones, acondicionamientos, descargas, tratamientos, inspecciones, bins] = await Promise.all([
      base44.asServiceRole.entities.Carga.list('-created_date', 200),
      base44.asServiceRole.entities.Recepcion.list('-created_date', 200),
      base44.asServiceRole.entities.Acondicionamiento.list('-created_date', 200),
      base44.asServiceRole.entities.Descarga.list('-created_date', 200),
      base44.asServiceRole.entities.Tratamiento.list('-created_date', 50),
      base44.asServiceRole.entities.Inspeccion.list('-created_date', 50),
      base44.asServiceRole.entities.Bin.list('-created_date', 50),
    ]);

    // Calculate active loads and real mass
    const cargasActivas = cargas
      .filter(c => c.estado === 'en_biocomp')
      .map(c => {
        const recepc = recepciones.find(r => r.cargaId === c.id);
        const acond = acondicionamientos.find(a => a.cargaId === c.id);
        const estHoy = estimacionCargaHoy(recepc, acond, c.fechaRealIngresoBiocomp, setting);
        return { ...c, _estHoy: estHoy, _totalEntradaL: acond?.totalEntradaL || 0, _totalEntradaKg: acond?.totalEntradaKg || 0 };
      })
      .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '')); // orden estable: las filas no se reordenan entre syncs

    const totalDescargadoL = descargas.reduce((sum, d) => sum + (d.litrosDescargados || 0), 0);
    const masaReal = masaRealTotal(cargasActivas, totalDescargadoL);

    const ultimaTemp = tratamientos[0];
    const ultimaInspeccion = inspecciones[0];
    const offsetTablero = setting.tableroOffsetC || 0;
    const binsOcupados = bins.filter(b => b.estado === 'ocupado').length;
    const binsLibres = (setting.binsTotales || 4) - binsOcupados;

    // Get or create spreadsheet
    let spreadsheetId = setting.sheetId;
    let spreadsheetUrl = setting.sheetUrl;

    if (!spreadsheetId) {
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          properties: { title: 'BioComp - Resumen Operativo', locale: 'es_AR' },
          sheets: SHEET_TITLES.map(t => ({ properties: { title: t } })),
        }),
      });
      const sheetData = await createRes.json();
      if (!sheetData.spreadsheetId) throw new Error('No se pudo crear la planilla: ' + JSON.stringify(sheetData));
      spreadsheetId = sheetData.spreadsheetId;
      spreadsheetUrl = sheetData.spreadsheetUrl;

      // Save to settings
      if (setting.id) {
        await base44.asServiceRole.entities.Setting.update(setting.id, { sheetId: spreadsheetId, sheetUrl: spreadsheetUrl });
      } else {
        await base44.asServiceRole.entities.Setting.create({ ...DEFAULT_SETTINGS, sheetId: spreadsheetId, sheetUrl: spreadsheetUrl });
      }
    }

    // Build sheet data
    const fechaSync = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

    const resumenValues = [
      ['BioComp — Resumen Operativo', ''],
      ['Sede', setting.sede || ''],
      ['Última sincronización', fechaSync],
      ['', ''],
      ['Métrica', 'Valor'],
      ['Masa real (L)', Math.round(masaReal.litros)],
      ['Masa real (kg)', Math.round(masaReal.kg)],
      ['Densidad (g/L)', Math.round(densidadGL(masaReal.kg, masaReal.litros))],
      ['Densidad (%)', Number(densidadPercent(masaReal.kg, masaReal.litros).toFixed(1))],
      ['Cargas activas', cargasActivas.length],
      ['Bins ocupados', binsOcupados],
      ['Bins libres', binsLibres],
      ['Bins totales', setting.binsTotales || 4],
      ['', ''],
      ['Última temperatura (tablero)', ultimaTemp ? `${ultimaTemp.tempEntrada}°C entrada / ${ultimaTemp.tempSalida}°C salida` : '—'],
      ['Última temperatura (real)', ultimaTemp ? `${Number(((ultimaTemp.tempEntrada || 0) + offsetTablero).toFixed(1))}°C entrada / ${Number(((ultimaTemp.tempSalida || 0) + offsetTablero).toFixed(1))}°C salida` : '—'],
      ['Estado del ciclo', ultimaTemp ? (ultimaTemp.cicloEstado === 'parado' ? 'Parado' : 'En ciclo') : '—'],
      ['Última inspección', ultimaInspeccion ? ultimaInspeccion.fecha : '—'],
      ['Temp. inspección', ultimaInspeccion ? `${ultimaInspeccion.temperatura}°C` : '—'],
      ['Humedad', ultimaInspeccion ? `${ultimaInspeccion.humedad}%` : '—'],
      ['Olor', ultimaInspeccion ? (ultimaInspeccion.olor || '—') : '—'],
      ['Textura', ultimaInspeccion ? (ultimaInspeccion.textura || '—') : '—'],
    ];

    const cargasActivasValues = [
      ['Código', 'Fecha ingreso BioComp', 'Días en proceso', 'Litros (hoy)', 'Kg (hoy)', 'Entrada total L', 'Entrada total kg', 'Madura'],
      ...cargasActivas.map(c => [
        c.codigo || '',
        c.fechaRealIngresoBiocomp || '',
        c._estHoy.dias,
        Math.round(c._estHoy.litros),
        Math.round(c._estHoy.kg),
        c._totalEntradaL || 0,
        c._totalEntradaKg || 0,
        c._estHoy.esMadura ? 'Sí' : 'No',
      ]),
    ];

    const descargasOrdenadas = [...descargas].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const descargasValues = [
      ['Fecha', 'Litros descargados', 'Kg descargados', 'Bins usados', 'Obs'],
      ...descargasOrdenadas.map(d => [
        d.fecha || '',
        d.litrosDescargados || 0,
        d.kgDescargados || 0,
        d.binsUsados || 0,
        d.obs || '',
      ]),
    ];

    const recepcionesOrdenadas = [...recepciones].sort((a, b) => {
      const ca = cargas.find(c => c.id === a.cargaId)?.codigo || '';
      const cb = cargas.find(c => c.id === b.cargaId)?.codigo || '';
      return ca.localeCompare(cb);
    });
    const recepcionesValues = [
      ['Carga', 'Liviano L', 'Liviano Kg', 'Denso L', 'Denso Kg', 'Crítico L', 'Crítico Kg', 'Descarte L', 'Descarte Kg', 'Total Org L', 'Total Org Kg', 'Densidad g/L'],
      ...recepcionesOrdenadas.map(r => {
        const carga = cargas.find(c => c.id === r.cargaId);
        const livianoL = r.subtotalLivianoL ?? r.subtotalVerduraL ?? 0;
        const livianoKg = r.subtotalLivianoKg ?? r.subtotalVerduraKg ?? 0;
        const densoL = r.subtotalDensoL ?? ((r.subtotalCarneL ?? 0) + (r.densosLitros ?? 0));
        const densoKg = r.subtotalDensoKg ?? ((r.subtotalCarneKg ?? 0) + (r.densosKg ?? 0));
        return [
          carga?.codigo || (r.cargaId || '').slice(-6),
          livianoL,
          livianoKg,
          densoL,
          densoKg,
          r.criticoLitros || 0,
          r.criticoKg || 0,
          r.descarteLitros || 0,
          r.descarteKg || 0,
          r.totalOrganicoL || 0,
          r.totalOrganicoKg || 0,
          r.densidadOrganica || 0,
        ];
      }),
    ];

    const momentoOrder = { mañana: 0, mediodia: 1, noche: 2 };
    const tratamientosOrdenados = [...tratamientos].sort((a, b) => {
      const f = (a.fecha || '').localeCompare(b.fecha || '');
      if (f !== 0) return f;
      return (momentoOrder[a.momento] ?? 9) - (momentoOrder[b.momento] ?? 9);
    });
    const offset = setting.tableroOffsetC || 0;
    const tratamientosValues = [
      ['Fecha', 'Momento', 'Temp Entrada °C (tablero)', 'Temp Salida °C (tablero)', 'Temp Real Entrada °C', 'Temp Real Salida °C', 'Estado ciclo', 'Obs'],
      ...tratamientosOrdenados.map(t => [
        t.fecha || '',
        t.momento || '',
        t.tempEntrada || 0,
        t.tempSalida || 0,
        Number(((t.tempEntrada || 0) + offset).toFixed(1)),
        Number(((t.tempSalida || 0) + offset).toFixed(1)),
        t.cicloEstado === 'parado' ? 'Parado' : 'En ciclo',
        t.obs || '',
      ]),
    ];

    // Clear all sheets first, then write
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ranges: SHEET_TITLES }),
    });

    const batchRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // RAW: trata los valores como texto literal, evitando que un operario
        // inyecte fórmulas (=IMPORTDATA, =HYPERLINK, etc.) en campos de texto
        // libre (código, obs, olor, textura) que se evalúen al abrir la planilla.
        valueInputOption: 'RAW',
        data: [
          { range: 'Resumen!A1', values: resumenValues },
          { range: 'Cargas Activas!A1', values: cargasActivasValues },
          { range: 'Descargas!A1', values: descargasValues },
          { range: 'Recepciones!A1', values: recepcionesValues },
          { range: 'Tratamientos!A1', values: tratamientosValues },
        ],
      }),
    });

    const batchData = await batchRes.json();
    if (batchData.error) throw new Error('Error al escribir en la planilla: ' + JSON.stringify(batchData.error));

    // Gráfico de variación de temperatura en la hoja Tratamientos
    try {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties,sheets.charts`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const meta = await metaRes.json();
      const tratSheet = (meta.sheets || []).find(s => s.properties?.title === 'Tratamientos');
      if (tratSheet) {
        const sheetId = tratSheet.properties.sheetId;
        const dataRows = tratamientosOrdenados.length;
        const hasChart = (tratSheet.charts || []).length > 0;
        // Sólo crear el gráfico si no existe. Así se preservan las ediciones
        // (título, colores, tamaño) que el usuario le haga en Sheets.
        // El rango se fija con holgura (filas 2..201) para que las nuevas
        // lecturas aparezcan automáticamente sin recrear el gráfico.
        if (!hasChart && dataRows > 0) {
          const endRow = 201;
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                addChart: {
                  chart: {
                    spec: {
                      title: 'Variación de temperatura',
                      basicChart: {
                        chartType: 'LINE',
                        legendPosition: 'BOTTOM_LEGEND',
                        headerCount: 1,
                        axis: [
                          { position: 'BOTTOM_AXIS', title: 'Fecha' },
                          { position: 'LEFT_AXIS', title: 'Temperatura (°C)' },
                        ],
                        domains: [
                          { domain: { sourceRange: { sources: [{ sheetId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: 0, endColumnIndex: 1 }] } } },
                        ],
                        series: [
                          { series: { sourceRange: { sources: [{ sheetId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: 4, endColumnIndex: 5 }] } }, color: { rgbColor: { red: 0.1, green: 0.7, blue: 0.3 } } },
                          { series: { sourceRange: { sources: [{ sheetId, startRowIndex: 1, endRowIndex: endRow, startColumnIndex: 5, endColumnIndex: 6 }] } }, color: { rgbColor: { red: 0.9, green: 0.5, blue: 0.1 } } },
                        ],
                      },
                    },
                    position: { overlayPosition: { anchorCell: { sheetId, rowIndex: 0, columnIndex: 8 }, widthPixels: 720, heightPixels: 400 } },
                  },
                },
              }],
            }),
          });
        }
      }
    } catch (e) {
      // El gráfico es accesorio: no fallar toda la sync si hay un problema
      console.warn('No se pudo actualizar el gráfico de temperatura:', e?.message);
    }

    return Response.json({ ok: true, sheetUrl: spreadsheetUrl, sheetId: spreadsheetId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { generarInformeSemanalPDF } from '@/lib/informePdf';
import { FileDown, Calendar, Loader2 } from 'lucide-react';
import { formatFechaCorta } from '@/lib/formatDate';

// Devuelve el lunes (00:00) de la semana que contiene `date`
function lunesDeSemana(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export default function Informe() {
  const { settings } = useSettings();
  const [semanaSel, setSemanaSel] = useState(() => fmt(lunesDeSemana(new Date())));
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [preview, setPreview] = useState(null);

  // Calcula rango de la semana seleccionada
  const desde = semanaSel;
  const hastaDate = new Date(semanaSel);
  hastaDate.setDate(hastaDate.getDate() + 6);
  const hasta = fmt(hastaDate);

  const generar = async () => {
    setLoading(true);
    try {
      const desdeIso = desde + 'T00:00:00';
      const hastaIso = hasta + 'T23:59:59';
      const [cargas, recepciones, acondicionamientos, descargas, tratamientos, inspecciones, bins] = await Promise.all([
        base44.entities.Carga.list('-created_date', 500),
        base44.entities.Recepcion.list('-created_date', 500),
        base44.entities.Acondicionamiento.list('-created_date', 500),
        base44.entities.Descarga.list('-created_date', 500),
        base44.entities.Tratamiento.list('-created_date', 500),
        base44.entities.Inspeccion.list('-created_date', 500),
        base44.entities.Bin.list('-created_date', 500),
      ]);

      const inRange = (f) => {
        if (!f) return false;
        const v = f.length === 10 ? f + 'T12:00:00' : f;
        return v >= desdeIso && v <= hastaIso;
      };

      const filt = {
        cargas: cargas.filter(c => inRange(c.fechaRealInicio) || inRange(c.fechaRegistro)),
        recepciones: recepciones.filter(r => {
          const c = cargas.find(x => x.id === r.cargaId);
          return c && (inRange(c.fechaRealInicio) || inRange(c.fechaRegistro));
        }),
        acondicionamientos: acondicionamientos.filter(a => inRange(a.fechaRealIngresoBiocomp)),
        descargas: descargas.filter(d => inRange(d.fecha)),
        tratamientos: tratamientos.filter(t => inRange(t.fecha)),
        inspecciones: inspecciones.filter(i => inRange(i.fecha)),
        bins: bins.filter(b => inRange(b.fecha)),
      };

      const totalDescL = filt.descargas.reduce((s, d) => s + (d.litrosDescargados || 0), 0);
      const totalRecL = filt.recepciones.reduce((s, r) => s + (r.totalOrganicoL || 0), 0);
      const totalRecKg = filt.recepciones.reduce((s, r) => s + (r.totalOrganicoKg || 0), 0);
      const totalDescKg = filt.descargas.reduce((s, d) => s + (d.kgDescargados || 0), 0);
      const binsUsados = filt.descargas.reduce((s, d) => s + (d.binsUsados || 0), 0);
      const livianoL = filt.recepciones.reduce((s, r) => s + (r.subtotalLivianoL ?? 0), 0);
      const livianoKg = filt.recepciones.reduce((s, r) => s + (r.subtotalLivianoKg ?? 0), 0);
      const densoL = filt.recepciones.reduce((s, r) => s + (r.subtotalDensoL ?? 0), 0);
      const densoKg = filt.recepciones.reduce((s, r) => s + (r.subtotalDensoKg ?? 0), 0);
      const criticoL = filt.recepciones.reduce((s, r) => s + (r.criticoLitros || 0), 0);
      const criticoKg = filt.recepciones.reduce((s, r) => s + (r.criticoKg || 0), 0);

      // Temperaturas extremas (entrada + offset de tablero)
      const offset = settings?.tableroOffsetC || 0;
      let tempMax = null, tempMin = null;
      filt.tratamientos.forEach(t => {
        const val = (Number(t.tempEntrada) || 0) + offset;
        const cuando = `${t.fecha || ''} ${t.momento || ''}`.trim();
        if (!tempMax || val > tempMax.val) tempMax = { val, cuando };
        if (!tempMin || val < tempMin.val) tempMin = { val, cuando };
      });

      // Desglose por tipo de orgánico (agrega liviano, denso y crítico)
      const tipoMap = {};
      filt.recepciones.forEach(r => {
        (r.tachosLiviano ?? r.tachosVerdura ?? []).forEach(t => {
          if (!t.tipo) return;
          const key = t.tipo + '|Liviano';
          if (!tipoMap[key]) tipoMap[key] = { tipo: t.tipo, categoria: 'Liviano', litros: 0, kg: 0 };
          tipoMap[key].litros += Number(t.litros) || 0;
          tipoMap[key].kg += Math.max(0, (Number(t.pesoBrutoKg) || 0) - (Number(t.taraKg) || 0));
        });
        (r.tachosDenso ?? r.tachosCarne ?? []).forEach(t => {
          if (!t.tipo) return;
          const key = t.tipo + '|Denso';
          if (!tipoMap[key]) tipoMap[key] = { tipo: t.tipo, categoria: 'Denso', litros: 0, kg: 0 };
          tipoMap[key].litros += Number(t.litros) || 0;
          tipoMap[key].kg += Math.max(0, (Number(t.pesoBrutoKg) || 0) - (Number(t.taraKg) || 0));
        });
        if (r.criticoTipo) {
          const key = r.criticoTipo + '|Crítico';
          if (!tipoMap[key]) tipoMap[key] = { tipo: r.criticoTipo, categoria: 'Crítico', litros: 0, kg: 0 };
          tipoMap[key].litros += Number(r.criticoLitros) || 0;
          tipoMap[key].kg += Number(r.criticoKg) || 0;
        }
      });
      const tiposOrganicos = Object.values(tipoMap).sort((a, b) => b.litros - a.litros);

      setPreview({
        cargas: filt.cargas.length,
        recepciones: filt.recepciones.length,
        acondicionamientos: filt.acondicionamientos.length,
        descargas: filt.descargas.length,
        tratamientos: filt.tratamientos.length,
        inspecciones: filt.inspecciones.length,
        bins: filt.bins.length,
        totalRecL: Math.round(totalRecL),
        totalRecKg: Math.round(totalRecKg),
        totalDescL: Math.round(totalDescL),
        totalDescKg: Math.round(totalDescKg),
        livianoL: Math.round(livianoL), densoL: Math.round(densoL), criticoL: Math.round(criticoL),
        tempMax: tempMax?.val, tempMin: tempMin?.val,
      });

      // Resumen ejecutivo con IA
      setGenerando(true);
      const metrics = {
        cargasRecibidas: filt.cargas.length,
        recepcionL: totalRecL, recepcionKg: totalRecKg,
        livianoL, livianoKg, densoL, densoKg,
        criticoL, criticoKg,
        descargadoL: totalDescL, descargadoKg: totalDescKg, binsUsados,
        descargas: filt.descargas.length,
        tempMaxVal: tempMax?.val ?? null, tempMaxCuando: tempMax?.cuando ?? '',
        tempMinVal: tempMin?.val ?? null, tempMinCuando: tempMin?.cuando ?? '',
        tratamientos: filt.tratamientos.length,
        inspecciones: filt.inspecciones.length,
        tiposOrganicos,
      };
      let resumenIA = '';
      try {
        const iaRes = await base44.functions.invoke('generarResumenIA', { desde, hasta, metrics });
        resumenIA = iaRes?.data?.resumen || '';
      } catch (e) { resumenIA = ''; }

      generarInformeSemanalPDF({
        settings, desde, hasta,
        ...filt,
        resumenIA,
        tempMax, tempMin,
        tiposOrganicos,
      });
    } catch (e) {
      console.error('Error generando informe', e);
      alert('No se pudo generar el informe: ' + e.message);
    } finally {
      setLoading(false);
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Informe semanal</h1>
        <p className="text-sm text-gray-500">Descargá un PDF con todos los movimientos de la semana</p>
      </div>

      {/* Selector de semana */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Semana (lunes de inicio)
        </label>
        <input
          type="date"
          value={semanaSel}
          onChange={e => { setSemanaSel(e.target.value); setPreview(null); }}
          className="mt-2 w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
        />
        <p className="text-xs text-gray-400 mt-2">
          Período: <span className="font-medium text-gray-600">{formatFechaCorta(desde)} → {formatFechaCorta(hasta)}</span>
        </p>
      </div>

      {/* Vista previa de conteos */}
      {preview && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Movimientos de la semana</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <PreviewItem label="Cargas" value={preview.cargas} />
            <PreviewItem label="Descargas" value={preview.descargas} />
            <PreviewItem label="Recibido" value={`${preview.totalRecL}L · ${preview.totalRecKg}kg`} />
            <PreviewItem label="Descargado" value={`${preview.totalDescL}L · ${preview.totalDescKg}kg`} />
            <PreviewItem label="Liviano" value={`${preview.livianoL}L`} />
            <PreviewItem label="Denso" value={`${preview.densoL}L`} />
            <PreviewItem label="Crítico descartado" value={`${preview.criticoL}L`} />
            <PreviewItem label="Temp. máx" value={preview.tempMax != null ? `${preview.tempMax}°C` : '—'} />
            <PreviewItem label="Temp. mín" value={preview.tempMin != null ? `${preview.tempMin}°C` : '—'} />
            <PreviewItem label="Inspecciones" value={preview.inspecciones} />
          </div>
        </div>
      )}

      {/* Botón generar */}
      <button
        onClick={generar}
        disabled={loading || generando || !settings}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {loading || generando ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Generando PDF…</>
        ) : (
          <><FileDown className="w-5 h-5" /> Descargar informe PDF</>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center">
        El PDF incluye cargas, recepciones, acondicionamientos, temperaturas, descargas, inspecciones y estado de bins.
      </p>
    </div>
  );
}

function PreviewItem({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold text-gray-900">{value}</p>
    </div>
  );
}
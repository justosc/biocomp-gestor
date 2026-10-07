import React, { useState, useEffect, useCallback } from 'react';
import PullToRefresh from '@/components/PullToRefresh';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { estimacionCargaHoy } from '@/lib/biocomp';
import { History, ChevronRight } from 'lucide-react';
import { diaSemana, formatFechaCorta } from '@/lib/formatDate';

export default function Historial() {
  const { settings } = useSettings();
  const [cargas, setCargas] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [acondicionamientos, setAcondicionamientos] = useState([]);
  const [descargas, setDescargas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('cargas');

  const load = useCallback(async () => {
    const [c, r, a, d, t, i] = await Promise.all([
      base44.entities.Carga.list('-created_date', 200),
      base44.entities.Recepcion.list('-created_date', 200),
      base44.entities.Acondicionamiento.list('-created_date', 200),
      base44.entities.Descarga.list('-created_date', 200),
      base44.entities.Tratamiento.list('-created_date', 200),
      base44.entities.Inspeccion.list('-created_date', 200),
    ]);
    setCargas([...c].sort((a, b) => (b.codigo || '').localeCompare(a.codigo || ''))); setRecepciones(r); setAcondicionamientos(a);
    setDescargas(d); setTratamientos(t); setInspecciones(i);
  }, []);

  useEffect(() => {
    load().then(() => setLoading(false));
  }, [load]);

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const tabs = [
    { key: 'cargas', label: 'Cargas' },
    { key: 'recepciones', label: 'Recepciones' },
    { key: 'descargas', label: 'Descargas' },
    { key: 'tratamientos', label: 'Tratamientos' },
    { key: 'inspecciones', label: 'Inspecciones' },
  ];

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
        <p className="text-sm text-gray-500">Registro completo de todo lo cargado</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-hide bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              filter === t.key ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filter === 'cargas' && (
          <div className="divide-y divide-gray-50">
            {cargas.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sin registros</p>}
            {cargas.map(c => {
              const acond = acondicionamientos.find(a => a.cargaId === c.id);
              const recepc = recepciones.find(r => r.cargaId === c.id);
              const estHoy = c.estado === 'en_biocomp' && acond && recepc
                ? estimacionCargaHoy(recepc, acond, c.fechaRealIngresoBiocomp, settings)
                : null;
              return (
                <Link key={c.id} to={`/carga/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <span className="font-medium text-sm text-gray-900">{c.codigo}</span>
                    <span className="ml-2 text-xs text-gray-400 capitalize">{diaSemana(c.fechaRealInicio)}</span>
                    <span className="ml-1 text-xs text-gray-400">{formatFechaCorta(c.fechaRealInicio)}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${c.estado === 'en_biocomp' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.estado === 'en_biocomp' ? 'BioComp' : 'Recepción'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    {estHoy && <span className="text-xs text-gray-500">{Math.round(estHoy.litros)}L · {estHoy.dias}d</span>}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {filter === 'recepciones' && (
          <div className="divide-y divide-gray-50">
            {recepciones.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sin registros</p>}
            {recepciones.map(r => {
              const carga = cargas.find(c => c.id === r.cargaId);
              return (
                <div key={r.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">{carga?.codigo || '—'}</span>
                    <span className="text-xs text-gray-400">{r.totalOrganicoL}L orgánico</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Liviano: {r.subtotalLivianoL ?? r.subtotalVerduraL ?? 0}L/{r.subtotalLivianoKg ?? r.subtotalVerduraKg ?? 0}kg · Denso: {r.subtotalDensoL ?? ((r.subtotalCarneL ?? 0) + (r.densosLitros ?? 0))}L/{r.subtotalDensoKg ?? ((r.subtotalCarneKg ?? 0) + (r.densosKg ?? 0))}kg · Crítico: {r.criticoLitros ?? 0}L · Descarte: {r.descarteLitros}L
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filter === 'descargas' && (
          <div className="divide-y divide-gray-50">
            {descargas.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sin registros</p>}
            {descargas.map(d => (
              <div key={d.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">{d.fecha}</span>
                  <span className="text-sm text-gray-600">{d.litrosDescargados}L · {d.kgDescargados}kg</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">{d.binsUsados} bins{d.obs && ` · ${d.obs}`}</div>
              </div>
            ))}
          </div>
        )}

        {filter === 'tratamientos' && (
          <div className="divide-y divide-gray-50">
            {tratamientos.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sin registros</p>}
            {tratamientos.map(t => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">{t.fecha} · {t.momento}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.cicloEstado === 'parado' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {t.cicloEstado === 'parado' ? 'Parado' : 'En ciclo'}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Entrada: {t.tempEntrada}°C (real {(t.tempEntrada || 0) + (settings.tableroOffsetC || 0)}°C) · Salida: {t.tempSalida}°C
                  {t.obs && ` · ${t.obs}`}
                </div>
              </div>
            ))}
          </div>
        )}

        {filter === 'inspecciones' && (
          <div className="divide-y divide-gray-50">
            {inspecciones.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Sin registros</p>}
            {inspecciones.map(i => (
              <div key={i.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-gray-900">{i.fecha}</span>
                  <span className="text-xs text-gray-400">{i.responsable}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {i.temperatura}°C · {i.humedad}% · {i.olor} · {i.textura} · {i.color}
                  {i.observaciones && ` · ${i.observaciones}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
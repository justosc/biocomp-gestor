import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { estimacionCargaHoy, masaRealTotal, densidadGL, densidadPercent } from '@/lib/biocomp';
import { AlertTriangle, Cpu, Droplets, Boxes, Thermometer } from 'lucide-react';
import SheetsSync from '@/components/SheetsSync';

export default function Resumen() {
  const { settings } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [c, r, a, d, t, i, b] = await Promise.all([
        base44.entities.Carga.list('-created_date', 200),
        base44.entities.Recepcion.list('-created_date', 200),
        base44.entities.Acondicionamiento.list('-created_date', 200),
        base44.entities.Descarga.list('-created_date', 200),
        base44.entities.Tratamiento.list('-created_date', 10),
        base44.entities.Inspeccion.list('-created_date', 5),
        base44.entities.Bin.list('-created_date', 50),
      ]);
      setData({ cargas: c, recepciones: r, acondicionamientos: a, descargas: d, tratamientos: t, inspecciones: i, bins: b });
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const { cargas, recepciones, acondicionamientos, descargas, tratamientos, inspecciones, bins } = data;

  const cargasActivas = cargas
    .filter(c => c.estado === 'en_biocomp')
    .map(c => {
      const recepc = recepciones.find(r => r.cargaId === c.id);
      const acond = acondicionamientos.find(a => a.cargaId === c.id);
      const estHoy = estimacionCargaHoy(recepc, acond, c.fechaRealIngresoBiocomp, settings);
      return { ...c, _estHoy: estHoy, _totalEntradaL: acond?.totalEntradaL || 0, _totalEntradaKg: acond?.totalEntradaKg || 0 };
    });

  const totalDescargadoL = descargas.reduce((sum, d) => sum + (d.litrosDescargados || 0), 0);
  const masaReal = masaRealTotal(cargasActivas, totalDescargadoL);

  const ultimaTemp = tratamientos[0];
  const ultimaInspeccion = inspecciones[0];
  const binsOcupados = bins.filter(b => b.estado === 'ocupado').length;
  const binsLibres = (settings.binsTotales || 4) - binsOcupados;

  const alertas = [];
  if (ultimaTemp?.cicloEstado === 'parado') alertas.push({ tipo: 'critical', msg: 'Equipo parado' });
  if (binsLibres <= 1) alertas.push({ tipo: 'warning', msg: `Bins libres: ${binsLibres}` });
  cargasActivas.forEach(c => {
    if (c._estHoy?.esMadura) alertas.push({ tipo: 'info', msg: `${c.codigo} madura (${c._estHoy.dias}d)` });
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Resumen</h1>
        <p className="text-sm text-gray-500">{settings.sede} · Lectura rápida</p>
      </div>

      <SheetsSync />

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, idx) => (
            <div key={idx} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium ${
              a.tipo === 'critical' ? 'bg-red-50 text-red-700' :
              a.tipo === 'warning' ? 'bg-amber-50 text-amber-700' :
              'bg-blue-50 text-blue-700'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* Masa real */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white shadow-lg">
        <p className="text-emerald-100 text-sm">Masa real en BioComp</p>
        <div className="flex items-baseline gap-4 mt-1">
          <span className="text-4xl font-bold">{Math.round(masaReal.litros)}<span className="text-lg text-emerald-200 ml-1">L</span></span>
          <span className="text-2xl font-semibold">{Math.round(masaReal.kg)}<span className="text-sm text-emerald-200 ml-1">kg</span></span>
        </div>
        <p className="text-sm text-emerald-100 mt-2">Densidad: {Math.round(densidadGL(masaReal.kg, masaReal.litros))} g/L · {densidadPercent(masaReal.kg, masaReal.litros).toFixed(1)}%</p>
      </div>

      {/* Cargas activas */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Cargas activas ({cargasActivas.length})</h3>
        </div>
        {cargasActivas.length === 0 ? (
          <p className="text-sm text-gray-400 py-3 text-center">Sin cargas activas</p>
        ) : (
          <div className="space-y-2">
            {cargasActivas.map(c => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <span className="font-medium text-sm text-gray-900">{c.codigo}</span>
                  <span className="text-xs text-gray-400 ml-2">{c._estHoy.dias} días</span>
                  {c._estHoy.esMadura && <span className="ml-2 text-xs text-emerald-600 font-medium">madura</span>}
                </div>
                <div className="text-sm text-gray-600">{Math.round(c._estHoy.litros)}L · {Math.round(c._estHoy.kg)}kg</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Última inspección */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Última inspección</h3>
          </div>
          {ultimaInspeccion ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Fecha</span><span className="font-medium">{ultimaInspeccion.fecha}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Temp</span><span className="font-medium">{ultimaInspeccion.temperatura}°C</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Humedad</span><span className="font-medium">{ultimaInspeccion.humedad}%</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Olor</span><span className="font-medium">{ultimaInspeccion.olor || '—'}</span></div>
            </div>
          ) : <p className="text-sm text-gray-400">Sin inspecciones</p>}
        </div>

        {/* Última temp */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Última temperatura</h3>
          </div>
          {ultimaTemp ? (
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Fecha</span><span className="font-medium">{ultimaTemp.fecha} · {ultimaTemp.momento}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Entrada</span><span className="font-medium">{ultimaTemp.tempEntrada}°C</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Salida</span><span className="font-medium">{ultimaTemp.tempSalida}°C</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Estado</span><span className={`font-medium ${ultimaTemp.cicloEstado === 'parado' ? 'text-red-600' : 'text-emerald-600'}`}>{ultimaTemp.cicloEstado === 'parado' ? 'Parado' : 'En ciclo'}</span></div>
            </div>
          ) : <p className="text-sm text-gray-400">Sin lecturas</p>}
        </div>
      </div>

      {/* Acopio */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Boxes className="w-4 h-4 text-amber-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Acopio listo para transportista</h3>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: settings.binsTotales }).map((_, i) => {
            const bin = bins[i];
            const ocupado = bin?.estado === 'ocupado';
            return (
              <div key={i} className={`flex-1 py-3 rounded-lg text-center text-sm font-medium ${
                ocupado ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
              }`}>
                Bin {i + 1}
                <div className="text-xs">{ocupado ? 'ocupado' : 'vacío'}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
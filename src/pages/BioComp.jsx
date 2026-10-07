import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { estimacionCargaHoy, masaRealTotal, masaOrganicaTotal, masaMaduraTotal, densidadGL, densidadPercent } from '@/lib/biocomp';
import { Cpu, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { diaSemana } from '@/lib/formatDate';

export default function BioComp() {
  const { settings } = useSettings();
  const [cargas, setCargas] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [acondicionamientos, setAcondicionamientos] = useState([]);
  const [descargas, setDescargas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [c, r, a, d] = await Promise.all([
          base44.entities.Carga.list('-created_date', 200),
          base44.entities.Recepcion.list('-created_date', 200),
          base44.entities.Acondicionamiento.list('-created_date', 200),
          base44.entities.Descarga.list('-created_date', 200),
        ]);
        setCargas(c); setRecepciones(r); setAcondicionamientos(a); setDescargas(d);
      } catch (e) {
        console.error('BioComp load error', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  // El conteo se hace SOBRE las cargas activas ahora (en_biocomp). Las cargas
  // descargadas (históricas) ya salieron del BioComp y no se mezclan: la masa
  // real es la suma de lo que está adentro hoy, sin descuento FIFO de viejas.
  const cargasActivas = cargas
    .filter(c => c.estado === 'en_biocomp')
    .map(c => {
      const recepc = recepciones.find(r => r.cargaId === c.id);
      const acond = acondicionamientos.find(a => a.cargaId === c.id);
      const estHoy = estimacionCargaHoy(recepc, acond, c.fechaRealIngresoBiocomp, settings, c.horaRealIngresoBiocomp);
      return { ...c, _recepc: recepc, _acond: acond, _estHoy: estHoy, _totalEntradaL: acond?.totalEntradaL || 0, _totalEntradaKg: acond?.totalEntradaKg || 0 };
    })
    .sort((a, b) => {
      const f = (a.fechaRealIngresoBiocomp || '').localeCompare(b.fechaRealIngresoBiocomp || '');
      return f !== 0 ? f : (a.codigo || '').localeCompare(b.codigo || '');
    });

  const totalDescargadoL = descargas.reduce((sum, d) => sum + (d.litrosDescargados || 0), 0);
  const masaReal = masaRealTotal(cargasActivas, 0);
  const masaOrganica = masaOrganicaTotal(cargasActivas, 0);
  const masaMadura = masaMaduraTotal(cargasActivas, 0, settings);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">BioComp · Cargas activas</h1>
        <p className="text-sm text-gray-500">Kollvik BIOCOMP 1545 · {cargasActivas.length} cargas adentro</p>
      </div>

      {/* Masa real total */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-emerald-100 text-sm">Masa real total de hoy</p>
        <div className="flex items-baseline gap-4 mt-1">
          <span className="text-3xl font-bold">{Math.round(masaReal.litros)}<span className="text-lg text-emerald-200 ml-1">L</span></span>
          <span className="text-xl font-semibold">{Math.round(masaReal.kg)}<span className="text-sm text-emerald-200 ml-1">kg</span></span>
        </div>
        <p className="text-sm text-emerald-100 mt-2">Densidad: {Math.round(densidadGL(masaOrganica.kg, masaOrganica.litros))} g/L · {densidadPercent(masaOrganica.kg, masaOrganica.litros).toFixed(1)}%</p>
        <p className="text-xs text-emerald-200 mt-1">Total descargado históricamente: {totalDescargadoL}L</p>
        <p className="text-xs text-emerald-100 mt-2 pt-2 border-t border-emerald-500/30">
          Proy. al madurar: <span className="font-semibold text-white">{Math.round(masaMadura.kg)} kg</span> · {Math.round(masaMadura.litros)} L
          <span className="text-emerald-200"> (total con viruta)</span>
        </p>
      </div>

      {/* Lista de cargas */}
      {cargasActivas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
          <Cpu className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400">No hay cargas activas en el BioComp</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cargasActivas.map(c => {
            const fraccion = masaReal.fraccion?.[c.id] ?? 1;
            const pctRestante = (fraccion * 100).toFixed(0);
            return (
              <Link key={c.id} to={`/carga/${c.id}`} className="block bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{c.codigo}</span>
                    {c._estHoy.esMadura && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Madura
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="capitalize">{diaSemana(c.fechaRealIngresoBiocomp)}</span>
                  <span>· {c._estHoy.dias} días adentro</span>
                </p>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className="text-gray-700 font-medium">{Math.round(c._estHoy.litrosTotal)}L · {Math.round(c._estHoy.kgTotal)}kg</span>
                  <span className="text-xs text-gray-400">FIFO {pctRestante}%</span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctRestante}%` }} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
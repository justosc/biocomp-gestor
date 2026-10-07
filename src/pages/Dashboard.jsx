import React, { useState, useEffect, useCallback } from 'react';
import PullToRefresh from '@/components/PullToRefresh';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { estimacionCargaHoy, masaRealTotal, masaOrganicaTotal, masaMaduraTotal, densidadGL, densidadPercent, humedadPercent } from '@/lib/biocomp';
import DeshidratacionBars from '@/components/DeshidratacionBars';
import StatCard from '@/components/StatCard';
import AlertAccordion from '@/components/AlertAccordion';
import { Link } from 'react-router-dom';
import { Cpu, Droplets, Thermometer, Trash2, Boxes, ArrowRight, ChevronRight, History } from 'lucide-react';
import { diaSemana, formatFechaCorta } from '@/lib/formatDate';

export default function Dashboard() {
  const { settings } = useSettings();
  const [cargas, setCargas] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [acondicionamientos, setAcondicionamientos] = useState([]);
  const [descargas, setDescargas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [inspecciones, setInspecciones] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [c, r, a, d, t, i, b] = await Promise.all([
      base44.entities.Carga.list('-created_date', 200),
      base44.entities.Recepcion.list('-created_date', 200),
      base44.entities.Acondicionamiento.list('-created_date', 200),
      base44.entities.Descarga.list('-created_date', 200),
      base44.entities.Tratamiento.list('-created_date', 50),
      base44.entities.Inspeccion.list('-created_date', 50),
      base44.entities.Bin.list('-created_date', 50),
    ]);
    setCargas(c); setRecepciones(r); setAcondicionamientos(a);
    setDescargas(d); setTratamientos(t); setInspecciones(i); setBins(b);
  }, []);

  useEffect(() => {
    load().catch(() => {}).finally(() => setLoading(false));
  }, [load]);

  // Refrescar automáticamente cuando cambien los datos (alta/baja/edición de
  // cargas, recepciones, descargas, etc.) — las pestañas persistentes no
  // recargan al volver, así que la masa y el histórico se sincronizan solos.
  useEffect(() => {
    const unsubs = [
      base44.entities.Carga.subscribe(() => load()),
      base44.entities.Recepcion.subscribe(() => load()),
      base44.entities.Acondicionamiento.subscribe(() => load()),
      base44.entities.Descarga.subscribe(() => load()),
      base44.entities.Tratamiento.subscribe(() => load()),
      base44.entities.Inspeccion.subscribe(() => load()),
      base44.entities.Bin.subscribe(() => load()),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [load]);

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
    });

  const totalDescargadoL = descargas.reduce((sum, d) => sum + (d.litrosDescargados || 0), 0);
  const masaReal = masaRealTotal(cargasActivas, 0);          // total: orgánico + viruta deshidratados
  const masaOrganica = masaOrganicaTotal(cargasActivas, 0);  // orgánico solo, para densidad/humedad
  const masaMadura = masaMaduraTotal(cargasActivas, 0, settings);
  const organicoInicialL = cargasActivas.reduce((s, c) => s + (c._recepc?.totalOrganicoL || 0), 0);
  const organicoHoyL = cargasActivas.reduce((s, c) => s + (c._estHoy.litros || 0), 0);
  const virutaInicialL = cargasActivas.reduce((s, c) => s + (c._acond?.virutaRealL || 0), 0);
  const virutaHoyL = cargasActivas.reduce((s, c) => s + (c._estHoy.virutaL || 0), 0);

  // Histórico acumulado desde la primera carga
  // Recibido = orgánico (recepciones) + viruta estructurante (acondicionamientos)
  const totalRecibidoL = recepciones.reduce((sum, r) => sum + (r.totalOrganicoL || 0) + (r.densosLitros || 0), 0)
    + acondicionamientos.reduce((sum, a) => sum + (a.virutaRealL || 0), 0);
  const totalRecibidoKg = recepciones.reduce((sum, r) => sum + (r.totalOrganicoKg || 0) + (r.densosKg || 0), 0)
    + acondicionamientos.reduce((sum, a) => sum + (a.virutaRealKg || 0), 0);
  const totalDescargadoHistL = descargas.reduce((sum, d) => sum + (d.litrosDescargados || 0), 0);
  const totalDescargadoHistKg = descargas.reduce((sum, d) => sum + (d.kgDescargados || 0), 0);
  const cargasTotales = cargas.length;
  const primeraCarga = cargas.length > 0
    ? [...cargas].sort((a, b) => (a.fechaRealInicio || '').localeCompare(b.fechaRealInicio || ''))[0]
    : null;

  const ultimaTemp = tratamientos[0];
  const ultimaInspeccion = inspecciones[0];
  const binsOcupados = bins.filter(b => b.estado === 'ocupado').length;
  const binsLibres = (settings.binsTotales || 4) - binsOcupados;

  const cargasPendientesAcond = cargas.filter(c => c.estado === 'recepcion').length;

  // Tarjeta de temperatura (siempre visible como referencia)
  const tempRealUltima = ultimaTemp ? (ultimaTemp.tempEntrada || 0) + (settings.tableroOffsetC || 0) : null;
  let tempStatus = 'none';
  let tempMsg = '';
  if (ultimaTemp) {
    if (ultimaTemp.cicloEstado === 'parado') { tempStatus = 'critical'; tempMsg = 'Equipo parado'; }
    else if (tempRealUltima < settings.tempIdealMinC) { tempStatus = 'warning'; tempMsg = `Baja (${settings.tempIdealMinC}-${settings.tempIdealMaxC}°C ideal)`; }
    else if (tempRealUltima > settings.tempIdealMaxC + 10) { tempStatus = 'warning'; tempMsg = `Alta (${settings.tempIdealMinC}-${settings.tempIdealMaxC}°C ideal)`; }
    else { tempStatus = 'ok'; tempMsg = 'En rango ideal'; }
  }
  const tempCard = {
    status: tempStatus,
    tempReal: tempRealUltima,
    rango: `${settings.tempIdealMinC}-${settings.tempIdealMaxC}°C`,
    msg: tempMsg,
    fecha: ultimaTemp?.fecha,
    momento: ultimaTemp?.momento,
  };

  // Otras alertas (se despliegan al tocar la tarjeta de temperatura)
  const otherAlerts = [];
  // Humedad del compost = densidad relativa de la masa activa (son equivalentes)
  if (masaOrganica.litros > 0) {
    const humedadActual = humedadPercent(masaOrganica.kg, masaOrganica.litros);
    if (humedadActual < settings.humedadIdealMinPercent) {
      otherAlerts.push({ tipo: 'humedad', msg: `Humedad baja: ${humedadActual.toFixed(0)}% (ideal ${settings.humedadIdealMinPercent}-${settings.humedadIdealPercent}%)` });
    } else if (humedadActual > settings.humedadIdealPercent) {
      otherAlerts.push({ tipo: 'humedad', msg: `Humedad alta: ${humedadActual.toFixed(0)}% (ideal ${settings.humedadIdealMinPercent}-${settings.humedadIdealPercent}%)` });
    }
  }
  if (binsLibres <= 1) {
    otherAlerts.push({ tipo: 'bins', msg: `Pocos bins libres: ${binsLibres} de ${settings.binsTotales}` });
  }
  cargasActivas.forEach(c => {
    if (c._estHoy?.esMadura) {
      otherAlerts.push({ tipo: 'madura', msg: `Carga ${c.codigo} madura (${c._estHoy.dias} días) — lista para descarga` });
    }
  });

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 capitalize">{settings.sede} · {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Alertas — acordeón con temperatura primero */}
      <AlertAccordion tempCard={tempCard} otherAlerts={otherAlerts} />

      {/* Masa real */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide">Masa real en BioComp hoy · orgánico + viruta</p>
        <div className="flex items-end justify-between gap-3 mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold leading-none">{Math.round(masaReal.litros)}</span>
            <span className="text-base text-emerald-200">L</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-semibold leading-none">{Math.round(masaReal.kg)}</span>
            <span className="text-xs text-emerald-200">kg</span>
          </div>
        </div>

        {/* Barras de deshidratación (demo) */}
        <DeshidratacionBars
          organicoInicialL={organicoInicialL}
          organicoHoyL={organicoHoyL}
          virutaInicialL={virutaInicialL}
          virutaHoyL={virutaHoyL}
        />

        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-emerald-500/30 text-xs">
          <span className="text-emerald-100">Densidad <span className="font-semibold text-white">{Math.round(densidadGL(masaOrganica.kg, masaOrganica.litros))} g/L</span></span>
          <span className="text-emerald-200">·</span>
          <span className="text-emerald-100">Humedad <span className="font-semibold text-white">{densidadPercent(masaOrganica.kg, masaOrganica.litros).toFixed(1)}%</span></span>
          <span className="text-emerald-200 ml-auto text-[11px]">sobre orgánico</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-[11px] text-emerald-200">
          <span>Proy. al madurar:</span>
          <span className="font-semibold text-white">{Math.round(masaMadura.kg)} kg</span>
          <span>·</span>
          <span>{Math.round(masaMadura.litros)} L</span>
          <span className="ml-auto">total con viruta</span>
        </div>
      </div>

      {/* Histórico acumulado */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Histórico acumulado</h3>
          {primeraCarga && (
            <span className="text-xs text-gray-400 ml-auto">desde {formatFechaCorta(primeraCarga.fechaRealInicio)}</span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50 rounded-xl p-2.5">
            <p className="text-emerald-700 text-[11px] font-medium">Recibido</p>
            <p className="text-emerald-700/70 text-[10px] leading-tight">Orgánico + viruta que entró</p>
            <p className="font-bold text-emerald-900 text-base leading-tight mt-0.5">{Math.round(totalRecibidoL)}<span className="text-[11px] font-normal ml-0.5">L</span></p>
            <p className="text-emerald-700 text-[11px]">{Math.round(totalRecibidoKg)} kg</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5">
            <p className="text-amber-700 text-[11px] font-medium">Descargado</p>
            <p className="text-amber-700/70 text-[10px] leading-tight">Material maduro retirado</p>
            <p className="font-bold text-amber-900 text-base leading-tight mt-0.5">{Math.round(totalDescargadoHistL)}<span className="text-[11px] font-normal ml-0.5">L</span></p>
            <p className="text-amber-700 text-[11px]">{Math.round(totalDescargadoHistKg)} kg</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-2.5">
            <p className="text-gray-500 text-[11px] font-medium">Cargas</p>
            <p className="text-gray-400 text-[10px] leading-tight">Ingresos registrados</p>
            <p className="font-bold text-gray-900 text-base leading-tight mt-0.5">{cargasTotales}</p>
            <p className="text-gray-400 text-[11px]">{descargas.length} descargas</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <StatCard label="Cargas activas" value={cargasActivas.length} unit="" icon={Cpu} accent="emerald" />
        <StatCard label="Pend. acondicionar" value={cargasPendientesAcond} unit="" icon={ArrowRight} accent={cargasPendientesAcond > 0 ? 'amber' : 'gray'} />
        <StatCard label="Bins libres" value={binsLibres} unit={`/${settings.binsTotales}`} icon={Boxes} accent={binsLibres <= 1 ? 'amber' : 'emerald'} />
        <StatCard label="Última temp." value={ultimaTemp ? (ultimaTemp.tempEntrada || 0) + (settings.tableroOffsetC || 0) : '—'} unit="°C" icon={Thermometer} accent="blue" />
      </div>

      {/* Última inspección */}
      {ultimaInspeccion && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Última inspección</h3>
            <span className="text-xs text-gray-400 ml-auto">{ultimaInspeccion.fecha}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-sm">
            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5"><span className="text-gray-400 text-xs block">Temp.</span><span className="font-medium">{ultimaInspeccion.temperatura}°C</span></div>
            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5"><span className="text-gray-400 text-xs block">Humedad</span><span className="font-medium">{ultimaInspeccion.humedad}%</span></div>
            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5"><span className="text-gray-400 text-xs block">Olor</span><span className="font-medium">{ultimaInspeccion.olor || '—'}</span></div>
            <div className="bg-gray-50 rounded-lg px-2.5 py-1.5"><span className="text-gray-400 text-xs block">Textura</span><span className="font-medium">{ultimaInspeccion.textura || '—'}</span></div>
          </div>
        </div>
      )}

      {/* Cargas activas resumen */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 text-sm">Cargas en BioComp</h3>
          <Link to="/biocomp" className="text-xs text-emerald-600 font-medium hover:underline">Ver todas →</Link>
        </div>
        {cargasActivas.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No hay cargas activas</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {cargasActivas.slice(0, 5).map(c => (
              <Link key={c.id} to={`/carga/${c.id}`} className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-1 px-1 rounded-lg active:bg-gray-100 transition-colors">
                <div className="min-w-0">
                  <span className="font-medium text-sm text-gray-900">{c.codigo}</span>
                  <span className="text-xs text-gray-400 ml-2">{c._estHoy.dias}d · <span className="capitalize">{diaSemana(c.fechaRealInicio)}</span></span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-gray-700">{Math.round(c._estHoy.litros)}L</span>
                  {c._estHoy.esMadura && <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-1.5 py-0.5 rounded-full">madura</span>}
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { to: '/recepcion', label: 'Nueva recepción', icon: ArrowRight },
          { to: '/tratamiento', label: 'Cargar temp.', icon: Thermometer },
          { to: '/inspeccion', label: 'Inspección', icon: Droplets },
          { to: '/descarga', label: 'Descarga', icon: Trash2 },
        ].map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.to} to={a.to} className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-white border border-gray-100 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/30 active:scale-[0.98] transition-all">
              <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-emerald-600" />
              </span>
              <span className="text-sm font-medium text-gray-700">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
    </PullToRefresh>
  );
}
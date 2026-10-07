import React, { useState } from 'react';
import { Thermometer, ChevronDown, Droplets, Boxes, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

const statusStyles = {
  critical: { gradient: 'from-red-500 to-rose-600', chip: 'bg-red-50 text-red-700', ring: 'ring-red-200', label: 'Crítico', icon: AlertTriangle },
  warning: { gradient: 'from-amber-500 to-orange-600', chip: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', label: 'Atención', icon: AlertTriangle },
  ok: { gradient: 'from-emerald-500 to-teal-600', chip: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', label: 'Óptimo', icon: CheckCircle2 },
  none: { gradient: 'from-slate-400 to-slate-500', chip: 'bg-slate-50 text-slate-600', ring: 'ring-slate-200', label: 'Sin datos', icon: Thermometer },
};

const otherIcon = (tipo) => {
  if (tipo === 'humedad') return Droplets;
  if (tipo === 'bins') return Boxes;
  if (tipo === 'madura') return Cpu;
  return AlertTriangle;
};

const otherStyle = (tipo) => {
  if (tipo === 'humedad') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (tipo === 'bins') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (tipo === 'madura') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export default function AlertAccordion({ tempCard, otherAlerts }) {
  const [open, setOpen] = useState(false);
  const s = statusStyles[tempCard.status] || statusStyles.none;
  const StatusIcon = s.icon;
  const hasOthers = otherAlerts.length > 0;

  return (
    <div className="space-y-3">
      {/* Tarjeta de temperatura — siempre visible, tappable */}
      <button
        onClick={() => hasOthers && setOpen(o => !o)}
        className={`w-full text-left rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-lg overflow-hidden transition-all ${hasOthers ? 'active:scale-[0.99] cursor-pointer' : 'cursor-default'}`}
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-white/80">Temperatura del BioComp</p>
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <StatusIcon className="w-3.5 h-3.5" />
                  {s.label}
                </p>
              </div>
            </div>
            {hasOthers && (
              <ChevronDown className={`w-5 h-5 text-white/80 transition-transform ${open ? 'rotate-180' : ''}`} />
            )}
          </div>

          <div className="flex items-end gap-3 mt-4">
            <span className="text-4xl font-bold tabular-nums">
              {tempCard.tempReal !== null && tempCard.tempReal !== undefined ? tempCard.tempReal : '—'}
              <span className="text-xl text-white/80 ml-1">°C</span>
            </span>
            <div className="pb-1.5">
              <p className="text-xs text-white/70">Última lectura</p>
              <p className="text-sm font-medium">{tempCard.fecha ? `${tempCard.fecha} · ${tempCard.momento || ''}`.trim() : 'Sin registrar'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-white/15 text-white/90">Rango ideal {tempCard.rango}</span>
            {tempCard.msg && <span className="text-white/80">{tempCard.msg}</span>}
          </div>
        </div>
      </button>

      {/* Otras alertas — colapsadas, se despliegan al tocar la temperatura */}
      {hasOthers && open && (
        <div className="space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {otherAlerts.map((a, idx) => {
            const Icon = otherIcon(a.tipo);
            return (
              <div key={idx} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl text-sm font-medium leading-relaxed border ${otherStyle(a.tipo)}`}>
                <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{a.msg}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
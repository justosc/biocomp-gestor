import React from 'react';

// Barras finas apiladas de demostración: muestran cuánto se deshidrató el
// orgánico y la viruta desde su ingreso hasta hoy. Pensadas para vivir sobre
// la tarjeta verde del Dashboard (texto blanco).
export default function DeshidratacionBars({ organicoInicialL, organicoHoyL, virutaInicialL, virutaHoyL }) {
  const bars = [
    { label: 'Orgánico', inicial: organicoInicialL, hoy: organicoHoyL, fill: 'bg-white' },
    { label: 'Viruta', inicial: virutaInicialL, hoy: virutaHoyL, fill: 'bg-amber-300' },
  ];

  return (
    <div className="mt-3 space-y-2">
      {bars.map(b => {
        const pct = b.inicial > 0 ? Math.min(100, (b.hoy / b.inicial) * 100) : 0;
        const perdido = Math.max(0, Math.round(b.inicial - b.hoy));
        return (
          <div key={b.label}>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-emerald-100 font-medium">{b.label}</span>
              <span className="text-emerald-200">
                {Math.round(b.hoy)}L <span className="text-emerald-200/60">/ {Math.round(b.inicial)}L</span>
                <span className="text-emerald-200/80"> · −{perdido}L ({pct.toFixed(0)}%)</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div
                className={`h-full ${b.fill} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
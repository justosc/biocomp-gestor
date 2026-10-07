import React, { useState } from 'react';
import { ChevronDown, Trash2, Thermometer, Sunrise, Sun, Moon } from 'lucide-react';

const MOMENTO_ORDER = { mañana: 0, mediodia: 1, noche: 2 };
const MOMENTO_LABEL = { mañana: 'Mañana', mediodia: 'Mediodía', noche: 'Noche' };
const MOMENTO_ICON = { mañana: Sunrise, mediodia: Sun, noche: Moon };
const MOMENTO_COLOR = { mañana: 'bg-amber-50 text-amber-700', mediodia: 'bg-orange-50 text-orange-700', noche: 'bg-indigo-50 text-indigo-700' };

export function sortTratamientos(list) {
  return [...list].sort((a, b) => {
    const f = (b.fecha || '').localeCompare(a.fecha || '');
    if (f !== 0) return f;
    return (MOMENTO_ORDER[a.momento] ?? 9) - (MOMENTO_ORDER[b.momento] ?? 9);
  });
}

export default function TempHistoryAccordion({ lecturas, settings, onDelete }) {
  const [openDate, setOpenDate] = useState(null);

  // Agrupar por fecha (descendente)
  const groups = {};
  lecturas.forEach(l => {
    const key = l.fecha || '—';
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  });
  const fechas = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const tempColor = (temp) => {
    if (temp === null || temp === undefined) return 'gray';
    if (temp < settings.tempIdealMinC) return 'amber';
    if (temp > settings.tempIdealMaxC + 10) return 'red';
    return 'emerald';
  };
  const colorBar = { emerald: 'bg-emerald-500', red: 'bg-red-500', amber: 'bg-amber-500', gray: 'bg-gray-300' };

  if (lecturas.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">Sin lecturas registradas</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm">Historial de lecturas</h3>
        <p className="text-xs text-gray-400 mt-0.5">Ordenado por fecha · mañana, mediodía y noche</p>
      </div>
      <div className="divide-y divide-gray-50">
        {fechas.map(fecha => {
          const items = groups[fecha].sort((a, b) => (MOMENTO_ORDER[a.momento] ?? 9) - (MOMENTO_ORDER[b.momento] ?? 9));
          const isOpen = openDate === fecha;
          // Estado del día = peor lectura
          const peor = items.reduce((acc, l) => {
            const real = (l.tempEntrada || 0) + (settings.tableroOffsetC || 0);
            const c = tempColor(real);
            if (c === 'red' || (c === 'amber' && acc !== 'red')) return c;
            return acc;
          }, 'emerald');
          return (
            <div key={fecha}>
              <button
                onClick={() => setOpenDate(isOpen ? null : fecha)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-8 rounded-full ${colorBar[peor]}`} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{fecha}</p>
                    <p className="text-xs text-gray-400">{items.length} lectura{items.length > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-3 space-y-2 bg-gray-50/50">
                  {items.map(l => {
                    const tempReal = (l.tempEntrada || 0) + (settings.tableroOffsetC || 0);
                    const color = tempColor(tempReal);
                    const MIcon = MOMENTO_ICON[l.momento] || Thermometer;
                    return (
                      <div key={l.id} className="flex items-center justify-between bg-white rounded-lg border border-gray-100 px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${MOMENTO_COLOR[l.momento] || 'bg-gray-50 text-gray-600'}`}>
                            <MIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{MOMENTO_LABEL[l.momento] || l.momento}</p>
                            <p className="text-xs text-gray-400">
                              Entrada {l.tempEntrada}°C (real {tempReal}°C) · Salida {l.tempSalida}°C
                              {l.cicloEstado === 'parado' && <span className="text-red-600 font-medium ml-1">· PARADO</span>}
                            </p>
                            {l.obs && <p className="text-xs text-gray-400 italic mt-0.5">"{l.obs}"</p>}
                          </div>
                        </div>
                        <button onClick={() => onDelete(l.id)} className="text-gray-300 hover:text-red-500 p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
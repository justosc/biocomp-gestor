import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { estimacionCargaHoy, masaRealTotal } from '@/lib/biocomp';
import { HelpCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export default function Ayuda() {
  const { settings } = useSettings();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  // Diagnóstico automático (motor de reglas)
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
  const cargasMaduras = cargasActivas.filter(c => c._estHoy?.esMadura);

  const diagnostico = [];

  // Regla: equipo parado
  if (ultimaTemp?.cicloEstado === 'parado') {
    diagnostico.push({ tipo: 'critical', titulo: 'Equipo parado', desc: 'La última lectura de temperatura indica que el ciclo está detenido. Verificar el equipo.' });
  }

  // Regla: temperatura fuera de rango
  if (ultimaTemp) {
    const tempReal = (ultimaTemp.tempEntrada || 0) + (settings.tableroOffsetC || 0);
    if (tempReal < settings.tempIdealMinC) {
      diagnostico.push({ tipo: 'warning', titulo: 'Temperatura baja', desc: `Temp real ${tempReal}°C está por debajo del mínimo ideal (${settings.tempIdealMinC}°C). El manual del fabricante indica 45-65°C.` });
    } else if (tempReal > settings.tempIdealMaxC + 10) {
      diagnostico.push({ tipo: 'warning', titulo: 'Temperatura alta', desc: `Temp real ${tempReal}°C está por encima del rango práctico (${settings.tempIdealMinC}-${settings.tempIdealMaxC}°C).` });
    } else {
      diagnostico.push({ tipo: 'ok', titulo: 'Temperatura en rango', desc: `Temp real ${tempReal}°C dentro del rango ideal (${settings.tempIdealMinC}-${settings.tempIdealMaxC}°C).` });
    }
  }

  // Regla: humedad
  if (ultimaInspeccion) {
    if (ultimaInspeccion.humedad < settings.humedadIdealMinPercent) {
      diagnostico.push({ tipo: 'warning', titulo: 'Humedad baja', desc: `Humedad ${ultimaInspeccion.humedad}% por debajo del ideal (${settings.humedadIdealMinPercent}-${settings.humedadIdealPercent}%). Agregar agua o material húmedo.` });
    } else if (ultimaInspeccion.humedad > settings.humedadIdealPercent) {
      diagnostico.push({ tipo: 'warning', titulo: 'Humedad alta', desc: `Humedad ${ultimaInspeccion.humedad}% por encima del ideal. Si al apretar un puñado chorrea líquido, agregar viruta.` });
    } else {
      diagnostico.push({ tipo: 'ok', titulo: 'Humedad en rango', desc: `Humedad ${ultimaInspeccion.humedad}% dentro del rango ideal.` });
    }
  }

  // Regla: cargas maduras
  if (cargasMaduras.length > 0) {
    diagnostico.push({ tipo: 'info', titulo: `${cargasMaduras.length} carga(s) madura(s)`, desc: `Cargas con ≥${settings.diasEstabilizacion} días listas para descarga: ${cargasMaduras.map(c => c.codigo).join(', ')}.` });
  }

  // Regla: bins
  if (binsLibres <= 1) {
    diagnostico.push({ tipo: 'warning', titulo: 'Pocos bins libres', desc: `Solo ${binsLibres} bins libres de ${settings.binsTotales}. Coordinar retiro con el transportista.` });
  }

  // Regla: masa real alta (cercana a descarga semanal)
  if (masaReal.litros > settings.litrosSemanaReferencia * 0.8) {
    diagnostico.push({ tipo: 'info', titulo: 'Masa acumulada', desc: `Masa real ${Math.round(masaReal.litros)}L cerca de la referencia semanal (${settings.litrosSemanaReferencia}L). Considerar descarga.` });
  }

  // Manual del fabricante (resumen)
  const manualKollvik = [
    { titulo: 'Rango de temperatura', desc: '45-65°C según manual Kollvik. El operador usa 45-50°C como referencia práctica.' },
    { titulo: 'Tiempo de proceso', desc: '19-21 días de deshidratación y compostaje antes de la descarga.' },
    { titulo: 'Descarga semanal', desc: 'Recomendado los viernes. ~1200-1280L / ~700kg, aproximadamente 2 bins.' },
    { titulo: 'Estructurante', desc: 'Viruta: 1:1 con verdura, 2:1 con carne (doble de viruta por litro de carne).' },
    { titulo: 'Humedad', desc: '40-60%. Prueba de la mano: si se une y chorrea líquido, exceso de humedad.' },
    { titulo: 'Offset del tablero', desc: 'El tablero marca ~5°C menos que la temperatura real interna.' },
  ];

  const manualFiltrado = search
    ? manualKollvik.filter(m => m.titulo.toLowerCase().includes(search.toLowerCase()) || m.desc.toLowerCase().includes(search.toLowerCase()))
    : manualKollvik;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ayuda</h1>
        <p className="text-sm text-gray-500">Diagnóstico automático + manual del fabricante</p>
      </div>

      {/* Diagnóstico */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600" /> Diagnóstico automático
        </h2>
        <div className="space-y-2">
          {diagnostico.length === 0 && <p className="text-sm text-gray-400">Sin datos para diagnosticar</p>}
          {diagnostico.map((d, idx) => {
            const Icon = d.tipo === 'critical' ? AlertTriangle : d.tipo === 'warning' ? AlertTriangle : d.tipo === 'ok' ? CheckCircle2 : Info;
            const color = d.tipo === 'critical' ? 'red' : d.tipo === 'warning' ? 'amber' : d.tipo === 'ok' ? 'emerald' : 'blue';
            return (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                color === 'red' ? 'bg-red-50 border-red-200' :
                color === 'amber' ? 'bg-amber-50 border-amber-200' :
                color === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${
                  color === 'red' ? 'text-red-600' :
                  color === 'amber' ? 'text-amber-600' :
                  color === 'emerald' ? 'text-emerald-600' :
                  'text-blue-600'
                }`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{d.titulo}</p>
                  <p className="text-sm text-gray-600">{d.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Manual del fabricante */}
      <div>
        <h2 className="font-semibold text-gray-900 text-sm mb-2">Manual Kollvik BIOCOMP 1545</h2>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar en el manual..."
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400 mb-3"
        />
        <div className="space-y-2">
          {manualFiltrado.map((m, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <p className="text-sm font-semibold text-gray-900">{m.titulo}</p>
              <p className="text-sm text-gray-500">{m.desc}</p>
            </div>
          ))}
          {manualFiltrado.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>}
        </div>
      </div>
    </div>
  );
}
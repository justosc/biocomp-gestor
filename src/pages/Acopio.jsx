import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/use-toast';
import { Boxes, CheckCircle2, Truck, Share2, Leaf } from 'lucide-react';

export default function Acopio() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [bins, setBins] = useState([]);
  const [descargas, setDescargas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [list, descs] = await Promise.all([
        base44.entities.Bin.list('-created_date', 50),
        base44.entities.Descarga.list('-created_date', 500),
      ]);
      setBins(list);
      setDescargas(descs);
    } catch (e) {
      console.error('Acopio load error', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const binsOcupados = bins.filter(b => b.estado === 'ocupado');
  const binsVacios = bins.filter(b => b.estado === 'vacio');
  const totalBins = settings.binsTotales || 4;
  const libres = totalBins - binsOcupados.length;

  const vaciarBin = async (bin) => {
    await base44.entities.Bin.update(bin.id, { estado: 'vacio', obs: `Vaciado por transportista ${new Date().toISOString().slice(0, 10)}` });
    toast({ title: 'Bin vaciado', description: 'Disponible para nueva descarga' });
    load();
  };

  // Totales descargados acumulados
  const totalDescargadoL = descargas.reduce((sum, d) => sum + (d.litrosDescargados || 0), 0);
  const totalDescargadoKg = descargas.reduce((sum, d) => sum + (d.kgDescargados || 0), 0);
  const totalBinsUsados = descargas.reduce((sum, d) => sum + (d.binsUsados || 0), 0);
  const ultimaDescarga = descargas[0];

  const compartirResumen = async () => {
    const fecha = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const mensaje =
`🌱 *BioComp — Resumen de acopio* 🌱
📅 ${fecha}
📍 ${settings.sede || 'Sede'}

📊 *Total compost descargado:*
• ${Math.round(totalDescargadoL)} litros
• ${Math.round(totalDescargadoKg)} kg
• ${totalBinsUsados} bins usados en descargas

📦 *Listo para retiro:*
• ${binsOcupados.length} bins ocupados
• ${libres} bins libres / ${totalBins} totales${ultimaDescarga ? `\n• Última descarga: ${ultimaDescarga.fecha}` : ''}

_Este es el compost maduro listo para ser retirado por logística._`;

    try {
      const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      window.open(url, '_blank');
    } catch (e) {
      try {
        await navigator.clipboard.writeText(mensaje);
        toast({ title: 'Resumen copiado', description: 'Pegalo en el chat que quieras' });
      } catch {
        toast({ title: 'No se pudo compartir', variant: 'destructive' });
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Acopio</h1>
        <p className="text-sm text-gray-500">Gestión de bins · {totalBins} bins físicos · {settings.capacidadBinL}L c/u</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
          <Boxes className="w-5 h-5 text-amber-600 mb-1" />
          <p className="text-2xl font-bold text-amber-900">{binsOcupados.length}</p>
          <p className="text-xs text-amber-700">Ocupados</p>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mb-1" />
          <p className="text-2xl font-bold text-emerald-900">{libres}</p>
          <p className="text-xs text-emerald-700">Libres</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <Truck className="w-5 h-5 text-gray-600 mb-1" />
          <p className="text-2xl font-bold text-gray-900">{binsVacios.length}</p>
          <p className="text-xs text-gray-500">Retirados</p>
        </div>
      </div>

      {/* Resumen total descargado */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-5 h-5 text-emerald-100" />
          <h3 className="font-semibold text-sm">Compost descargado (total acumulado)</h3>
        </div>
        <div className="flex items-baseline gap-4 mt-2">
          <div>
            <span className="text-4xl font-bold">{Math.round(totalDescargadoL)}</span>
            <span className="text-lg text-emerald-200 ml-1">L</span>
          </div>
          <div>
            <span className="text-2xl font-semibold">{Math.round(totalDescargadoKg)}</span>
            <span className="text-sm text-emerald-200 ml-1">kg</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-emerald-100">
          <span>{totalBinsUsados} bins usados en descargas</span>
          <span>{binsOcupados.length} bins listos para retiro</span>
        </div>
        {ultimaDescarga && (
          <p className="text-xs text-emerald-200 mt-1">Última descarga: {ultimaDescarga.fecha}</p>
        )}
        <button
          onClick={compartirResumen}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur text-white font-medium text-sm transition-colors min-h-[48px]"
        >
          <Share2 className="w-4 h-4" />
          Compartir resumen a logística / receptor
        </button>
      </div>

      {/* Bins ocupados */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Bins ocupados — listos para el transportista</h3>
        </div>
        {binsOcupados.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No hay bins ocupados</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {binsOcupados.map(b => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Bin del {b.fecha}</p>
                  <p className="text-xs text-gray-400">{b.litros}L · {b.kg || 0}kg · {b.obs}</p>
                </div>
                <button onClick={() => vaciarBin(b)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100">
                  <Truck className="w-4 h-4" /> Vaciar bin
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bins vaciados */}
      {binsVacios.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Bins vaciados (retirados)</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {binsVacios.map(b => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm text-gray-500">Bin del {b.fecha}</p>
                  <p className="text-xs text-gray-400">{b.obs}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
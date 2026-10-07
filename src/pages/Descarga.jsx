import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { estimacionCargaHoy, masaRealTotal, binsNecesarios } from '@/lib/biocomp';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Save, AlertTriangle, Boxes } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { syncSheetsSilently } from '@/lib/syncSheets';

export default function Descarga() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cargas, setCargas] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [acondicionamientos, setAcondicionamientos] = useState([]);
  const [descargas, setDescargas] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    litrosDescargados: '',
    kgDescargados: '',
    binsUsados: '',
    obs: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [c, r, a, d, b] = await Promise.all([
      base44.entities.Carga.list('-created_date', 200),
      base44.entities.Recepcion.list('-created_date', 200),
      base44.entities.Acondicionamiento.list('-created_date', 200),
      base44.entities.Descarga.list('-created_date', 200),
      base44.entities.Bin.list('-created_date', 50),
    ]);
    setCargas(c); setRecepciones(r); setAcondicionamientos(a); setDescargas(d); setBins(b);
    setLoading(false);
  }

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

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

  const binsOcupados = bins.filter(b => b.estado === 'ocupado').length;
  const binsLibres = (settings.binsTotales || 4) - binsOcupados;
  const litrosForm = Number(form.litrosDescargados) || 0;
  const binsNec = litrosForm > 0 ? binsNecesarios(litrosForm, settings.capacidadBinL) : 0;
  const faltanBins = binsNec > binsLibres;

  const usarMasaReal = () => {
    setForm(f => ({ ...f, litrosDescargados: Math.round(masaReal.litros), kgDescargados: Math.round(masaReal.kg), binsUsados: binsNecesarios(masaReal.litros, settings.capacidadBinL) }));
  };

  const handleSave = async () => {
    if (!form.fecha || litrosForm <= 0) {
      toast({ title: 'Faltan datos', description: 'Fecha y litros son obligatorios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Descarga.create({
        fecha: form.fecha,
        litrosDescargados: litrosForm,
        kgDescargados: Number(form.kgDescargados) || 0,
        binsUsados: Number(form.binsUsados) || binsNec,
        obs: form.obs || '',
      });

      // Marcar bins como ocupados (kg repartido en proporción a los litros de cada bin)
      const binsParaCrear = Number(form.binsUsados) || binsNec;
      const totalKgDesc = Number(form.kgDescargados) || 0;
      let kgRestante = totalKgDesc;
      for (let i = 0; i < binsParaCrear; i++) {
        const litrosBin = Math.min(settings.capacidadBinL, litrosForm - i * settings.capacidadBinL);
        const kgBin = i === binsParaCrear - 1 ? kgRestante : Math.round(totalKgDesc * litrosBin / litrosForm);
        kgRestante -= kgBin;
        await base44.entities.Bin.create({
          estado: 'ocupado',
          fecha: form.fecha,
          litros: litrosBin,
          kg: kgBin,
          obs: `Descarga ${form.fecha}`,
        });
      }

      toast({ title: 'Descarga registrada', description: `${litrosForm}L · ${binsParaCrear} bins` });
      setForm({ fecha: new Date().toISOString().slice(0, 10), litrosDescargados: '', kgDescargados: '', binsUsados: '', obs: '' });
      load();
      syncSheetsSilently();
      if (user?.role === 'user') navigate('/acopio');
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Descarga</h1>
        <p className="text-sm text-gray-500">Registrar descarga del BioComp a bins</p>
      </div>

      {/* Masa real disponible */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-emerald-100 text-sm">Masa real disponible para descargar</p>
        <div className="flex items-baseline gap-4 mt-1">
          <span className="text-3xl font-bold">{Math.round(masaReal.litros)}<span className="text-lg text-emerald-200 ml-1">L</span></span>
          <span className="text-xl font-semibold">{Math.round(masaReal.kg)}<span className="text-sm text-emerald-200 ml-1">kg</span></span>
        </div>
        <button onClick={usarMasaReal} className="mt-3 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors">
          Usar masa real como cantidad a descargar
        </button>
      </div>

      {/* Formulario */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm">Nueva descarga</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-400">Fecha</label>
            <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Litros descargados</label>
            <input type="number" value={form.litrosDescargados} onChange={e => setForm({ ...form, litrosDescargados: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Kg descargados</label>
            <input type="number" value={form.kgDescargados} onChange={e => setForm({ ...form, kgDescargados: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Bins usados</label>
            <input type="number" value={form.binsUsados} onChange={e => setForm({ ...form, binsUsados: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder={binsNec} />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400">Observaciones</label>
          <input type="text" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
        </div>

        {/* Info de bins */}
        <div className="flex items-center gap-2 text-sm">
          <Boxes className="w-4 h-4 text-amber-500" />
          <span className="text-gray-600">
            Bins necesarios: <span className="font-semibold">{binsNec}</span> · Libres: <span className="font-semibold">{binsLibres}</span> · Capacidad: {settings.capacidadBinL}L c/u
          </span>
        </div>
        {faltanBins && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
            <AlertTriangle className="w-4 h-4" />
            Faltan {binsNec - binsLibres} bins libres (hay {binsLibres}, se necesitan {binsNec}) — no bloquea la operación
          </div>
        )}

        <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Registrar descarga</>}
        </button>
      </div>

      {/* Historial de descargas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Descargas registradas</h3>
        </div>
        {descargas.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Sin descargas registradas</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {descargas.map(d => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{d.fecha}</p>
                  <p className="text-xs text-gray-400">{d.litrosDescargados}L · {d.kgDescargados}kg · {d.binsUsados} bins</p>
                  {d.obs && <p className="text-xs text-gray-400 italic">"{d.obs}"</p>}
                </div>
                <Trash2 className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
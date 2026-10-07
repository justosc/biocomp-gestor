import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/use-toast';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { syncSheetsSilently } from '@/lib/syncSheets';

export default function Inspeccion() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [inspecciones, setInspecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const showForm = searchParams.get('form') === 'new';
  const setShowForm = (v) => { if (v) navigate('?form=new'); else navigate(-1); };
  const [form, setForm] = useState({
    fecha: new Date().toISOString().slice(0, 10),
    temperatura: '',
    humedad: '',
    olor: '',
    textura: '',
    color: '',
    responsable: '',
    observaciones: '',
  });
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showForm]);

  async function load() {
    setLoading(true);
    const list = await base44.entities.Inspeccion.list('-fecha', 100);
    setInspecciones(list);
    setLoading(false);
  }

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const ultima = inspecciones[0];

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Inspeccion.create({
        fecha: form.fecha,
        temperatura: Number(form.temperatura) || 0,
        humedad: Number(form.humedad) || 0,
        olor: form.olor,
        textura: form.textura,
        color: form.color,
        responsable: form.responsable,
        observaciones: form.observaciones,
      });
      toast({ title: 'Inspección guardada' });
      setForm({ fecha: new Date().toISOString().slice(0, 10), temperatura: '', humedad: '', olor: '', textura: '', color: '', responsable: '', observaciones: '' });
      setShowForm(false);
      syncSheetsSilently();
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.Inspeccion.delete(id);
    load();
  };

  const humedadColor = (h) => {
    if (h < settings.humedadIdealMinPercent) return 'amber';
    if (h > settings.humedadIdealPercent) return 'red';
    return 'emerald';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inspección</h1>
          <p className="text-sm text-gray-500">Humedad, olor, textura y color</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nueva inspección
        </button>
      </div>

      {/* Última inspección */}
      {ultima && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Droplets className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Última inspección — {ultima.fecha}</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">Temperatura</p>
              <p className="text-lg font-bold text-gray-900">{ultima.temperatura}°C</p>
            </div>
            <div className={`rounded-lg p-2 ${humedadColor(ultima.humedad) === 'emerald' ? 'bg-emerald-50' : humedadColor(ultima.humedad) === 'red' ? 'bg-red-50' : 'bg-amber-50'}`}>
              <p className={`text-xs ${humedadColor(ultima.humedad) === 'emerald' ? 'text-emerald-600' : humedadColor(ultima.humedad) === 'red' ? 'text-red-600' : 'text-amber-600'}`}>Humedad</p>
              <p className="text-lg font-bold text-gray-900">{ultima.humedad}%</p>
              <p className="text-xs text-gray-400">Ideal: {settings.humedadIdealMinPercent}-{settings.humedadIdealPercent}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">Olor</p>
              <p className="text-sm font-semibold text-gray-700">{ultima.olor || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <p className="text-xs text-gray-400">Textura</p>
              <p className="text-sm font-semibold text-gray-700">{ultima.textura || '—'}</p>
            </div>
          </div>
          {ultima.observaciones && <p className="text-sm text-gray-500 mt-2 italic">"{ultima.observaciones}"</p>}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div ref={formRef} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Nueva inspección</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Temperatura (°C)</label>
              <input type="number" value={form.temperatura} onChange={e => setForm({ ...form, temperatura: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Humedad (%)</label>
              <input type="number" value={form.humedad} onChange={e => setForm({ ...form, humedad: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Olor</label>
              <input type="text" value={form.olor} onChange={e => setForm({ ...form, olor: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Ej: tierra húmeda" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Textura</label>
              <input type="text" value={form.textura} onChange={e => setForm({ ...form, textura: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Ej: esponjosa" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Color</label>
              <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Ej: marrón oscuro" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Responsable</label>
              <input type="text" value={form.responsable} onChange={e => setForm({ ...form, responsable: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="text-xs text-gray-400">Observaciones</label>
              <input type="text" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2.5 rounded-lg bg-gray-100 text-gray-600 font-medium text-sm hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Historial de inspecciones</h3>
        </div>
        {inspecciones.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Sin inspecciones registradas</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {inspecciones.map(i => (
              <div key={i.id} className="flex items-start justify-between px-4 py-3 hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{i.fecha}</span>
                    <span className="text-xs text-gray-400">{i.responsable}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{i.temperatura}°C</span>
                    <span className={humedadColor(i.humedad) === 'emerald' ? 'text-emerald-600' : humedadColor(i.humedad) === 'red' ? 'text-red-600' : 'text-amber-600'}>{i.humedad}%</span>
                    <span>{i.olor}</span>
                    <span>{i.textura}</span>
                    <span>{i.color}</span>
                  </div>
                  {i.observaciones && <p className="text-xs text-gray-400 italic mt-1">"{i.observaciones}"</p>}
                </div>
                <button onClick={() => handleDelete(i.id)} className="text-gray-300 hover:text-red-500 p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
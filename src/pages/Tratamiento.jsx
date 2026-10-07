import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/use-toast';
import { Thermometer, Plus, AlertTriangle } from 'lucide-react';
import SheetSelect from '@/components/SheetSelect';
import TempHistoryAccordion, { sortTratamientos } from '@/components/TempHistoryAccordion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { syncSheetsSilently } from '@/lib/syncSheets';

// Auto-detecta el momento del día según la hora actual para evitar cargar
// lecturas con el momento equivocado (ej. guardar "noche" como "mañana").
function momentoActual() {
  const h = new Date().getHours();
  if (h < 11) return 'mañana';
  if (h < 17) return 'mediodia';
  return 'noche';
}

function formInicial() {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    momento: momentoActual(),
    tempEntrada: '',
    tempSalida: '',
    cicloEstado: 'en_ciclo',
    obs: '',
  };
}

export default function Tratamiento() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [lecturas, setLecturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const showForm = searchParams.get('form') === 'new';
  const setShowForm = (v) => { if (v) navigate('?form=new'); else navigate(-1); };
  const [form, setForm] = useState(formInicial());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const list = await base44.entities.Tratamiento.list('-fecha', 200);
    setLecturas(sortTratamientos(list));
    setLoading(false);
  }

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const ultima = lecturas[0];
  const tempRealUltima = ultima ? (ultima.tempEntrada || 0) + (settings.tableroOffsetC || 0) : null;

  const handleSave = () => {
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      _pending: true,
      fecha: form.fecha,
      momento: form.momento,
      tempEntrada: Number(form.tempEntrada) || 0,
      tempSalida: Number(form.tempSalida) || 0,
      cicloEstado: form.cicloEstado,
      obs: form.obs || '',
    };
    // UI optimista: agregar a la lista al instante
    setLecturas(prev => sortTratamientos([optimistic, ...prev]));
    setForm(formInicial());
    setShowForm(false);

    (async () => {
      try {
        const saved = await base44.entities.Tratamiento.create({
          fecha: optimistic.fecha,
          momento: optimistic.momento,
          tempEntrada: optimistic.tempEntrada,
          tempSalida: optimistic.tempSalida,
          cicloEstado: optimistic.cicloEstado,
          obs: optimistic.obs,
        });
        setLecturas(prev => sortTratamientos(prev.map(x => x.id === tempId ? saved : x)));
        syncSheetsSilently();
        toast({ title: 'Lectura guardada' });
      } catch (e) {
        setLecturas(prev => prev.filter(x => x.id !== tempId));
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    })();
  };

  const handleDelete = async (id) => {
    await base44.entities.Tratamiento.delete(id);
    load();
  };

  const tempColor = (temp) => {
    if (temp === null) return 'gray';
    if (temp < settings.tempIdealMinC) return 'amber';
    if (temp > settings.tempIdealMaxC + 10) return 'red';
    return 'emerald';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tratamiento</h1>
          <p className="text-sm text-gray-500">Lecturas de temperatura PT100</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nueva lectura
        </button>
      </div>

      {/* Última lectura destacada */}
      {ultima && (
        <div className={`rounded-xl p-4 border ${
          ultima.cicloEstado === 'parado' ? 'bg-red-50 border-red-200' :
          tempColor(tempRealUltima) === 'emerald' ? 'bg-emerald-50 border-emerald-200' :
          'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className={`w-5 h-5 ${tempColor(tempRealUltima) === 'emerald' ? 'text-emerald-600' : 'text-amber-600'}`} />
            <span className="font-semibold text-gray-900 text-sm">Última lectura — {ultima.fecha} · {ultima.momento}</span>
          </div>
          {ultima.cicloEstado === 'parado' && (
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
              <AlertTriangle className="w-4 h-4" /> Equipo parado
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Tablero entrada</p>
              <p className="text-lg font-bold text-gray-900">{ultima.tempEntrada}°C</p>
              <p className="text-xs text-gray-400">Real: {tempRealUltima}°C</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Tablero salida</p>
              <p className="text-lg font-bold text-gray-900">{ultima.tempSalida}°C</p>
              <p className="text-xs text-gray-400">Real: {(ultima.tempSalida || 0) + (settings.tableroOffsetC || 0)}°C</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Rango ideal</p>
              <p className="text-sm font-bold text-gray-700">{settings.tempIdealMinC}-{settings.tempIdealMaxC}°C</p>
              <p className="text-xs text-gray-400">Manual: 45-65°C</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Nueva lectura de temperatura</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-400">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Momento <span className="text-emerald-500 font-medium">(auto: según hora)</span></label>
              <SheetSelect
                value={form.momento}
                onChange={(val) => setForm({ ...form, momento: val })}
                label="Momento del día"
                options={[
                  { value: 'mañana', label: 'Mañana' },
                  { value: 'mediodia', label: 'Mediodía' },
                  { value: 'noche', label: 'Noche' },
                ]}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Estado del ciclo</label>
              <SheetSelect
                value={form.cicloEstado}
                onChange={(val) => setForm({ ...form, cicloEstado: val })}
                label="Estado del ciclo"
                options={[
                  { value: 'en_ciclo', label: 'En ciclo' },
                  { value: 'parado', label: 'Parado' },
                ]}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Temp. entrada (tablero)</label>
              <input type="number" value={form.tempEntrada} onChange={e => setForm({ ...form, tempEntrada: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Temp. salida (tablero)</label>
              <input type="number" value={form.tempSalida} onChange={e => setForm({ ...form, tempSalida: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Observaciones</label>
              <input type="text" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="" />
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

      {/* Historial de lecturas — agrupado por fecha y momento */}
      <TempHistoryAccordion lecturas={lecturas} settings={settings} onDelete={handleDelete} />
    </div>
  );
}
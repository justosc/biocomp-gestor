import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { generarCodigoCarga, calcularTotalesRecepcion } from '@/lib/biocomp';
import TachoMeter from '@/components/TachoMeter';
import { Plus, Trash2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { syncSheetsSilently } from '@/lib/syncSheets';

function TachoRow({ tacho, onChange, onRemove, color, maxLitros }) {
  const [local, setLocal] = useState({
    litros: tacho.litros || '',
    pesoBrutoKg: tacho.pesoBrutoKg || '',
    taraKg: tacho.taraKg || 12,
    tipo: tacho.tipo || '',
  });

  useEffect(() => {
    setLocal({
      litros: tacho.litros ?? '',
      pesoBrutoKg: tacho.pesoBrutoKg ?? '',
      taraKg: tacho.taraKg ?? 12,
      tipo: tacho.tipo ?? '',
    });
  }, [tacho._sync]);

  const update = (field, val) => {
    const next = { ...local, [field]: val };
    setLocal(next);
    onChange({ ...next, litros: Number(next.litros) || 0, pesoBrutoKg: Number(next.pesoBrutoKg) || 0, taraKg: Number(next.taraKg) || 12 });
  };

  const kgNeto = Math.max(0, (Number(local.pesoBrutoKg) || 0) - (Number(local.taraKg) || 0));
  const densidad = Number(local.litros) > 0 ? ((kgNeto / Number(local.litros)) * 1000).toFixed(0) : 0;

  return (
    <div className="flex flex-col gap-3 py-4 border-b border-gray-100 last:border-0 md:flex-row md:items-start md:gap-3">
      <div className="flex gap-3">
        <TachoMeter
          litros={Number(local.litros) || 0}
          maxLitros={maxLitros}
          color={color}
          onChange={(l) => update('litros', l)}
        />
        <div className="flex-1 md:hidden">
          <label className="text-xs text-gray-400">Litros</label>
          <input
            type="number"
            value={local.litros}
            onChange={e => update('litros', e.target.value)}
            className="w-full px-3 py-3 rounded-lg border border-gray-200 text-base focus:outline-none focus:border-emerald-400"
            placeholder="0"
          />
        </div>
      </div>
      <div className="flex-1">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div className="hidden md:block">
            <label className="text-xs text-gray-400">Litros</label>
            <input
              type="number"
              value={local.litros}
              onChange={e => update('litros', e.target.value)}
              className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Peso bruto (kg)</label>
            <input
              type="number"
              value={local.pesoBrutoKg}
              onChange={e => update('pesoBrutoKg', e.target.value)}
              className="w-full px-3 py-3 md:px-2 md:py-1.5 rounded-lg border border-gray-200 text-base md:text-sm focus:outline-none focus:border-emerald-400"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Tara (kg)</label>
            <input
              type="number"
              value={local.taraKg}
              onChange={e => update('taraKg', e.target.value)}
              className="w-full px-3 py-3 md:px-2 md:py-1.5 rounded-lg border border-gray-200 text-base md:text-sm focus:outline-none focus:border-emerald-400"
              placeholder="12"
            />
          </div>
        </div>
        <div className="mt-2">
          <label className="text-xs text-gray-400">Tipo de orgánico</label>
          <input
            type="text"
            value={local.tipo}
            onChange={e => update('tipo', e.target.value)}
            className="w-full px-3 py-2 md:px-2 md:py-1.5 rounded-lg border border-gray-200 text-base md:text-sm focus:outline-none focus:border-emerald-400"
            placeholder="Ej: banana, hojas, zapallo"
          />
        </div>
      </div>
      <div className="flex items-center justify-between md:block md:text-right md:shrink-0">
        <div>
          <p className="text-xs text-gray-400">Neto</p>
          <p className="text-sm font-semibold text-gray-700">{kgNeto.toFixed(1)}kg</p>
          <p className="text-xs text-gray-400">{densidad} g/L</p>
        </div>
        <button onClick={onRemove} className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Recepcion() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cargas, setCargas] = useState([]);
  const [fechaRealInicio, setFechaRealInicio] = useState(new Date().toISOString().slice(0, 10));
  const [horaRealInicio, setHoraRealInicio] = useState(new Date().toTimeString().slice(0, 5));
  const [tachosLiviano, setTachosLiviano] = useState([{ litros: '', pesoBrutoKg: '', taraKg: 12 }]);
  const [tachosDenso, setTachosDenso] = useState([]);
  const [critico, setCritico] = useState({ litros: '', kg: '', tipo: '', obs: '' });
  const [descarte, setDescarte] = useState({ litros: '', kg: '', motivo: '' });
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    base44.entities.Carga.list('-created_date', 500).then(setCargas);
  }, []);

  const maxL = settings?.capacidadTachoL || 220;
  const tara = settings?.taraTacho220Kg || 12;

  const totales = calcularTotalesRecepcion(tachosLiviano, tachosDenso, tara);

  const updateTacho = (list, setList, idx, val) => {
    const next = [...list];
    next[idx] = val;
    setList(next);
  };

  const addTacho = (list, setList) => {
    setList([...list, { litros: '', pesoBrutoKg: '', taraKg: tara }]);
  };

  const removeTacho = (list, setList, idx) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!fechaRealInicio) {
      toast({ title: 'Falta la fecha de recepción', variant: 'destructive' });
      return;
    }
    const codigo = generarCodigoCarga(cargas);
    const fechaRegistro = new Date().toISOString().slice(0, 10);

    const recepcionPayload = {
      tachosLiviano: tachosLiviano.map(t => ({ litros: Number(t.litros) || 0, pesoBrutoKg: Number(t.pesoBrutoKg) || 0, taraKg: Number(t.taraKg) || tara, tipo: t.tipo || '' })),
      tachosDenso: tachosDenso.map(t => ({ litros: Number(t.litros) || 0, pesoBrutoKg: Number(t.pesoBrutoKg) || 0, taraKg: Number(t.taraKg) || tara, tipo: t.tipo || '' })),
      criticoTipo: critico.tipo || '',
      criticoLitros: Number(critico.litros) || 0,
      criticoKg: Number(critico.kg) || 0,
      criticoObs: critico.obs || '',
      descarteLitros: Number(descarte.litros) || 0,
      descarteKg: Number(descarte.kg) || 0,
      descarteMotivo: descarte.motivo || '',
      ...totales,
    };

    setSaving(true);
    toast({ title: `Guardando ${codigo}…` });
    setTachosLiviano([{ litros: '', pesoBrutoKg: '', taraKg: tara }]);
    setTachosDenso([]);
    setCritico({ litros: '', kg: '', tipo: '', obs: '' });
    setDescarte({ litros: '', kg: '', motivo: '' });
    setFechaRealInicio(new Date().toISOString().slice(0, 10));
    setHoraRealInicio(new Date().toTimeString().slice(0, 5));
    setFormKey(k => k + 1);

    (async () => {
      try {
        const carga = await base44.entities.Carga.create({
          codigo, estado: 'recepcion', fechaRealInicio, horaRealInicio, fechaRegistro,
        });
        await base44.entities.Recepcion.create({ cargaId: carga.id, ...recepcionPayload });
        setCargas(prev => [...prev, carga]);
        syncSheetsSilently();
        toast({ title: `Recepción ${codigo} creada` });
        navigate(`/acondicionamiento?cargaId=${carga.id}`);
      } catch (e) {
        toast({ title: 'Error al guardar', description: e.message, variant: 'destructive' });
      } finally {
        setSaving(false);
      }
    })();
  };

  if (!settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recepción</h1>
        <p className="text-sm text-gray-500">Alta de una nueva carga</p>
      </div>

      {/* Fecha y hora */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Fecha real de recepción</label>
            <input
              type="date"
              value={fechaRealInicio}
              onChange={e => setFechaRealInicio(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Hora de recepción</label>
            <input
              type="time"
              value={horaRealInicio}
              onChange={e => setHoraRealInicio(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Se puede elegir una fecha/hora pasada. La fecha de registro ({new Date().toISOString().slice(0, 10)}) queda fija al guardar.</p>
      </div>

      {/* Liviano */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" /> Material liviano
          </h3>
          <button onClick={() => addTacho(tachosLiviano, setTachosLiviano)} className="flex items-center gap-1 text-sm text-emerald-600 font-medium hover:underline">
            <Plus className="w-4 h-4" /> Tacho
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-2">Banana, hojas (lechuga, puerro, acelga, plantas), zapallo — orgánicos livianos.</p>
        <div>
          {tachosLiviano.map((t, idx) => (
            <TachoRow
              key={`${formKey}-l-${idx}`}
              tacho={t}
              color="#10b981"
              maxLitros={maxL}
              onChange={val => updateTacho(tachosLiviano, setTachosLiviano, idx, val)}
              onRemove={() => removeTacho(tachosLiviano, setTachosLiviano, idx)}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500">Subtotal liviano</span>
          <span className="font-semibold text-gray-700">{totales.subtotalLivianoL}L · {totales.subtotalLivianoKg}kg</span>
        </div>
      </div>

      {/* Denso */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" /> Material denso
          </h3>
          <button onClick={() => addTacho(tachosDenso, setTachosDenso)} className="flex items-center gap-1 text-sm text-amber-600 font-medium hover:underline">
            <Plus className="w-4 h-4" /> Tacho
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-2">Cárnicos, cítricos, palta, ajo — aportan proteína / les cuesta biodegradarse.</p>
        <div>
          {tachosDenso.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 text-center">Sin tachos densos</p>
          ) : (
            tachosDenso.map((t, idx) => (
              <TachoRow
                key={`${formKey}-d-${idx}`}
                tacho={t}
                color="#f59e0b"
                maxLitros={maxL}
                onChange={val => updateTacho(tachosDenso, setTachosDenso, idx, val)}
                onRemove={() => removeTacho(tachosDenso, setTachosDenso, idx)}
              />
            ))
          )}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-gray-500">Subtotal denso</span>
          <span className="font-semibold text-gray-700">{totales.subtotalDensoL}L · {totales.subtotalDensoKg}kg</span>
        </div>
      </div>

      {/* Crítico y Descarte */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500" /> Crítico (se descarta)
          </h3>
          <p className="text-xs text-gray-400 mb-3">Papa, cebolla — no entran al BioComp.</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Litros</label>
              <input type="number" value={critico.litros} onChange={e => setCritico({ ...critico, litros: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Kg</label>
              <input type="number" value={critico.kg} onChange={e => setCritico({ ...critico, kg: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
          </div>
          <input type="text" value={critico.tipo} onChange={e => setCritico({ ...critico, tipo: e.target.value })}
            className="w-full mt-2 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Tipo (ej: papa, cebolla)" />
          <input type="text" value={critico.obs} onChange={e => setCritico({ ...critico, obs: e.target.value })}
            className="w-full mt-2 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Observaciones" />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">Descarte (no entra)</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Litros</label>
              <input type="number" value={descarte.litros} onChange={e => setDescarte({ ...descarte, litros: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Kg</label>
              <input type="number" value={descarte.kg} onChange={e => setDescarte({ ...descarte, kg: e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
            </div>
          </div>
          <input type="text" value={descarte.motivo} onChange={e => setDescarte({ ...descarte, motivo: e.target.value })}
            className="w-full mt-2 px-2 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Motivo" />
        </div>
      </div>

      {/* Totales */}
      <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-emerald-700 text-xs">Total orgánico</p><p className="font-bold text-emerald-900 text-lg">{totales.totalOrganicoL}L</p><p className="text-emerald-700 text-xs">{totales.totalOrganicoKg}kg</p></div>
          <div><p className="text-emerald-700 text-xs">Densidad org.</p><p className="font-bold text-emerald-900 text-lg">{totales.densidadOrganica}</p><p className="text-emerald-700 text-xs">g/L</p></div>
          <div><p className="text-rose-500 text-xs">Crítico (descartado)</p><p className="font-bold text-rose-600 text-lg">{Number(critico.litros) || 0}L</p><p className="text-rose-400 text-xs">{Number(critico.kg) || 0}kg</p></div>
          <div><p className="text-gray-400 text-xs">Descarte</p><p className="font-bold text-gray-500 text-lg">{Number(descarte.litros) || 0}L</p><p className="text-gray-400 text-xs">{Number(descarte.kg) || 0}kg</p></div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
        Guardar recepción
      </button>
    </div>
  );
}
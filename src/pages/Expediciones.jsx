import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import SheetSelect from '@/components/SheetSelect';
import { syncSheetsSilently } from '@/lib/syncSheets';
import { Truck, PackageCheck, Send, CheckCircle2, Clock, RefreshCw, AlertTriangle, MapPin } from 'lucide-react';

function nextCodigo(exps) {
  let max = 0;
  for (const e of exps) {
    const m = /E-(\d+)/.exec(e.codigo || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `E-${String(max + 1).padStart(4, '0')}`;
}

const ESTADO_STYLE = {
  pendiente: { label: 'Pendiente', cls: 'bg-gray-100 text-gray-600', Icon: Clock },
  enviado: { label: 'Enviado', cls: 'bg-blue-50 text-blue-700', Icon: Send },
  recibido: { label: 'Recibido', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
};

export default function Expediciones() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [descargas, setDescargas] = useState([]);
  const [expediciones, setExpediciones] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reenviando, setReenviando] = useState(null);

  const [form, setForm] = useState({
    descargaId: '',
    binsRetirados: '',
    litros: '',
    kg: '',
    transportista: '',
    fechaRetiro: new Date().toISOString().slice(0, 10),
    fechaEstimadaIngreso: '',
    destino: '',
    obs: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [d, e, b] = await Promise.all([
        base44.entities.Descarga.list('-created_date', 500),
        base44.entities.Expedicion.list('-created_date', 500),
        base44.entities.Bin.list('-created_date', 50),
      ]);
      setDescargas(d); setExpediciones(e); setBins(b);
    } catch (err) {
      console.error('Expediciones load error', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const descargasExpedicionadas = useMemo(
    () => new Set(expediciones.map(e => e.descargaId).filter(Boolean)),
    [expediciones]
  );

  const descargasDisponibles = useMemo(
    () => descargas.filter(d => !descargasExpedicionadas.has(d.id)),
    [descargas, descargasExpedicionadas]
  );

  const descargaSel = descargas.find(d => d.id === form.descargaId);

  const seleccionarDescarga = (id) => {
    const d = descargas.find(x => x.id === id);
    setForm(f => ({
      ...f,
      descargaId: id,
      litros: d?.litrosDescargados ?? '',
      kg: d?.kgDescargados ?? '',
      binsRetirados: d?.binsUsados ?? '',
    }));
  };

  const binsOcupados = bins.filter(b => b.estado === 'ocupado').length;

  if (loading || !settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const handleSave = async () => {
    if (!form.fechaRetiro || Number(form.litros) <= 0) {
      toast({ title: 'Faltan datos', description: 'Fecha de retiro y litros son obligatorios', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const codigo = nextCodigo(expediciones);
      const creada = await base44.entities.Expedicion.create({
        codigo,
        descargaId: form.descargaId || '',
        binsRetirados: Number(form.binsRetirados) || 0,
        litros: Number(form.litros) || 0,
        kg: Number(form.kg) || 0,
        transportista: form.transportista || '',
        fechaRetiro: form.fechaRetiro,
        fechaEstimadaIngreso: form.fechaEstimadaIngreso || '',
        destino: form.destino || '',
        obs: form.obs || '',
        estado: 'pendiente',
        notificado: false,
      });

      // Marcar los bins retirados como vacíos (ya fueron retirados por el transporte)
      if (form.descargaId) {
        const ocupados = bins.filter(b => b.estado === 'ocupado');
        for (const b of ocupados.slice(0, Number(form.binsRetirados) || ocupados.length)) {
          await base44.entities.Bin.update(b.id, { estado: 'vacio', obs: `Retirado en expedición ${codigo} (${form.transportista || 'transportista'})` });
        }
      }

      // Notificar a la app de maduración (push)
      let notificado = false;
      try {
        const res = await base44.functions.invoke('notificarExpedicion', { expedicionId: creada.id });
        notificado = res.data?.notificado === true;
      } catch (e) {
        // la notificación falla pero la expedición quedó registrada
      }

      toast({
        title: `Expedición ${codigo} registrada`,
        description: notificado ? 'Notificación enviada a la app de maduración' : 'Registrada — la notificación a maduración se puede reenviar',
      });

      setForm({
        descargaId: '', binsRetirados: '', litros: '', kg: '', transportista: '',
        fechaRetiro: new Date().toISOString().slice(0, 10), fechaEstimadaIngreso: '', destino: '', obs: '',
      });
      await load();
      syncSheetsSilently();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const reenviar = async (exp) => {
    setReenviando(exp.id);
    try {
      const res = await base44.functions.invoke('notificarExpedicion', { expedicionId: exp.id });
      if (res.data?.notificado) {
        toast({ title: `Notificación reenviada (${exp.codigo})`, description: 'La app de maduración fue avisada' });
        await load();
      } else {
        toast({ title: 'No se pudo notificar', description: res.data?.detalle?.error || res.data?.reason || 'Revisá la URL de la app de maduración en Secrets', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error al reenviar', description: e.message, variant: 'destructive' });
    }
    setReenviando(null);
  };

  const marcarRecibido = async (exp) => {
    try {
      await base44.entities.Expedicion.update(exp.id, { estado: 'recibido' });
      toast({ title: `${exp.codigo} marcada como recibida` });
      load();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const pendientes = expediciones.filter(e => e.estado !== 'recibido');
  const recibidas = expediciones.filter(e => e.estado === 'recibido');

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expedición a maduración</h1>
        <p className="text-sm text-gray-500">Registrar retiro del transporte y avisar a la planta de maduración</p>
      </div>

      {/* Acopio disponible */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-emerald-100" />
          <p className="text-emerald-100 text-sm font-medium">Listo para expedir</p>
        </div>
        <div className="flex items-end gap-4 mt-2">
          <div>
            <span className="text-3xl font-bold">{binsOcupados}</span>
            <span className="text-base text-emerald-200 ml-1">bins ocupados</span>
          </div>
          <div className="text-sm text-emerald-100">
            {descargasDisponibles.length} descargas sin expedir
          </div>
        </div>
      </div>

      {/* Formulario nueva expedición */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-600" /> Nueva expedición
        </h3>

        {descargasDisponibles.length > 0 && (
          <div>
            <label className="text-xs text-gray-400 block mb-1">Descarga origen (extrae bins, litros y kg)</label>
            <SheetSelect
              value={form.descargaId}
              onChange={seleccionarDescarga}
              placeholder="Seleccionar descarga..."
              label="Descarga origen"
              options={descargasDisponibles.map(d => ({ value: d.id, label: `${d.fecha} · ${d.litrosDescargados}L · ${d.binsUsados} bins` }))}
            />
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-400">Bins retirados</label>
            <input type="number" value={form.binsRetirados} onChange={e => setForm({ ...form, binsRetirados: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Litros</label>
            <input type="number" value={form.litros} onChange={e => setForm({ ...form, litros: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Kg</label>
            <input type="number" value={form.kg} onChange={e => setForm({ ...form, kg: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="0" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Transportista</label>
            <input type="text" value={form.transportista} onChange={e => setForm({ ...form, transportista: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Nombre / patente" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Fecha de retiro</label>
            <input type="date" value={form.fechaRetiro} onChange={e => setForm({ ...form, fechaRetiro: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div>
            <label className="text-xs text-gray-400">Ingreso estimado en maduración</label>
            <input type="date" value={form.fechaEstimadaIngreso} onChange={e => setForm({ ...form, fechaEstimadaIngreso: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-400">Destino (planta de maduración)</label>
            <input type="text" value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" placeholder="Ej: Planta Maduración VL" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Observaciones</label>
          <input type="text" value={form.obs} onChange={e => setForm({ ...form, obs: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
        </div>

        {descargasDisponibles.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs">
            <AlertTriangle className="w-4 h-4" />
            No hay descargas sin expedir. Podés registrar la expedición igual cargando los datos a mano.
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <><Truck className="w-4 h-4" /> Registrar expedición y avisar a maduración</>}
        </button>
      </div>

      {/* Pendientes / enviadas */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Expediciones en curso</h3>
          <span className="text-xs text-gray-400">{pendientes.length}</span>
        </div>
        {pendientes.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">Sin expediciones en curso</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {pendientes.map(e => {
              const st = ESTADO_STYLE[e.estado] || ESTADO_STYLE.pendiente;
              const StIcon = st.Icon;
              return (
                <div key={e.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-sm">{e.codigo}</span>
                        <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          <StIcon className="w-3 h-3" /> {st.label}
                        </span>
                        {e.notificado && <span className="text-[11px] text-emerald-600 font-medium">avisado</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Retiro {e.fechaRetiro} · {e.binsRetirados} bins · {e.litros}L · {e.kg}kg
                      </p>
                      <p className="text-xs text-gray-400">
                        Transportista: {e.transportista || '—'} {e.destino ? `· ${e.destino}` : ''}
                        {e.fechaEstimadaIngreso ? ` · ingresa ${e.fechaEstimadaIngreso}` : ''}
                      </p>
                      {e.obs && <p className="text-xs text-gray-400 italic">"{e.obs}"</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => reenviar(e)} disabled={reenviando === e.id}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 disabled:opacity-50">
                        {reenviando === e.id ? <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Reenviar aviso
                      </button>
                      {isAdmin && (
                        <button onClick={() => marcarRecibido(e)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Recibido
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recibidas */}
      {recibidas.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Recibidas en maduración</h3>
            <span className="text-xs text-gray-400">{recibidas.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recibidas.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">{e.codigo} · {e.fechaRetiro}</p>
                  <p className="text-xs text-gray-400">{e.binsRetirados} bins · {e.litros}L · {e.kg}kg · {e.transportista || '—'}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nota de integración */}
      <div className="bg-blue-50 rounded-xl border border-blue-100 p-3 text-xs text-blue-800 flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Integración con la app de maduración</p>
          <p className="mt-0.5">
            La app de maduración consulta el acopio y las expediciones en:
            <code className="bg-blue-100 px-1.5 py-0.5 rounded mx-1">/functions/estadoAcopio</code>
            (header <code className="bg-blue-100 px-1 rounded">X-Api-Token</code>).
            Al registrar una expedición se envía un push a su endpoint
            <code className="bg-blue-100 px-1.5 py-0.5 rounded mx-1">/functions/recibirExpedicion</code>
            para que genere la notificación en su interfaz de admin.
          </p>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { X, Save, Send, ChevronDown, ChevronRight } from 'lucide-react';

const SECTIONS = [
  {
    key: 'Carga',
    label: 'Carga',
    fields: [
      { key: 'codigo', label: 'Código', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'select', options: [
        { value: 'recepcion', label: 'Recepción' },
        { value: 'en_biocomp', label: 'En BioComp' },
        { value: 'descargada', label: 'Descargada' },
      ]},
      { key: 'fechaRealInicio', label: 'Fecha de recepción', type: 'date' },
      { key: 'horaRealInicio', label: 'Hora de recepción', type: 'time' },
      { key: 'fechaRealIngresoBiocomp', label: 'Ingreso al BioComp', type: 'date' },
      { key: 'horaRealIngresoBiocomp', label: 'Hora de ingreso BioComp', type: 'time' },
    ],
  },
  {
    key: 'Recepcion',
    label: 'Recepción',
    fields: [
      { key: 'subtotalLivianoL', label: 'Liviano (L)', type: 'number' },
      { key: 'subtotalLivianoKg', label: 'Liviano (kg)', type: 'number' },
      { key: 'subtotalDensoL', label: 'Denso (L)', type: 'number' },
      { key: 'subtotalDensoKg', label: 'Denso (kg)', type: 'number' },
      { key: 'criticoLitros', label: 'Crítico (L)', type: 'number' },
      { key: 'criticoKg', label: 'Crítico (kg)', type: 'number' },
      { key: 'descarteLitros', label: 'Descarte (L)', type: 'number' },
      { key: 'descarteKg', label: 'Descarte (kg)', type: 'number' },
    ],
  },
  {
    key: 'Acondicionamiento',
    label: 'Acondicionamiento',
    fields: [
      { key: 'virutaNecesariaL', label: 'Viruta necesaria (L)', type: 'number' },
      { key: 'virutaRealL', label: 'Viruta real (L)', type: 'number' },
      { key: 'virutaRealKg', label: 'Viruta real (kg)', type: 'number' },
    ],
  },
];

const num = (v) => (v === '' || v === null || v === undefined) ? 0 : Number(v) || 0;

export default function CargaEditor({ carga, recepcion, acond, onDone, onCancel }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'admin';
  const [values, setValues] = useState(() => {
    const v = {};
    SECTIONS.forEach((s) => {
      const rec = s.key === 'Carga' ? carga : s.key === 'Recepcion' ? recepcion : acond;
      s.fields.forEach((f) => { v[`${s.key}.${f.key}`] = rec?.[f.key] ?? ''; });
    });
    return v;
  });
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState({ Carga: true, Recepcion: !!recepcion, Acondicionamiento: !!acond });

  const set = (k, val) => setValues((p) => ({ ...p, [k]: val }));

  const diff = (sectionKey, record) => {
    const sec = SECTIONS.find((s) => s.key === sectionKey);
    const c = {};
    sec.fields.forEach((f) => {
      const cur = record?.[f.key] ?? '';
      const nv = values[`${sectionKey}.${f.key}`];
      if (String(nv ?? '') !== String(cur ?? '')) {
        c[f.key] = f.type === 'number' ? num(nv) : nv;
      }
    });
    return c;
  };

  const handleSave = async () => {
    const cambiosCarga = diff('Carga', carga);
    let cambiosRecepcion = recepcion ? diff('Recepcion', recepcion) : {};
    let cambiosAcond = acond ? diff('Acondicionamiento', acond) : {};

    // Recalcular totales derivados si cambiaron los subtotales
    if (recepcion && Object.keys(cambiosRecepcion).length) {
      const livL = num(values['Recepcion.subtotalLivianoL']);
      const livKg = num(values['Recepcion.subtotalLivianoKg']);
      const denL = num(values['Recepcion.subtotalDensoL']);
      const denKg = num(values['Recepcion.subtotalDensoKg']);
      cambiosRecepcion.totalOrganicoL = Math.round((livL + denL) * 10) / 10;
      cambiosRecepcion.totalOrganicoKg = Math.round((livKg + denKg) * 10) / 10;
      cambiosRecepcion.densidadOrganica = (livL + denL) > 0
        ? Math.round(((livKg + denKg) / (livL + denL)) * 1000 * 10) / 10
        : 0;
    }
    if (acond && Object.keys(cambiosAcond).length) {
      const orgL = num(values['Recepcion.subtotalLivianoL']) + num(values['Recepcion.subtotalDensoL']);
      const orgKg = num(values['Recepcion.subtotalLivianoKg']) + num(values['Recepcion.subtotalDensoKg']);
      cambiosAcond.totalEntradaL = Math.round((orgL + num(values['Acondicionamiento.virutaRealL'])) * 10) / 10;
      cambiosAcond.totalEntradaKg = Math.round((orgKg + num(values['Acondicionamiento.virutaRealKg'])) * 10) / 10;
    }

    const total = Object.keys(cambiosCarga).length + Object.keys(cambiosRecepcion).length + Object.keys(cambiosAcond).length;
    if (total === 0) {
      toast({ title: 'No hiciste cambios', variant: 'destructive' });
      return;
    }
    if (!isAdmin && !motivo.trim()) {
      toast({ title: 'Indicá el motivo del cambio', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (isAdmin) {
        const ops = [];
        if (Object.keys(cambiosCarga).length) ops.push(base44.entities.Carga.update(carga.id, cambiosCarga));
        if (Object.keys(cambiosRecepcion).length) ops.push(base44.entities.Recepcion.update(recepcion.id, cambiosRecepcion));
        if (Object.keys(cambiosAcond).length) ops.push(base44.entities.Acondicionamiento.update(acond.id, cambiosAcond));
        await Promise.all(ops);
        toast({ title: 'Cambios guardados' });
      } else {
        const nombre = `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email || '';
        const base = { motivo, estado: 'pendiente', solicitadoPorNombre: nombre, solicitadoPorId: user?.id || '' };
        const ops = [];
        if (Object.keys(cambiosCarga).length) ops.push(base44.entities.SolicitudEdicion.create({ ...base, entityType: 'Carga', targetId: carga.id, targetLabel: carga.codigo, cambios: JSON.stringify(cambiosCarga) }));
        if (Object.keys(cambiosRecepcion).length) ops.push(base44.entities.SolicitudEdicion.create({ ...base, entityType: 'Recepcion', targetId: recepcion.id, targetLabel: `${carga.codigo} (recepción)`, cambios: JSON.stringify(cambiosRecepcion) }));
        if (Object.keys(cambiosAcond).length) ops.push(base44.entities.SolicitudEdicion.create({ ...base, entityType: 'Acondicionamiento', targetId: acond.id, targetLabel: `${carga.codigo} (acond.)`, cambios: JSON.stringify(cambiosAcond) }));
        await Promise.all(ops);
        toast({ title: 'Solicitud enviada', description: 'El admin la revisará' });
      }
      onDone();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const renderSection = (s) => {
    const rec = s.key === 'Carga' ? carga : s.key === 'Recepcion' ? recepcion : acond;
    if (!rec && s.key !== 'Carga') return null;
    const isOpen = open[s.key];
    return (
      <div key={s.key} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setOpen((p) => ({ ...p, [s.key]: !p[s.key] }))}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <span className="font-semibold text-gray-900 text-sm">{s.label}</span>
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </button>
        {isOpen && (
          <div className="px-4 pb-4 grid grid-cols-2 gap-3">
            {s.fields.map((f) => (
              <div key={f.key} className={f.type === 'text' ? 'col-span-2' : ''}>
                <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    value={values[`${s.key}.${f.key}`]}
                    onChange={(e) => set(`${s.key}.${f.key}`, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                  >
                    {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === 'number' ? 'number' : f.type}
                    value={values[`${s.key}.${f.key}`]}
                    onChange={(e) => set(`${s.key}.${f.key}`, e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-card">
        <div>
          <h2 className="font-bold text-gray-900">Editar {carga.codigo}</h2>
          <p className="text-xs text-gray-500">
            {isAdmin ? 'Los cambios se guardan directamente' : 'El admin revisará tu solicitud'}
          </p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {SECTIONS.map(renderSection)}

        {!isAdmin && (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <label className="text-xs text-gray-400 block mb-1">Motivo de la edición</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              placeholder="¿Por qué hay que editarlo?"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-card pb-safe">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving
            ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : isAdmin ? <><Save className="w-4 h-4" /> Guardar cambios</> : <><Send className="w-4 h-4" /> Enviar solicitud</>}
        </button>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useCallback } from 'react';
import PullToRefresh from '@/components/PullToRefresh';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ENTITY_FIELDS, recordLabel } from '@/lib/solicitudFields';
import { ClipboardList, Plus, Check, X, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SheetSelect from '@/components/SheetSelect';

export default function Solicitudes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const showForm = searchParams.get('form') === 'new';
  const setShowForm = (v) => { if (v) navigate('?form=new'); else navigate(-1); };

  const load = useCallback(async () => {
    const list = await base44.entities.SolicitudEdicion.list('-created_date', 200);
    const filtered = isAdmin ? list : list.filter((s) => s.solicitadoPorId === user?.id);
    setSolicitudes(filtered);
  }, [isAdmin, user?.id]);

  useEffect(() => {
    load().then(() => setLoading(false));
  }, [load]);

  const resolver = async (s, estado, comentario = '') => {
    try {
      if (estado === 'aprobada') {
        const cambios = JSON.parse(s.cambios || '{}');
        await base44.entities[s.entityType].update(s.targetId, cambios);
      }
      await base44.entities.SolicitudEdicion.update(s.id, {
        estado,
        resueltoPorNombre: `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email || '',
        fechaResolucion: new Date().toISOString().slice(0, 10),
        comentarioAdmin: comentario,
      });
      toast({ title: estado === 'aprobada' ? 'Editado y aprobado' : 'Solicitud rechazada' });
      load();
    } catch (e) {
      toast({ title: 'Error al resolver', description: e.message, variant: 'destructive' });
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente');
  const resueltas = solicitudes.filter((s) => s.estado !== 'pendiente');

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Solicitudes de edición</h1>
            <p className="text-sm text-gray-500">
              {isAdmin ? 'Revisá y aprobá lo que los operarios quieren modificar' : 'Pedí cambios en registros ya cargados'}
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" /> Nueva
            </button>
          )}
        </div>

        {!isAdmin && showForm && <NuevaSolicitudForm onDone={() => { setShowForm(false); load(); }} />}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <Section title="Pendientes" count={pendientes.length} icon={Clock}>
              {pendientes.length === 0 ? (
                <Empty text="Sin solicitudes pendientes" />
              ) : (
                pendientes.map((s) => <SolicitudCard key={s.id} s={s} isAdmin={isAdmin} onResolver={resolver} />)
              )}
            </Section>

            {resueltas.length > 0 && (
              <Section title="Resueltas" count={resueltas.length} icon={ClipboardList}>
                {resueltas.map((s) => <SolicitudCard key={s.id} s={s} isAdmin={isAdmin} />)}
              </Section>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  );
}

function Section({ title, count, icon: Icon, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="font-semibold text-gray-700 text-sm">{title}</h2>
        <span className="text-xs text-gray-400">({count})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="bg-white rounded-xl border border-gray-100 p-6 text-center text-sm text-gray-400 shadow-sm">{text}</div>;
}

function SolicitudCard({ s, isAdmin, onResolver }) {
  const [comentario, setComentario] = useState('');
  let cambios = {};
  try {
    cambios = JSON.parse(s.cambios || '{}');
  } catch {
    cambios = {};
  }
  const fields = ENTITY_FIELDS[s.entityType]?.fields || [];
  const fieldLabel = (k) => fields.find((f) => f.key === k)?.label || k;

  const badge =
    s.estado === 'pendiente'
      ? 'bg-amber-100 text-amber-700'
      : s.estado === 'aprobada'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm text-gray-900">
            {ENTITY_FIELDS[s.entityType]?.label || s.entityType} · {s.targetLabel}
          </span>
          <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${badge}`}>{s.estado}</span>
        </div>
      </div>
      <p className="text-xs text-gray-500">Motivo: {s.motivo}</p>
      <div className="text-xs text-gray-600">
        <span className="text-gray-400">Cambios propuestos:</span>
        <ul className="mt-1 space-y-0.5">
          {Object.entries(cambios).map(([k, v]) => (
            <li key={k}>
              • {fieldLabel(k)}: <span className="font-medium text-gray-900">{String(v)}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-gray-400">Solicitado por {s.solicitadoPorNombre || '—'}</p>

      {s.estado === 'pendiente' && isAdmin && (
        <div className="space-y-2 pt-2 border-t border-gray-50">
          <input
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Comentario (opcional)"
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onResolver(s, 'aprobada', comentario)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              <Check className="w-4 h-4" /> Aprobar y editar
            </button>
            <button
              onClick={() => onResolver(s, 'rechazada', comentario)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100"
            >
              <X className="w-4 h-4" /> Rechazar
            </button>
          </div>
        </div>
      )}

      {s.estado !== 'pendiente' && (
        <div className="text-xs text-gray-400 pt-1 border-t border-gray-50">
          Resuelto por {s.resueltoPorNombre || '—'} · {s.fechaResolucion || ''}
          {s.comentarioAdmin && ` · "${s.comentarioAdmin}"`}
        </div>
      )}
    </div>
  );
}

function NuevaSolicitudForm({ onDone }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entityType, setEntityType] = useState('Tratamiento');
  const [records, setRecords] = useState([]);
  const [cargas, setCargas] = useState([]);
  const [targetId, setTargetId] = useState('');
  const [valores, setValores] = useState({});
  const [motivo, setMotivo] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    base44.entities.Carga.list('-created_date', 200).then(setCargas);
  }, []);

  useEffect(() => {
    setTargetId('');
    setValores({});
    setLoadingRecords(true);
    base44.entities[entityType].list('-created_date', 100).then((list) => {
      setRecords(list);
      setLoadingRecords(false);
    });
  }, [entityType]);

  const target = records.find((r) => r.id === targetId);
  const targetLabel = target ? recordLabel(entityType, target, cargas) : '';

  useEffect(() => {
    if (target) {
      const init = {};
      ENTITY_FIELDS[entityType].fields.forEach((f) => {
        init[f.key] = target[f.key] ?? '';
      });
      setValores(init);
    }
  }, [targetId, target, entityType]);

  const handleSubmit = async () => {
    if (!targetId) {
      toast({ title: 'Seleccioná un registro', variant: 'destructive' });
      return;
    }
    if (!motivo.trim()) {
      toast({ title: 'Indicá el motivo', variant: 'destructive' });
      return;
    }
    const cambios = {};
    ENTITY_FIELDS[entityType].fields.forEach((f) => {
      const cur = target[f.key] ?? '';
      const nv = valores[f.key];
      if (String(nv ?? '') !== String(cur)) {
        cambios[f.key] = f.type === 'number' ? Number(nv) || 0 : nv;
      }
    });
    if (Object.keys(cambios).length === 0) {
      toast({ title: 'No hiciste ningún cambio', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      await base44.entities.SolicitudEdicion.create({
        entityType,
        targetId,
        targetLabel,
        cambios: JSON.stringify(cambios),
        motivo,
        estado: 'pendiente',
        solicitadoPorNombre: `${user?.nombre || ''} ${user?.apellido || ''}`.trim() || user?.email || '',
        solicitadoPorId: user?.id || '',
      });
      toast({ title: 'Solicitud enviada', description: 'El admin la revisará' });
      onDone();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSending(false);
  };

  const fields = ENTITY_FIELDS[entityType].fields;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm">Nueva solicitud de edición</h3>

      <div>
        <label className="text-xs text-gray-400">Tipo de registro</label>
        <SheetSelect
          value={entityType}
          onChange={(val) => setEntityType(val)}
          label="Tipo de registro"
          options={Object.keys(ENTITY_FIELDS).map((k) => ({ value: k, label: ENTITY_FIELDS[k].label }))}
        />
      </div>

      <div>
        <label className="text-xs text-gray-400">Registro a editar</label>
        {loadingRecords ? (
          <p className="text-xs text-gray-400">Cargando…</p>
        ) : records.length === 0 ? (
          <p className="text-xs text-gray-400">No hay registros de este tipo</p>
        ) : (
          <SheetSelect
            value={targetId}
            onChange={(val) => setTargetId(val)}
            label="Registro a editar"
            placeholder="Seleccionar…"
            options={records.map((r) => ({ value: r.id, label: recordLabel(entityType, r, cargas) }))}
          />
        )}
      </div>

      {target &&
        fields.map((f) => (
          <div key={f.key}>
            <label className="text-xs text-gray-400">{f.label}</label>
            {f.type === 'select' ? (
              <SheetSelect
                value={valores[f.key]}
                onChange={(val) => setValores({ ...valores, [f.key]: val })}
                label={f.label}
                options={f.options}
              />
            ) : (
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                value={valores[f.key]}
                onChange={(e) => setValores({ ...valores, [f.key]: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              />
            )}
          </div>
        ))}

      <div>
        <label className="text-xs text-gray-400">Motivo</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
          placeholder="¿Por qué hay que editarlo?"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={sending}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50"
      >
        {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Enviar solicitud</>}
      </button>
    </div>
  );
}
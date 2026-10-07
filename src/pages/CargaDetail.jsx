import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { estimacionCargaHoy } from '@/lib/biocomp';
import { formatFechaLarga, formatFechaCorta, diaSemana } from '@/lib/formatDate';
import CargaEditor from '@/components/CargaEditor';
import { CalendarDays, PackagePlus, FlaskConical, Cpu, Layers, Trash2, Pencil, X } from 'lucide-react';

export default function CargaDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [carga, setCarga] = useState(null);
  const [recepcion, setRecepcion] = useState(null);
  const [acond, setAcond] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadData = async () => {
    try {
      const c = await base44.entities.Carga.get(id);
      setCarga(c);
      const recs = await base44.entities.Recepcion.filter({ cargaId: id });
      setRecepcion(recs[0] || null);
      const acs = await base44.entities.Acondicionamiento.filter({ cargaId: id });
      setAcond(acs[0] || null);
    } catch (e) {
      setNotFound(true);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [id]);

  if (loading || !settings) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;
  }
  if (notFound || !carga) {
    return <div className="py-20 text-center text-gray-400">No se encontró la carga.</div>;
  }

  const estHoy = carga.estado === 'en_biocomp' && acond && recepcion
    ? estimacionCargaHoy(recepcion, acond, carga.fechaRealIngresoBiocomp, settings, carga.horaRealIngresoBiocomp)
    : null;

  // Fallback a campos viejos (verdura→liviano, carne+densos→denso)
  const tachosLivianoView = recepcion?.tachosLiviano ?? recepcion?.tachosVerdura ?? [];
  const tachosDensoView = recepcion?.tachosDenso ?? recepcion?.tachosCarne ?? [];
  const livianoLView = recepcion?.subtotalLivianoL ?? recepcion?.subtotalVerduraL ?? 0;
  const livianoKgView = recepcion?.subtotalLivianoKg ?? recepcion?.subtotalVerduraKg ?? 0;
  const densoLView = recepcion?.subtotalDensoL ?? ((recepcion?.subtotalCarneL ?? 0) + (recepcion?.densosLitros ?? 0));
  const densoKgView = recepcion?.subtotalDensoKg ?? ((recepcion?.subtotalCarneKg ?? 0) + (recepcion?.densosKg ?? 0));
  const criticoLView = recepcion?.criticoLitros ?? 0;
  const criticoKgView = recepcion?.criticoKg ?? 0;

  const estadoBadge = carga.estado === 'en_biocomp'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-gray-100 text-gray-500';

  const eliminarCarga = async () => {
    setDeleting(true);
    try {
      // Borrar registros asociados primero
      if (recepcion) await base44.entities.Recepcion.delete(recepcion.id);
      if (acond) await base44.entities.Acondicionamiento.delete(acond.id);
      await base44.entities.Carga.delete(carga.id);
      // Limpiar notificaciones huérfanas de esta carga (deleteMany usa RLS admin)
      try { await base44.entities.Notificacion.deleteMany({ cargaId: carga.id }); } catch (e) {}
      toast({ title: 'Carga eliminada', description: carga.codigo });
      navigate(-1);
    } catch (e) {
      toast({ title: 'Error al eliminar', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{carga.codigo}</h1>
          <p className="text-sm text-gray-500 capitalize">{diaSemana(carga.fechaRealInicio)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <span className={`text-xs px-3 py-1 rounded-full ${estadoBadge}`}>
            {carga.estado === 'en_biocomp' ? 'En BioComp' : carga.estado === 'descargada' ? 'Descargada' : 'Recepción'}
          </span>
        </div>
      </div>

      {/* Fechas */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
        <div className="flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Fecha real de recepción</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{formatFechaLarga(carga.fechaRealInicio)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Layers className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Ingreso al BioComp</p>
            <p className="text-sm font-medium text-gray-900 capitalize">{formatFechaLarga(carga.fechaRealIngresoBiocomp)}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-gray-400">Cargado al sistema</p>
            <p className="text-sm text-gray-600">{formatFechaCorta(carga.fechaRegistro)}</p>
          </div>
        </div>
      </div>

      {/* Estimación hoy */}
      {estHoy && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-emerald-900 text-sm">Estado hoy en BioComp <span className="font-normal text-emerald-600/70 text-xs">(masa orgánica, sin viruta)</span></h3>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-emerald-700 text-xs">Días adentro</p><p className="font-bold text-emerald-900 text-lg">{estHoy.dias}</p></div>
            <div><p className="text-emerald-700 text-xs">Volumen</p><p className="font-bold text-emerald-900 text-lg">{Math.round(estHoy.litros)}L</p></div>
            <div><p className="text-emerald-700 text-xs">Masa</p><p className="font-bold text-emerald-900 text-lg">{Math.round(estHoy.kg)}kg</p></div>
          </div>
          {estHoy.esMadura && <p className="text-xs text-emerald-700 font-medium mt-2">✓ Madura — lista para descarga</p>}
        </div>
      )}

      {/* Recepción */}
      {recepcion && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Recepción</h3>
          </div>

          {/* Liviano */}
          <div>
            <p className="text-xs font-medium text-emerald-700 mb-1">Liviano · {livianoLView}L · {livianoKgView}kg</p>
            <div className="space-y-1">
              {tachosLivianoView.map((t, i) => (
                <TachoLine key={i} label={`Tacho ${i + 1}`} t={t} color="emerald" />
              ))}
              {tachosLivianoView.length === 0 && <p className="text-xs text-gray-400">Sin tachos</p>}
            </div>
          </div>

          {/* Denso */}
          <div>
            <p className="text-xs font-medium text-amber-600 mb-1">Denso · {densoLView}L · {densoKgView}kg</p>
            <div className="space-y-1">
              {tachosDensoView.map((t, i) => (
                <TachoLine key={i} label={`Tacho ${i + 1}`} t={t} color="amber" />
              ))}
              {tachosDensoView.length === 0 && <p className="text-xs text-gray-400">Sin tachos</p>}
            </div>
          </div>

          {/* Crítico y descarte */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-rose-500">Crítico (descartado)</p>
              <p className="font-medium text-rose-600">{criticoLView}L · {criticoKgView}kg</p>
              {recepcion.criticoObs && <p className="text-xs text-gray-400">{recepcion.criticoObs}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400">Descarte</p>
              <p className="font-medium text-gray-700">{recepcion.descarteLitros}L · {recepcion.descarteKg}kg</p>
              {recepcion.descarteMotivo && <p className="text-xs text-gray-400">{recepcion.descarteMotivo}</p>}
            </div>
          </div>

          {/* Total orgánico */}
          <div className="border-t border-gray-50 pt-3 grid grid-cols-2 gap-3">
            <div><p className="text-xs text-gray-400">Total orgánico</p><p className="font-bold text-gray-900">{recepcion.totalOrganicoL}L · {recepcion.totalOrganicoKg}kg</p></div>
            <div><p className="text-xs text-gray-400">Densidad orgánica</p><p className="font-bold text-gray-900">{recepcion.densidadOrganica} g/L</p></div>
          </div>
        </div>
      )}

      {/* Acondicionamiento */}
      {acond && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Acondicionamiento</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-gray-400">Viruta necesaria</p><p className="font-medium text-gray-700">{acond.virutaNecesariaL}L</p></div>
            <div><p className="text-xs text-gray-400">Viruta real</p><p className="font-medium text-gray-700">{acond.virutaRealL}L · {acond.virutaRealKg}kg</p></div>
            <div><p className="text-xs text-gray-400">Total entrada BioComp</p><p className="font-medium text-gray-700">{acond.totalEntradaL}L · {acond.totalEntradaKg}kg</p></div>
            {acond.fechaRealIngresoBiocomp && (
              <div><p className="text-xs text-gray-400">Ingreso BioComp</p><p className="font-medium text-gray-700 capitalize">{formatFechaCorta(acond.fechaRealIngresoBiocomp)}{carga.horaRealIngresoBiocomp ? ` · ${carga.horaRealIngresoBiocomp}` : ''}</p></div>
            )}
          </div>
        </div>
      )}

      {/* Eliminar carga (admin) */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          {confirmDelete ? (
            <div className="space-y-3">
              <h3 className="font-semibold text-red-600 text-sm">¿Eliminar {carga.codigo}?</h3>
              <p className="text-xs text-gray-500">Se borra la carga, su recepción y acondicionamiento. No se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  onClick={eliminarCarga}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Trash2 className="w-4 h-4" /> Sí, eliminar</>}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4" /> Eliminar carga
            </button>
          )}
        </div>
      )}

      {editMode && carga && (
        <CargaEditor
          carga={carga}
          recepcion={recepcion}
          acond={acond}
          onDone={() => { setEditMode(false); loadData(); }}
          onCancel={() => setEditMode(false)}
        />
      )}
    </div>
  );
}

function TachoLine({ label, t, color }) {
  const neto = Math.max(0, (Number(t.pesoBrutoKg) || 0) - (Number(t.taraKg) || 0));
  const densidad = Number(t.litros) > 0 ? Math.round((neto / Number(t.litros)) * 1000) : 0;
  const dotColor = color === 'rose' ? 'bg-rose-500' : color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2 text-xs text-gray-600">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      <span className="flex-1">{label}: {t.litros}L · {t.pesoBrutoKg}kg bruto · tara {t.taraKg}kg</span>
      <span className="text-gray-400">neto {neto.toFixed(1)}kg</span>
      {densidad > 0 && <span className="text-gray-400">{densidad} g/L</span>}
    </div>
  );
}
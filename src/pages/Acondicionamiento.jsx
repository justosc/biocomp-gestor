import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { virutaNecesaria } from '@/lib/biocomp';
import { useToast } from '@/components/ui/use-toast';
import { Save, ArrowRight } from 'lucide-react';
import SheetSelect from '@/components/SheetSelect';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { syncSheetsSilently } from '@/lib/syncSheets';

export default function Acondicionamiento() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cargas, setCargas] = useState([]);
  const [recepciones, setRecepciones] = useState([]);
  const [acondicionamientos, setAcondicionamientos] = useState([]);
  const [selectedCargaId, setSelectedCargaId] = useState('');
  const [virutaRealL, setVirutaRealL] = useState('');
  const [virutaRealKg, setVirutaRealKg] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().slice(0, 10));
  const [horaIngreso, setHoraIngreso] = useState(new Date().toTimeString().slice(0, 5));
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function load() {
      const [c, r, a] = await Promise.all([
        base44.entities.Carga.list('-created_date', 200),
        base44.entities.Recepcion.list('-created_date', 200),
        base44.entities.Acondicionamiento.list('-created_date', 200),
      ]);
      setCargas(c); setRecepciones(r); setAcondicionamientos(a);
      // Preseleccionar la carga si viene en la URL (flujo desde Recepción)
      const cargaIdParam = searchParams.get('cargaId');
      if (cargaIdParam) {
        setSelectedCargaId(cargaIdParam);
      }
    }
    load();
  }, [searchParams]);

  if (!settings) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;

  const cargasPendientes = cargas.filter(c => c.estado === 'recepcion').sort((a, b) => (a.fechaRealInicio || '').localeCompare(b.fechaRealInicio || ''));
  const carga = cargas.find(c => c.id === selectedCargaId);
  const recepc = recepciones.find(r => r.cargaId === selectedCargaId);
  const acondExistente = acondicionamientos.find(a => a.cargaId === selectedCargaId);

  const virutaNec = recepc ? virutaNecesaria(recepc) : 0;
  const totalEntradaL = (recepc?.totalOrganicoL || 0) + (recepc?.densosLitros || 0) + (Number(virutaRealL) || 0);
  const totalEntradaKg = (recepc?.totalOrganicoKg || 0) + (recepc?.densosKg || 0) + (Number(virutaRealKg) || 0);
  // Fallback a campos viejos (verdura→liviano, carne+densos→denso)
  const livianoL = recepc?.subtotalLivianoL ?? recepc?.subtotalVerduraL ?? 0;
  const livianoKg = recepc?.subtotalLivianoKg ?? recepc?.subtotalVerduraKg ?? 0;
  const densoL = recepc?.subtotalDensoL ?? ((recepc?.subtotalCarneL ?? 0) + (recepc?.densosLitros ?? 0));
  const densoKg = recepc?.subtotalDensoKg ?? ((recepc?.subtotalCarneKg ?? 0) + (recepc?.densosKg ?? 0));
  const criticoL = recepc?.criticoLitros ?? 0;
  const criticoKg = recepc?.criticoKg ?? 0;

  const handleSave = async () => {
    if (!selectedCargaId) {
      toast({ title: 'Seleccioná una carga', variant: 'destructive' });
      return;
    }
    if (!fechaIngreso) {
      toast({ title: 'Falta la fecha de ingreso al BioComp', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Acondicionamiento.create({
        cargaId: selectedCargaId,
        virutaNecesariaL: virutaNec,
        virutaRealL: Number(virutaRealL) || 0,
        virutaRealKg: Number(virutaRealKg) || 0,
        totalEntradaL,
        totalEntradaKg,
        fechaRealIngresoBiocomp: fechaIngreso,
      });

      await base44.entities.Carga.update(selectedCargaId, {
        estado: 'en_biocomp',
        fechaRealIngresoBiocomp: fechaIngreso,
        horaRealIngresoBiocomp: horaIngreso,
      });

      toast({ title: `Carga ${carga.codigo} ingresó al BioComp` });
      setSelectedCargaId('');
      setVirutaRealL('');
      setVirutaRealKg('');
      setFechaIngreso(new Date().toISOString().slice(0, 10));
      setHoraIngreso(new Date().toTimeString().slice(0, 5));
      // Reload
      const [c, r, a] = await Promise.all([
        base44.entities.Carga.list('-created_date', 200),
        base44.entities.Recepcion.list('-created_date', 200),
        base44.entities.Acondicionamiento.list('-created_date', 200),
      ]);
      setCargas(c); setRecepciones(r); setAcondicionamientos(a);
      syncSheetsSilently();
      navigate('/biocomp');
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Acondicionamiento</h1>
        <p className="text-sm text-gray-500">Calcular viruta y cargar al BioComp</p>
      </div>

      {/* Selección de carga */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <label className="text-sm font-medium text-gray-700">Carga pendiente de acondicionar</label>
        {cargasPendientes.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No hay cargas pendientes. Todas están en el BioComp.</p>
        ) : (
          <div className="mt-2">
            <SheetSelect
              value={selectedCargaId}
              onChange={(val) => {
                setSelectedCargaId(val);
                const a = acondicionamientos.find(a => a.cargaId === val);
                const cargaSel = cargas.find(c => c.id === val);
                if (a) {
                  setVirutaRealL(a.virutaRealL || '');
                  setVirutaRealKg(a.virutaRealKg || '');
                  setFechaIngreso(a.fechaRealIngresoBiocomp || new Date().toISOString().slice(0, 10));
                  setHoraIngreso(cargaSel?.horaRealIngresoBiocomp || new Date().toTimeString().slice(0, 5));
                } else {
                  setVirutaRealL('');
                  setVirutaRealKg('');
                  setFechaIngreso(new Date().toISOString().slice(0, 10));
                  setHoraIngreso(new Date().toTimeString().slice(0, 5));
                }
              }}
              placeholder="Seleccionar..."
              label="Carga pendiente de acondicionar"
              options={cargasPendientes.map(c => ({ value: c.id, label: `${c.codigo} · recibido ${c.fechaRealInicio}` }))}
            />
          </div>
        )}
      </div>

      {carga && recepc && (
        <>
          {/* Resumen de la recepción */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Resumen de recepción — {carga.codigo}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-emerald-50 rounded-lg p-2">
                <p className="text-emerald-700 text-xs">Liviano</p>
                <p className="font-bold text-emerald-900">{livianoL}L</p>
                <p className="text-emerald-700 text-xs">{livianoKg}kg</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2">
                <p className="text-amber-700 text-xs">Denso</p>
                <p className="font-bold text-amber-900">{densoL}L</p>
                <p className="text-amber-700 text-xs">{densoKg}kg</p>
              </div>
              <div className="bg-rose-50 rounded-lg p-2">
                <p className="text-rose-700 text-xs">Crítico (descartado)</p>
                <p className="font-bold text-rose-900">{criticoL}L</p>
                <p className="text-rose-700 text-xs">{criticoKg}kg</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 text-xs">Descarte</p>
                <p className="font-bold text-gray-500">{recepc.descarteLitros}L</p>
                <p className="text-gray-400 text-xs">{recepc.descarteKg}kg</p>
              </div>
            </div>
          </div>

          {/* Cálculo de viruta */}
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <h3 className="font-semibold text-amber-900 text-sm mb-2">Viruta necesaria (estructurante)</h3>
            <div className="text-sm text-amber-800 space-y-1">
              <p>Liviano (1:1): {livianoL}L → {livianoL}L de viruta</p>
              <p>Denso (2:1): {densoL}L → {densoL * 2}L de viruta</p>
              <p className="font-bold pt-1 border-t border-amber-200 mt-2">Total necesario: {virutaNec}L</p>
              <p className="text-xs text-amber-600">Bolsa: {settings.virutaBolsaL}L/{settings.virutaBolsaKg}kg · Tacho: {settings.capacidadTachoL}L</p>
            </div>
          </div>

          {/* Viruta real */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Viruta real utilizada</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400">Litros reales</label>
                <input type="number" value={virutaRealL} onChange={e => setVirutaRealL(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder={virutaNec} />
              </div>
              <div>
                <label className="text-xs text-gray-400">Kg reales</label>
                <input type="number" value={virutaRealKg} onChange={e => setVirutaRealKg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
                  placeholder="0" />
              </div>
            </div>

            {/* Medidor de proporción */}
            {virutaNec > 0 && (() => {
              const realL = Number(virutaRealL) || 0;
              const pct = Math.round((realL / virutaNec) * 100);
              const barW = Math.min(pct, 150);
              let color, label, msg;
              if (realL === 0) {
                color = 'bg-gray-200'; label = '0%'; msg = 'Sin cargar aún';
              } else if (pct < 80) {
                color = 'bg-amber-500'; label = `${pct}%`; msg = 'Por debajo de lo necesario';
              } else if (pct <= 110) {
                color = 'bg-emerald-500'; label = `${pct}%`; msg = 'Proporción correcta';
              } else if (pct <= 150) {
                color = 'bg-amber-500'; label = `${pct}%`; msg = 'Más viruta de lo calculado';
              } else {
                color = 'bg-rose-500'; label = `${pct}%`; msg = 'Exceso de viruta';
              }
              return (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">Real vs. necesario</span>
                    <span className="font-semibold text-gray-700">{realL}L / {virutaNec}L</span>
                  </div>
                  <div className="relative h-3 bg-gray-100 rounded-full overflow-visible">
                    {/* marca del 100% */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400" style={{ left: `${Math.min(100, 100 / 1.5)}%` }} title="100% necesario" />
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(barW / 1.5)}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                    <span className="text-xs text-gray-400">{msg}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Fecha y hora de ingreso */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Fecha de ingreso al BioComp</label>
                <input type="date" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hora de ingreso</label>
                <input type="time" value={horaIngreso} onChange={e => setHoraIngreso(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">La hora inicia el conteo real de la curva de deshidratación. Después de guardar queda fija.</p>
          </div>

          {/* Total que entra */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-700 text-sm">Total que entra al BioComp</p>
                <p className="text-xs text-emerald-600">(orgánico + densos + viruta — descarte no entra)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-900">{totalEntradaL}<span className="text-base font-normal">L</span></p>
                <p className="text-sm text-emerald-700">{totalEntradaKg}kg</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ArrowRight className="w-5 h-5" /> Ingresar al BioComp</>}
          </button>
        </>
      )}
    </div>
  );
}
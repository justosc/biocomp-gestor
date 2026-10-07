import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { UserCheck, X, Shield, HardHat, Loader2 } from 'lucide-react';

export default function SolicitudesAcceso() {
  const { toast } = useToast();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState({});
  const [procesando, setProcesando] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.SolicitudAcceso.list('-created_date', 100);
      setSolicitudes(list);
    } catch (e) {
      toast({ title: 'No se pudo cargar', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const pendientes = solicitudes.filter(s => s.estado === 'pendiente');

  const handleAprobar = async (s) => {
    const role = roles[s.id] || 'user';
    setProcesando(s.id);
    try {
      await base44.functions.invoke('gestionarAcceso', { action: 'aprobar', userId: s.userId, role, solicitudId: s.id });
      toast({ title: 'Acceso aprobado', description: `${s.email} ya puede entrar como ${role === 'admin' ? 'admin' : 'operario'}.` });
      await load();
    } catch (e) {
      toast({ title: 'No se pudo aprobar', description: e.message, variant: 'destructive' });
    }
    setProcesando(null);
  };

  const handleRechazar = async (s) => {
    if (!window.confirm(`¿Rechazar el acceso de ${s.email}?`)) return;
    setProcesando(s.id);
    try {
      await base44.functions.invoke('gestionarAcceso', { action: 'rechazar', solicitudId: s.id });
      toast({ title: 'Solicitud rechazada' });
      await load();
    } catch (e) {
      toast({ title: 'No se pudo rechazar', description: e.message, variant: 'destructive' });
    }
    setProcesando(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-6 h-6 border-4 border-amber-100 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <UserCheck className="w-4 h-4 text-amber-700" />
        <h3 className="font-semibold text-amber-900 text-sm">Solicitudes de acceso pendientes ({pendientes.length})</h3>
      </div>
      <p className="text-xs text-amber-700">Personas que se registraron pero no estaban pre-autorizadas. Aprobalas para que puedan entrar.</p>
      {pendientes.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">Sin solicitudes pendientes. Cuando alguien se registre, aparecerá acá.</p>
      )}
      <div className="space-y-2">
        {pendientes.map(s => (
          <div key={s.id} className="bg-white rounded-lg border border-amber-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.email}</p>
                <p className="text-xs text-gray-400">{s.fecha}</p>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex-1 grid grid-cols-2 gap-1.5">
                <button onClick={() => setRoles(r => ({ ...r, [s.id]: 'user' }))} className={`flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-lg border text-xs ${(roles[s.id] || 'user') === 'user' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-gray-200 text-gray-600'}`}>
                  <HardHat className="w-3.5 h-3.5" /> Operario
                </button>
                <button onClick={() => setRoles(r => ({ ...r, [s.id]: 'admin' }))} className={`flex items-center gap-1.5 px-2.5 py-2 min-h-[44px] rounded-lg border text-xs ${roles[s.id] === 'admin' ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-gray-200 text-gray-600'}`}>
                  <Shield className="w-3.5 h-3.5" /> Admin
                </button>
              </div>
              <button onClick={() => handleAprobar(s)} disabled={procesando === s.id} className="px-3 py-2 min-h-[44px] rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
                {procesando === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className="w-3.5 h-3.5" />} Aprobar
              </button>
              <button onClick={() => handleRechazar(s)} disabled={procesando === s.id} className="px-2.5 py-2 min-h-[44px] rounded-lg bg-white border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
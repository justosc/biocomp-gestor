import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Shield, HardHat, UserPlus, Trash2, CheckCircle2, Clock } from 'lucide-react';

export default function Invitaciones() {
  const { toast } = useToast();
  const [invitaciones, setInvitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('user');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Invitacion.list('-created_date', 200);
      setInvitaciones(list);
    } catch (e) {
      toast({ title: 'No se pudo cargar', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Invitacion.create({
        email: email.trim().toLowerCase(),
        role: rol,
        estado: 'pendiente',
        fecha: new Date().toISOString().slice(0, 10)
      });
      toast({ title: 'Pre-autorización guardada', description: `Cuando ${email} se registre, entra automáticamente como ${rol === 'admin' ? 'admin' : 'operario'}.` });
      setEmail('');
      await load();
    } catch (e) {
      toast({ title: 'No se pudo guardar', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta pre-autorización?')) return;
    try {
      await base44.entities.Invitacion.delete(id);
      await load();
    } catch (e) {
      toast({ title: 'No se pudo eliminar', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-4">
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">Pre-autorizar usuario</h3>
        </div>
        <p className="text-xs text-gray-500">Cargá el email y el rol. Cuando la persona se registre con ese email, entra automáticamente. Después mandale el link de la app por tu cuenta.</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50">
          <Mail className="w-4 h-4 text-gray-400 shrink-0" />
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ejemplo.com" className="bg-transparent flex-1 text-sm text-gray-900 outline-none placeholder:text-gray-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setRol('user')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${rol === 'user' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
            <HardHat className={`w-4 h-4 ${rol === 'user' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-medium ${rol === 'user' ? 'text-emerald-900' : 'text-gray-700'}`}>Operario</p>
              <p className="text-xs text-gray-400">Flujo guiado</p>
            </div>
          </button>
          <button type="button" onClick={() => setRol('admin')} className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${rol === 'admin' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
            <Shield className={`w-4 h-4 ${rol === 'admin' ? 'text-emerald-600' : 'text-gray-400'}`} />
            <div>
              <p className={`text-sm font-medium ${rol === 'admin' ? 'text-emerald-900' : 'text-gray-700'}`}>Admin</p>
              <p className="text-xs text-gray-400">Ve todo</p>
            </div>
          </button>
        </div>
        <button type="submit" disabled={saving || !email.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
          <UserPlus className="w-4 h-4" /> {saving ? 'Guardando...' : 'Pre-autorizar'}
        </button>
      </form>

      <div className="pt-2 border-t border-gray-50">
        <h4 className="text-xs font-semibold text-gray-500 mb-2">Pre-autorizaciones ({invitaciones.length})</h4>
        {loading ? (
          <div className="flex justify-center py-3"><div className="w-5 h-5 border-2 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>
        ) : invitaciones.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">Sin pre-autorizaciones</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {invitaciones.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 py-2.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${inv.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {inv.role === 'admin' ? <Shield className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-400">{inv.role === 'admin' ? 'Admin' : 'Operario'}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full shrink-0 ${inv.estado === 'aceptada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {inv.estado === 'aceptada' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  {inv.estado === 'aceptada' ? 'Aceptada' : 'Pendiente'}
                </span>
                <button onClick={() => handleDelete(inv.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 shrink-0">
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
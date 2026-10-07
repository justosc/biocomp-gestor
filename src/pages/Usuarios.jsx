import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Users as UsersIcon, Shield, HardHat, Trash2 } from 'lucide-react';
import Invitaciones from '@/components/usuarios/Invitaciones';
import SolicitudesAcceso from '@/components/usuarios/SolicitudesAcceso';

export default function Usuarios() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.User.list('-created_date', 500);
      setUsuarios(list);
    } catch (e) {
      toast({ title: 'No se pudo cargar la lista', description: e.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleRemove = async (u) => {
    if (u.id === currentUser.id) {
      toast({ title: 'No podés eliminarte a vos mismo', variant: 'destructive' });
      return;
    }
    if (!window.confirm(`¿Eliminar a ${u.email}? La persona perderá acceso a la app.`)) return;
    try {
      await base44.entities.User.delete(u.id);
      toast({ title: 'Usuario eliminado', description: u.email });
      await load();
    } catch (e) {
      toast({ title: 'No se pudo eliminar', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-sm text-gray-500">Pre-autorizá, aprobá accesos y gestioná roles</p>
      </div>

      <SolicitudesAcceso />

      <Invitaciones />

      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <UsersIcon className="w-4 h-4 text-emerald-600" />
          <h3 className="font-semibold text-gray-900 text-sm">{usuarios.length} usuarios activos</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>
        ) : (
          <div className="divide-y divide-gray-50">
            {usuarios.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {u.role === 'admin' ? <Shield className="w-4 h-4" /> : <HardHat className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-400">
                    {u.role === 'admin' ? 'Admin' : 'Operario'}
                    {u.autorizado === false && u.role !== 'admin' && ' · pendiente de autorización'}
                    {u.nombre && ` · ${u.nombre} ${u.apellido || ''}`}
                    {u.id === currentUser.id && ' · vos'}
                  </p>
                </div>
                <button onClick={() => handleRemove(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0" aria-label="Eliminar">
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
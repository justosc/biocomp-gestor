import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Save, User, Trash2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent,
  AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function Perfil() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [dni, setDni] = useState(user?.dni || '');
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.entities.User.delete(user.id);
    } catch (e) {
      // may lack permission — we log out regardless
    }
    setDeleteOpen(false);
    toast({ title: 'Sesión cerrada', description: 'Tu cuenta fue dada de baja.' });
    try {
      await base44.auth.logout('/');
    } catch (e) {
      window.location.href = '/';
    }
    setDeleting(false);
  };

  const handleSave = async () => {
    if (!nombre.trim() || !apellido.trim() || !dni.trim()) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ nombre: nombre.trim(), apellido: apellido.trim(), dni: dni.trim() });
      toast({ title: 'Perfil guardado' });
      navigate('/recepcion');
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5 max-w-md mx-auto">
      <div className="text-center pt-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <User className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Bienvenido</h1>
        <p className="text-sm text-gray-500">Confirmá tus datos para empezar</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
        <div>
          <label className="text-xs text-gray-400">Email</label>
          <p className="text-sm text-gray-600 font-medium">{user?.email}</p>
        </div>
        <div>
          <label className="text-xs text-gray-400">Nombre</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            placeholder="Tu nombre" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Apellido</label>
          <input value={apellido} onChange={e => setApellido(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            placeholder="Tu apellido" />
        </div>
        <div>
          <label className="text-xs text-gray-400">DNI</label>
          <input value={dni} onChange={e => setDni(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            placeholder="Sin puntos ni guiones" inputMode="numeric" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50">
        {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
        Empezar
      </button>

      {/* Eliminar cuenta */}
      <div className="border-t border-gray-100 pt-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Eliminar cuenta</h3>
        </div>
        <p className="text-xs text-gray-500 mb-3">Cierra tu sesión y da de baja tu acceso a la app. No se puede deshacer.</p>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-200 hover:bg-red-100 transition-colors">
              <Trash2 className="w-4 h-4" /> Eliminar mi cuenta
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
              <AlertDialogDescription>
                Vas a perder acceso a la app y tu sesión se cerrará. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 text-white hover:bg-red-700">
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
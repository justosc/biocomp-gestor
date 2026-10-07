import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Hourglass, LogOut, RefreshCw } from 'lucide-react';

export default function PantallaEspera({ onRecheck }) {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
          <Hourglass className="w-8 h-8 text-amber-600 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2 font-heading">Esperando autorización</h1>
        <p className="text-sm text-gray-500 mb-1">Tu cuenta fue creada pero todavía no fue autorizada.</p>
        <p className="text-sm text-gray-500 mb-6">El administrador va a revisar tu acceso y habilitarte pronto.</p>
        <p className="text-xs text-gray-400 mb-6">Usuario: {user?.email}</p>
        <div className="flex gap-2">
          <button onClick={onRecheck} className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            <RefreshCw className="w-4 h-4" /> Revisar
          </button>
          <button onClick={() => logout()} className="px-4 py-2.5 min-h-[44px] rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 flex items-center justify-center">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
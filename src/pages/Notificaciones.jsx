import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, PackagePlus } from 'lucide-react';
import { useNotificaciones } from '@/hooks/useNotificaciones';
import { diaSemana } from '@/lib/formatDate';

export default function Notificaciones() {
  const { notificaciones, loading, noLeidas, marcarLeida, marcarTodasLeidas, reload } = useNotificaciones();

  useEffect(() => { reload(); }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-sm text-gray-500">{noLeidas} sin leer · {notificaciones.length} en total</p>
        </div>
        {noLeidas > 0 && (
          <button
            onClick={marcarTodasLeidas}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100"
          >
            <CheckCheck className="w-4 h-4" /> Marcar todas
          </button>
        )}
      </div>

      {notificaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center shadow-sm">
          <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400">No tenés notificaciones todavía</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notificaciones.map((n) => {
            const fecha = (n.created_date || '').slice(0, 10);
            return (
              <div
                key={n.id}
                className={`bg-white rounded-xl border p-4 shadow-sm transition-colors ${
                  n.leida ? 'border-gray-100' : 'border-emerald-200 bg-emerald-50/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${n.leida ? 'bg-gray-100' : 'bg-emerald-100'}`}>
                    <PackagePlus className={`w-4 h-4 ${n.leida ? 'text-gray-400' : 'text-emerald-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">{n.titulo}</p>
                      {!n.leida && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{n.mensaje}</p>
                    <p className="text-xs text-gray-400 mt-1 capitalize">{fecha && diaSemana(fecha)} · {fecha}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {n.cargaId && (
                    <Link
                      to={`/carga/${n.cargaId}`}
                      onClick={() => { if (!n.leida) marcarLeida(n.id); }}
                      className="flex-1 text-center text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg py-2"
                    >
                      Ver carga
                    </Link>
                  )}
                  {!n.leida && (
                    <button
                      onClick={() => marcarLeida(n.id)}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200"
                    >
                      Marcar leída
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
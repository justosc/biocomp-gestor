import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useNotificaciones() {
  const { user } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const list = await base44.entities.Notificacion.list('-created_date', 50);
      setNotificaciones(list);
      setNoLeidas(list.filter((n) => !n.leida).length);
    } catch (e) {
      // sin permisos o sin user
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    load();
    const unsub = base44.entities.Notificacion.subscribe(() => load());
    return unsub;
  }, [user, load]);

  const marcarLeida = async (id) => {
    try {
      await base44.entities.Notificacion.update(id, { leida: true });
      setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
      setNoLeidas((prev) => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const marcarTodasLeidas = async () => {
    const pendientes = notificaciones.filter((n) => !n.leida);
    if (pendientes.length === 0) return;
    try {
      await Promise.all(pendientes.map((n) => base44.entities.Notificacion.update(n.id, { leida: true })));
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    } catch (e) {}
  };

  return { noLeidas, notificaciones, loading, marcarLeida, marcarTodasLeidas, reload: load };
}
import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotificaciones } from '@/hooks/useNotificaciones';

export default function NotificationBell() {
  const { noLeidas } = useNotificaciones();
  return (
    <Link
      to="/notificaciones"
      className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-600 active:bg-gray-100 shrink-0"
      aria-label="Notificaciones"
    >
      <Bell className="w-5 h-5" />
      {noLeidas > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {noLeidas > 9 ? '9+' : noLeidas}
        </span>
      )}
    </Link>
  );
}
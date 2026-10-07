import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import PantallaEspera from '@/components/PantallaEspera';

export default function AuthorizationGate({ children }) {
  const { user, checkUserAuth } = useAuth();
  const [status, setStatus] = useState('checking'); // checking | autorizado | pendiente

  const runCheck = async () => {
    if (!user) { setStatus('autorizado'); return; }
    if (user.role === 'admin') { setStatus('autorizado'); return; }
    if (user.autorizado === true) { setStatus('autorizado'); return; }
    setStatus('checking');
    try {
      const res = await base44.functions.invoke('verificarAutorizacion', {});
      const data = res.data || {};
      if (data.autorizado) {
        setStatus('autorizado');
        await checkUserAuth();
      } else {
        setStatus('pendiente');
      }
    } catch (e) {
      setStatus(user.autorizado ? 'autorizado' : 'pendiente');
    }
  };

  useEffect(() => { runCheck(); }, [user?.id]);

  if (!user || user.role === 'admin') return children;
  if (status === 'checking') {
    return <div className="flex justify-center items-center min-h-screen"><div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" /></div>;
  }
  if (status === 'pendiente') return <PantallaEspera onRecheck={runCheck} />;
  return children;
}
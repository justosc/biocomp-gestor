import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSettings } from '@/hooks/useSettings';
import { useToast } from '@/components/ui/use-toast';
import { Sheet, RefreshCw, ExternalLink } from 'lucide-react';

export default function SheetsSync() {
  const { settings } = useSettings();
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');

  useEffect(() => {
    if (settings?.sheetUrl) setSheetUrl(settings.sheetUrl);
  }, [settings?.sheetUrl]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncToGoogleSheets', {});
      if (res.data?.sheetUrl) setSheetUrl(res.data.sheetUrl);
      toast({ title: 'Planilla sincronizada', description: 'Los datos se actualizaron en Google Sheets' });
    } catch (e) {
      toast({ title: 'Error al sincronizar', description: e.message, variant: 'destructive' });
    }
    setSyncing(false);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Sheet className="w-4 h-4 text-emerald-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Planilla compartida (Google Sheets)</h3>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Sincronizá el resumen a una planilla editable. La primera vez se crea automáticamente; después compartila con tu jefe.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
        {sheetUrl && (
          <a
            href={sheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-emerald-600 font-medium hover:underline"
          >
            <ExternalLink className="w-4 h-4" /> Abrir planilla
          </a>
        )}
      </div>
      {sheetUrl && <p className="text-xs text-gray-400 mt-2 truncate">{sheetUrl}</p>}
    </div>
  );
}
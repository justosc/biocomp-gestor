import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';

export default function SheetSelect({ value, onChange, options, placeholder, label }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  const selectedLabel = selected ? selected.label : (placeholder || 'Seleccionar...');

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:border-emerald-400 text-left"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>{label || 'Seleccionar'}</DrawerTitle>
            <DrawerDescription className="sr-only">Elegí una opción</DrawerDescription>
          </DrawerHeader>
          <div className="px-2 overflow-y-auto" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}>
            {options.length === 0 ? (
              <p className="px-3 py-6 text-sm text-gray-400 text-center">No hay opciones</p>
            ) : (
              options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-3 py-3.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    opt.value === value ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
import React, { useRef } from 'react';

export default function TachoMeter({ litros, maxLitros = 220, onChange, color = '#10b981' }) {
  const svgRef = useRef(null);
  const fillPercent = Math.min(1, Math.max(0, litros / maxLitros));

  const handlePointer = (clientY) => {
    if (!svgRef.current || !onChange) return;
    const rect = svgRef.current.getBoundingClientRect();
    const y = clientY - rect.top;
    const fillP = Math.min(1, Math.max(0, 1 - y / rect.height));
    onChange(Math.round(fillP * maxLitros));
  };

  const onMouseDown = (e) => {
    e.preventDefault();
    handlePointer(e.clientY);
    const move = (ev) => handlePointer(ev.clientY);
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const onTouchStart = (e) => {
    handlePointer(e.touches[0].clientY);
    const move = (ev) => handlePointer(ev.touches[0].clientY);
    const end = () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };
    window.addEventListener('touchmove', move);
    window.addEventListener('touchend', end);
  };

  const h = 140;
  const w = 60;
  const fillH = h * fillPercent;
  const fillY = h - fillH;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg
        ref={svgRef}
        width={w}
        height={h}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        className="cursor-ns-resize touch-none"
      >
        {/* Cuerpo de la probeta */}
        <rect x="4" y="0" width={w - 8} height={h - 4} rx="6" className="tacho-body" fill="#f3f4f6" stroke="#d1d5db" strokeWidth="1.5" />
        {/* Líquido */}
        <rect x="6" y={fillY} width={w - 12} height={fillH - 2} rx="4" fill={color} opacity="0.7" />
        {/* Base */}
        <rect x="2" y={h - 4} width={w - 4} height="4" rx="2" className="tacho-base" fill="#9ca3af" />
        {/* Marcas */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={w - 12} y1={h * p} x2={w - 6} y2={h * p} className="tacho-mark" stroke="#9ca3af" strokeWidth="1" />
        ))}
      </svg>
      <span className="text-xs font-semibold text-gray-600">{litros}L</span>
    </div>
  );
}
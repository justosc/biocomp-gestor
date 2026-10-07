import React, { useRef, useState, useCallback } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';

const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh, children }) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = useCallback((e) => {
    if (refreshing) return;
    if (window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
    pulling.current = true;
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPullDistance(0);
      return;
    }
    const dampened = Math.min(delta * 0.5, MAX_PULL);
    setPullDistance(dampened);
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullDistance >= THRESHOLD) {
      setRefreshing(true);
      setPullDistance(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {(pullDistance > 0 || refreshing) && (
        <div
          className="flex items-end justify-center overflow-hidden"
          style={{ height: pullDistance }}
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 text-emerald-600 animate-spin mb-2" />
          ) : (
            <ArrowDown
              className="text-gray-400 mb-2 transition-transform"
              style={{
                transform: `scale(${0.6 + progress * 0.4})`,
                opacity: progress,
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}
import React from 'react';

export default function CanvasToolbar({ zoom, onZoomIn, onZoomOut, onZoomReset }) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-2xl shadow-glass border glass-dark" style={{ borderColor: 'var(--room-border)', background: 'var(--header-bg)' }}>
      <button onClick={onZoomOut} title="Zoom Out" className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors" disabled={zoom <= 0.25}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
      </button>
      <button onClick={onZoomReset} title="Reset Zoom (100%)" className="px-2 py-1 text-[11px] font-mono font-bold text-gray-300 hover:text-white transition-colors min-w-[48px] text-center">
        {Math.round((zoom || 1) * 100)}%
      </button>
      <button onClick={onZoomIn} title="Zoom In" className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors" disabled={zoom >= 4}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      </button>
    </div>
  );
}

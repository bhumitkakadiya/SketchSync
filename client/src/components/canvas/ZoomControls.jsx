export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="fixed bottom-6 right-6 z-30 flex items-center gap-1 px-2 py-1.5 rounded-xl glass-dark shadow-glass border" style={{ borderColor: 'var(--bg-border)' }}>
      <button
        id="zoom-out-btn"
        onClick={onZoomOut}
        title="Zoom Out"
        className="btn-ghost p-1.5 rounded-lg text-base leading-none"
        disabled={zoom <= 0.25}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      </button>
      <button
        id="zoom-reset-btn"
        onClick={onReset}
        title="Reset Zoom (100%)"
        className="px-2 py-1 rounded-lg text-xs font-mono font-semibold transition-colors hover:bg-white/10 min-w-[52px] text-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        id="zoom-in-btn"
        onClick={onZoomIn}
        title="Zoom In"
        className="btn-ghost p-1.5 rounded-lg text-base leading-none"
        disabled={zoom >= 4}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

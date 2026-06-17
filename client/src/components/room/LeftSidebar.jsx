import React from 'react';

export default function LeftSidebar({ pageCount, onAddPage, onRemovePage, isOpen, toggleOpen, boardConfig, currentPageIndex = 0 }) {
  if (!isOpen) {
    return (
      <button 
        onClick={toggleOpen}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-40 w-6 h-12 rounded-r-xl flex items-center justify-center transition-all duration-300 shadow-md group hover:w-8"
        style={{
          background: 'var(--toggle-bg)',
          border: '1px solid var(--toggle-border)',
          borderLeft: 'none',
          color: '#00C896',
        }}
        title="Open Pages panel"
      >
        <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="w-36 h-full flex-shrink-0 flex flex-col z-40 relative transition-all duration-300"
      style={{
        background: 'var(--room-sidebar-bg, rgba(10,10,15,0.92))',
        borderRight: '1px solid var(--room-border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Floating Close Button */}
      <button 
        onClick={toggleOpen}
        className="absolute -right-6 top-1/2 -translate-y-1/2 z-50 w-6 h-12 rounded-r-xl flex items-center justify-center transition-all duration-300 shadow-md group hover:w-8 hover:-right-8"
        style={{
          background: 'var(--toggle-bg)',
          border: '1px solid var(--toggle-border)',
          borderLeft: 'none',
          color: '#00C896',
        }}
        title="Close Pages panel"
      >
        <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--room-border)' }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="font-semibold text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-muted)' }}>Pages</h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', border: '1px solid rgba(0,200,150,0.3)' }}>
            {pageCount}
          </span>
        </div>
      </div>

      {/* Page thumbnails */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-3 custom-scrollbar">
        {Array.from({ length: pageCount }).map((_, i) => {
          const isLight = boardConfig?.pageTheme === 'light';
          return (
            <div
              key={i}
              onClick={() => window.dispatchEvent(new CustomEvent('canvas:scroll-to-page', { detail: i }))}
              className={`group relative flex-shrink-0 overflow-hidden cursor-pointer transition-all ${i === currentPageIndex ? 'shadow-[0_0_12px_rgba(0,200,150,0.3)]' : 'hover:shadow-md'}`}
              style={{
                border: i === currentPageIndex ? '2px solid #00C896' : (isLight ? '2px solid transparent' : '2px solid transparent'),
                boxShadow: i !== currentPageIndex ? `inset 0 0 0 1px ${isLight ? '#D1FAE5' : '#27272A'}` : 'none',
                background: isLight ? '#FFFFFF' : '#18181B',
                borderRadius: '8px',
              }}
              onMouseEnter={(e) => { if(i !== currentPageIndex) e.currentTarget.style.borderColor = '#00C896'; }}
              onMouseLeave={(e) => { if(i !== currentPageIndex) e.currentTarget.style.borderColor = isLight ? '#D1FAE5' : '#27272A'; }}
              title={`Go to Page ${i + 1}`}
            >
              {/* Cross Icon for Removal */}
              {pageCount > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemovePage(i); }}
                  className="absolute top-1 right-1 z-20 bg-red-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md"
                  title="Remove Page"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
              {/* Thumbnail preview */}
              <div
                className="w-full flex items-center justify-center relative overflow-hidden"
                style={{
                  aspectRatio: boardConfig?.aspectRatio ? boardConfig.aspectRatio.replace('/', ' / ') : '16 / 9',
                  background: isLight ? '#FAFFFE' : '#09090B',
                }}
              >
                {/* Mini grid lines for visual interest */}
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: boardConfig?.bgStyle === 'grid'
                    ? `linear-gradient(${isLight ? 'rgba(0,200,150,0.4)' : 'rgba(0,200,150,0.4)'} 1px, transparent 1px), linear-gradient(90deg, ${isLight ? 'rgba(0,200,150,0.4)' : 'rgba(0,200,150,0.4)'} 1px, transparent 1px)`
                    : boardConfig?.bgStyle === 'dots'
                    ? `radial-gradient(circle, ${isLight ? 'rgba(0,200,150,0.5)' : 'rgba(0,200,150,0.5)'} 1px, transparent 1px)`
                    : 'none',
                  backgroundSize: '8px 8px',
                }} />
                {/* Pill label inside thumbnail */}
                <div className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold shadow-sm transition-colors ${i === currentPageIndex ? 'bg-[#00C896] text-white' : 'bg-black/40 text-white'}`}>
                  {i + 1}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Fixed Add Page Button */}
      <div className="p-3" style={{ borderTop: '1px solid var(--room-border)' }}>
        <div
          onClick={onAddPage}
          className="group relative rounded-lg flex items-center justify-center cursor-pointer transition-all border border-dashed py-3"
          style={{
            borderColor: '#00C896',
            borderWidth: '2px'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,200,150,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          title="Add Page"
        >
          <svg className="w-6 h-6 opacity-80 group-hover:opacity-100 transition-all group-hover:scale-110" style={{ color: '#00C896' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

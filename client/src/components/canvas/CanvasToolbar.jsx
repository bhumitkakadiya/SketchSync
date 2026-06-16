import { useState, useRef, useEffect } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { TOOLS, TOOL_LIST, DEFAULT_COLORS } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';

// Toolbar is now a floating panel at the bottom-center of the canvas
export default function CanvasToolbar({ socket, sessionId, mainCanvasRef, onExportPNG, onExportPDF, onSaveSnapshot }) {
  const {
    activeTool, color, brushSize, eraserSize, opacity, isAIOpen,
    setTool, setColor, setBrushSize, setEraserSize, toggleAI, undo, redo
  } = useCanvasStore();

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizeSlider, setShowSizeSlider] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showShapesMenu, setShowShapesMenu] = useState(false);
  
  const colorPickerRef = useRef(null);
  const exportRef = useRef(null);
  const shapesMenuRef = useRef(null);
  const fileInputRef = useRef(null);

  // Primary tools shown in toolbar
  const primaryTools = TOOL_LIST.slice(0, 8); // Select through Text
  const hasLaser = TOOL_LIST.find(t => t.id === TOOLS.LASER);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) setShowColorPicker(false);
      if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false);
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target)) setShowShapesMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleUndo = () => {
    const strokeId = undo();
    if (strokeId && socket) socket.emit(SOCKET_EVENTS.CANVAS_UNDO, { strokeId, sessionId });
  };

  const handleRedo = () => {
    const strokeId = redo();
    if (strokeId && socket) socket.emit(SOCKET_EVENTS.CANVAS_REDO, { strokeId, sessionId });
  };

  const handleClear = () => {
    if (!confirm('Clear the board for everyone?')) return;
    const canvas = mainCanvasRef?.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (socket) socket.emit(SOCKET_EVENTS.CANVAS_CLEAR, { sessionId, timestamp: Date.now() });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      const stroke = {
        type: 'image',
        startX: window.innerWidth / 2 - 100,
        startY: window.innerHeight / 2 - 100,
        base64,
        width: 200,
        height: 200,
        color: '#000000',
        brushSize: 1,
      };
      // Emulate drawing an image
      const data = { ...stroke, strokeId: Date.now().toString(), sessionId };
      if (socket) socket.emit(SOCKET_EVENTS.CANVAS_SHAPE, data);
      window.dispatchEvent(new CustomEvent('canvas:add-image', { detail: data }));
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  const currentSize = activeTool === TOOLS.ERASER ? eraserSize : brushSize;

  const toolGroups = [
    [TOOLS.SELECT, TOOLS.PEN, TOOLS.HIGHLIGHTER, TOOLS.ERASER],
    [TOOLS.TEXT, TOOLS.STICKY_NOTE, TOOLS.LASER],
  ];

  const allTools = toolGroups.flat();

  return (
    <>
      {/* ───── Floating Bottom Toolbar ───── */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1.5 rounded-2xl shadow-2xl border border-white/10"
        style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)' }}
      >
        {/* Tool buttons grouped with dividers */}
        {toolGroups.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {group.map((toolId) => {
              const tool = TOOL_LIST.find(t => t.id === toolId);
              if (!tool) return null;
              const isActive = activeTool === toolId;
              return (
                <button
                  key={toolId}
                  id={`tool-${toolId}`}
                  title={`${tool.label} (${tool.shortcut})`}
                  onClick={() => setTool(toolId)}
                  className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150 group ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-glow-sm scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'
                  }`}
                >
                  {tool.icon}
                  {/* Laser tool pulse indicator */}
                  {toolId === TOOLS.LASER && isActive && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  )}
                  {/* Keyboard shortcut tooltip */}
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-50">
                    {tool.label}
                    <span className="ml-1 text-gray-400 font-mono">{tool.shortcut}</span>
                  </span>
                </button>
              );
            })}
            {gi < toolGroups.length - 1 && (
              <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 flex-shrink-0" />
            )}
          </div>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 flex-shrink-0" />

        {/* Shapes Menu */}
        <div ref={shapesMenuRef} className="relative">
          <button
            onClick={() => { setShowShapesMenu(v => !v); setShowColorPicker(false); setShowSizeSlider(false); }}
            title="Shapes"
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${[TOOLS.LINE, TOOLS.RECT, TOOLS.CIRCLE].includes(activeTool) ? 'bg-brand-600 text-white shadow-glow-sm scale-105' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10'}`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          {showShapesMenu && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-1.5 flex gap-1 rounded-2xl shadow-2xl z-50 border border-white/10" style={{ background: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
              {[TOOLS.LINE, TOOLS.RECT, TOOLS.CIRCLE].map(toolId => {
                const tool = TOOL_LIST.find(t => t.id === toolId);
                return (
                  <button
                    key={toolId}
                    title={tool.label}
                    onClick={() => { setTool(toolId); setShowShapesMenu(false); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${activeTool === toolId ? 'bg-brand-500 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    {tool.icon}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 flex-shrink-0" />

        {/* Color + Size section */}
        <div className="flex items-center gap-1" ref={colorPickerRef}>
          {/* Current color swatch — click to open picker */}
          <div className="relative">
            <button
              id="color-swatch-btn"
              onClick={() => { setShowColorPicker(v => !v); setShowSizeSlider(false); }}
              title="Color (click to change)"
              className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white/50 transition-all shadow-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            {/* Color picker popup */}
            {showColorPicker && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-2xl shadow-2xl border border-white/10 z-50"
                style={{ background: 'var(--bg-card)', minWidth: '176px' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {DEFAULT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setShowColorPicker(false); }}
                      className={`w-6 h-6 rounded-full transition-all hover:scale-110 ${
                        color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid rgba(255,255,255,0.3)' : 'none' }}
                    />
                  ))}
                </div>
                {/* Custom color input */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={e => /^#[0-9a-fA-F]{6}$/.test(e.target.value) && setColor(e.target.value)}
                    className="flex-1 text-xs font-mono px-2 py-1 rounded-lg border border-white/10 outline-none"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                    placeholder="#000000"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Size toggle */}
          <div className="relative">
            <button
              id="size-btn"
              onClick={() => { setShowSizeSlider(v => !v); setShowColorPicker(false); }}
              title="Brush size"
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
            >
              <div
                className="rounded-full transition-all"
                style={{
                  width: Math.min(Math.max(currentSize / 3, 4), 18),
                  height: Math.min(Math.max(currentSize / 3, 4), 18),
                  backgroundColor: activeTool === TOOLS.ERASER ? '#9ca3af' : color,
                }}
              />
            </button>
            {showSizeSlider && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 rounded-2xl shadow-2xl glass-dark z-50"
                style={{ width: '160px' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Size</span>
                  <span className="text-xs font-bold text-white">{currentSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="80"
                  value={currentSize}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    if (activeTool === TOOLS.ERASER) setEraserSize(val);
                    else setBrushSize(val);
                  }}
                  className="w-full h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-brand-500"
                />
                {/* Preset sizes */}
                <div className="flex gap-1.5 mt-2 justify-center">
                  {[2, 6, 12, 24, 48].map(s => (
                    <button
                      key={s}
                      onClick={() => activeTool === TOOLS.ERASER ? setEraserSize(s) : setBrushSize(s)}
                      className={`rounded-full flex items-center justify-center transition-all hover:scale-110 ${currentSize === s ? 'ring-2 ring-brand-400' : ''}`}
                      style={{ width: 24, height: 24, backgroundColor: activeTool === TOOLS.ERASER ? '#9ca3af' : color }}
                    >
                      <div className="rounded-full bg-white/80" style={{ width: Math.min(s / 3 + 2, 16), height: Math.min(s / 3 + 2, 16) }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-1 flex-shrink-0" />

        {/* Undo / Redo */}
        <button id="undo-btn" onClick={handleUndo} title="Undo (Ctrl+Z)" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-50">Undo Ctrl+Z</span>
        </button>
        <button id="redo-btn" onClick={handleRedo} title="Redo (Ctrl+Y)" className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all group">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" /></svg>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-50">Redo Ctrl+Y</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-black/10 dark:bg-white/10 mx-1 flex-shrink-0" />

        {/* Image Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
          className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

        {/* Export & More */}
        <div ref={exportRef} className="relative">
          <button
            id="export-btn"
            onClick={() => setShowExport(v => !v)}
            title="Export / More options"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </button>
          {showExport && (
            <div
              className="absolute bottom-full right-0 mb-2 w-44 rounded-2xl shadow-2xl glass-dark overflow-hidden z-50"
            >
              <button onClick={() => { onExportPNG(); setShowExport(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors" style={{ color: 'var(--text-primary)' }}>
                <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Export PNG
              </button>
              <button onClick={() => { onExportPDF(); setShowExport(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors" style={{ color: 'var(--text-primary)' }}>
                <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                Export PDF
              </button>
              <button onClick={() => { onSaveSnapshot(); setShowExport(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors" style={{ color: 'var(--text-primary)' }}>
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                Save Snapshot
              </button>
              <div className="h-px bg-white/10 mx-2" />
              <button onClick={() => { handleClear(); setShowExport(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-red-500/10 transition-colors text-red-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Clear Board
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

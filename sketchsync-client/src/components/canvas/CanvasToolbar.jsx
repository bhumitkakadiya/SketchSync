import { useCanvasStore } from '../../store/canvasStore';
import { TOOLS, TOOL_LIST, DEFAULT_COLORS, BRUSH_SIZES } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';

export default function CanvasToolbar({ socket, sessionId, mainCanvasRef, onExportPNG, onExportPDF, onSaveSnapshot }) {
  const { activeTool, color, brushSize, eraserSize, opacity, isAIOpen, setTool, setColor, setBrushSize, setEraserSize, toggleAI, undo, redo } = useCanvasStore();

  const handleUndo = () => {
    const strokeId = undo();
    if (strokeId && socket) {
      socket.emit(SOCKET_EVENTS.CANVAS_UNDO, { strokeId, sessionId });
    }
  };

  const handleRedo = () => {
    const strokeId = redo();
    if (strokeId && socket) {
      socket.emit(SOCKET_EVENTS.CANVAS_REDO, { strokeId, sessionId });
    }
  };

  const handleClear = () => {
    if (!confirm('Start a new page? This will clear the current board for everyone.')) return;
    const canvas = mainCanvasRef?.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      // Use white fill instead of clearRect for a fresh board
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (socket) {
      socket.emit(SOCKET_EVENTS.CANVAS_CLEAR, { sessionId, timestamp: Date.now() });
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 p-2 glass-dark border-r border-white/[0.06] h-full w-20 overflow-y-auto overflow-x-hidden scrollbar-thin">
      {/* Tools */}
      <div className="grid grid-cols-2 gap-1 w-full">
        {TOOL_LIST.map((tool) => (
          <button
            key={tool.id}
            id={`tool-${tool.id}`}
            title={tool.label}
            onClick={() => setTool(tool.id)}
            className={`group relative w-full aspect-square flex items-center justify-center rounded-xl text-base font-bold transition-all duration-150 ${
              activeTool === tool.id
                ? 'bg-brand-600 text-white shadow-glow-sm'
                : 'text-gray-400 hover:text-white hover:bg-surface-300'
            }`}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-full h-px bg-white/10 my-1" />

      {/* Color palette */}
      <div className="grid grid-cols-2 gap-1 w-full">
        {DEFAULT_COLORS.slice(0, 8).map((c) => (
          <button
            key={c}
            id={`color-${c.slice(1)}`}
            onClick={() => setColor(c)}
            className={`w-full aspect-square rounded-lg transition-all duration-150 ${
              color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-100 scale-110' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Custom color */}
      <div className="w-full" title="Custom color">
        <input
          id="color-picker-custom"
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full h-8 rounded-lg cursor-pointer border border-white/10 bg-transparent"
        />
      </div>

      <div className="w-full h-px bg-white/10 my-1" />

      {/* Brush size slider */}
      <div className="flex flex-col gap-1 w-full items-center py-2" title={`Size: ${activeTool === TOOLS.ERASER ? eraserSize : brushSize}px`}>
        <input 
          type="range" 
          min="1" 
          max="150" 
          value={activeTool === TOOLS.ERASER ? eraserSize : brushSize} 
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (activeTool === TOOLS.ERASER) setEraserSize(val);
            else setBrushSize(val);
          }}
          className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
        />
        <div 
          className="rounded-full mt-2 transition-all shadow-sm border border-black/10" 
          style={{ 
            width: Math.min(activeTool === TOOLS.ERASER ? eraserSize : brushSize, 24), 
            height: Math.min(activeTool === TOOLS.ERASER ? eraserSize : brushSize, 24), 
            backgroundColor: activeTool === TOOLS.ERASER ? '#ffffff' : color 
          }} 
        />
      </div>

      <div className="w-full h-px bg-white/10 my-1" />

      {/* Actions */}
      <div className="flex flex-col gap-1 w-full">
        <button id="undo-btn" onClick={handleUndo} title="Undo (Ctrl+Z)" className="btn-ghost flex-col gap-0 p-2 text-xs rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button id="redo-btn" onClick={handleRedo} title="Redo (Ctrl+Y)" className="btn-ghost flex-col gap-0 p-2 text-xs rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
        <button id="new-page-btn" onClick={handleClear} title="New Page (Clear Board)" className="btn-ghost flex-col gap-0 p-2 text-xs rounded-xl text-blue-400 hover:text-blue-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>

        <div className="w-full h-px bg-white/10 my-1" />

        <button id="export-png-btn" onClick={onExportPNG} title="Export PNG" className="btn-ghost flex-col gap-0 p-2 text-xs rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[9px]">PNG</span>
        </button>
        <button id="export-pdf-btn" onClick={onExportPDF} title="Export PDF" className="btn-ghost flex-col gap-0 p-2 text-xs rounded-xl">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span className="text-[9px]">PDF</span>
        </button>
        <button id="save-snapshot-btn" onClick={onSaveSnapshot} title="Save snapshot" className="btn-ghost flex-col gap-0 p-2 text-xs rounded-xl text-green-400 hover:text-green-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="text-[9px]">Save</span>
        </button>
      </div>
    </div>
  );
}

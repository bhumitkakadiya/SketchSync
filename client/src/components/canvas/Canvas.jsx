import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useRoomStore } from '../../store/roomStore';
import { TOOLS } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import {
  drawPen, drawEraser, drawLine, drawRect, drawCircle, drawText, drawCustomImage,
  clearCanvas, commitPreviewToMain, renderSingleStroke, drawImageOnCanvas
} from '../../utils/canvasUtils';
import { v4 as uuidv4 } from 'uuid';

const Canvas = forwardRef(function Canvas({ socket, sessionId, onStickyAdd, onStrokeComplete }, ref) {
  const mainCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const containerRef = useRef(null);

  const { activeTool, color, brushSize, eraserSize, opacity, pushUndo } = useCanvasStore();
  const { room } = useRoomStore();

  // Expose mainCanvasRef to parent for export
  useImperativeHandle(ref, () => mainCanvasRef.current, []);

  const isDrawing = useRef(false);
  const currentStrokeId = useRef(null);
  const currentPoints = useRef([]);
  const shapeStart = useRef(null);
  const activePointerId = useRef(null);

  // Text input state
  const [textInput, setTextInput] = useState(null);
  const [textValue, setTextValue] = useState('');

  // Local stroke history for undo/redo
  const localStrokes = useRef([]);
  const backgroundImage = useRef(null);

  const redrawMainCanvas = useCallback(() => {
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    clearCanvas(main);

    if (backgroundImage.current) {
      ctx.drawImage(backgroundImage.current, 0, 0, main.width, main.height);
    }

    localStrokes.current.forEach(stroke => {
      if (stroke.undone) return;
      if (stroke.type === 'pen') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize);
      else if (stroke.type === 'highlighter') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize, 0.3);
      else if (stroke.type === 'eraser') drawEraser(ctx, stroke.points, stroke.brushSize);
      else if (['line', 'rect', 'circle'].includes(stroke.type)) {
        const data = { startX: stroke.startX, startY: stroke.startY, endX: stroke.endX, endY: stroke.endY, color: stroke.color, brushSize: stroke.brushSize };
        if (stroke.type === 'line') drawLine(ctx, data);
        else if (stroke.type === 'rect') drawRect(ctx, data);
        else if (stroke.type === 'circle') drawCircle(ctx, data);
      }
      else if (stroke.type === 'text') drawText(ctx, { startX: stroke.startX, startY: stroke.startY, text: stroke.text, fontSize: stroke.fontSize, color: stroke.color });
      else if (stroke.type === 'image') drawCustomImage(ctx, { startX: stroke.startX, startY: stroke.startY, width: stroke.width, height: stroke.height, base64: stroke.base64 });
    });
  }, []);

  const resizeCanvases = useCallback(() => {
    const container = containerRef.current;
    const main = mainCanvasRef.current;
    const preview = previewCanvasRef.current;
    if (!container || !main || !preview) return;

    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    
    main.width = width;
    main.height = height;
    preview.width = width;
    preview.height = height;
    
    redrawMainCanvas();
  }, [redrawMainCanvas]);

  useEffect(() => {
    resizeCanvases();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(resizeCanvases);
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [resizeCanvases]);

  // Set up socket callbacks for remote canvas events
  useEffect(() => {
    if (!socket) return;

    socket.setCallbacks({
      onStrokeEnd: ({ strokeId, finalPoints, undone = false, type, color, brushSize }) => {
        const main = mainCanvasRef.current;
        if (!main) return;
        let stroke = useCanvasStore.getState().remoteStrokes[strokeId];
        
        // Fast-replay fallback: if not in Zustand state yet, reconstruct it
        if (!stroke && type) {
          stroke = { type, color, brushSize, points: finalPoints };
        }
        if (!stroke) return;
        
        const ctx = main.getContext('2d');
        const points = finalPoints || stroke.points;
        if (!undone) {
          if (stroke.type === 'pen') drawPen(ctx, points, stroke.color, stroke.brushSize);
          else if (stroke.type === 'eraser') drawEraser(ctx, points, stroke.brushSize);
          else if (stroke.type === 'highlighter') drawPen(ctx, points, stroke.color, stroke.brushSize, 0.3);
        }
        
        localStrokes.current.push({ strokeId, type: stroke.type, points, color: stroke.color, brushSize: stroke.brushSize, undone });
      },
      onShape: ({ strokeId, type, startX, startY, endX, endY, color: c, brushSize: bs, undone = false, base64, width, height }) => {
        const main = mainCanvasRef.current;
        if (!main) return;
        const ctx = main.getContext('2d');
        const data = { startX, startY, endX, endY, color: c, brushSize: bs, opacity: 1, base64, width, height };
        if (!undone) {
          if (type === 'line') drawLine(ctx, data);
          else if (type === 'rect') drawRect(ctx, data);
          else if (type === 'circle') drawCircle(ctx, data);
          else if (type === 'image') drawCustomImage(ctx, data);
        }
        
        localStrokes.current.push({ strokeId, type, startX, startY, endX, endY, color: c, brushSize: bs, undone, base64, width, height });
      },
      onText: ({ strokeId, x, y, text, fontSize, color: c, undone = false }) => {
        const main = mainCanvasRef.current;
        if (!main) return;
        const ctx = main.getContext('2d');
        if (!undone) {
          drawText(ctx, { startX: x, startY: y, text, fontSize, color: c });
        }
        localStrokes.current.push({ strokeId, type: 'text', startX: x, startY: y, text, fontSize, color: c, undone });
      },
      onUndo: ({ strokeId }) => {
        const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
        if (stroke) stroke.undone = true;
        redrawMainCanvas();
      },
      onRedo: ({ strokeId }) => {
        const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
        if (stroke) stroke.undone = false;
        redrawMainCanvas();
      },
      onClear: () => {
        localStrokes.current = [];
        backgroundImage.current = null;
        clearCanvas(mainCanvasRef.current);
      },
      onStateSync: (base64) => {
        const img = new Image();
        img.onload = () => {
          backgroundImage.current = img;
          redrawMainCanvas();
        };
        img.src = `data:image/png;base64,${base64}`;
      },
      onBulkLoad: ({ strokes }) => {
        const main = mainCanvasRef.current;
        if (!main || !strokes || !strokes.length) return;
        const ctx = main.getContext('2d');
        strokes.forEach(stroke => {
          if (stroke.type === 'text') {
             if (!stroke.undone) drawText(ctx, { startX: stroke.data.startX, startY: stroke.data.startY, text: stroke.data.text, fontSize: stroke.data.fontSize, color: stroke.data.color });
             localStrokes.current.push({ strokeId: stroke.strokeId, type: 'text', startX: stroke.data.startX, startY: stroke.data.startY, text: stroke.data.text, fontSize: stroke.data.fontSize, color: stroke.data.color, undone: stroke.undone });
          } else if (['line', 'rect', 'circle'].includes(stroke.type)) {
             const data = { startX: stroke.data.startX, startY: stroke.data.startY, endX: stroke.data.endX, endY: stroke.data.endY, color: stroke.data.color, brushSize: stroke.data.brushSize, opacity: 1 };
             if (!stroke.undone) {
               if (stroke.type === 'line') drawLine(ctx, data);
               else if (stroke.type === 'rect') drawRect(ctx, data);
               else if (stroke.type === 'circle') drawCircle(ctx, data);
             }
             localStrokes.current.push({ strokeId: stroke.strokeId, type: stroke.type, ...data, undone: stroke.undone });
          } else if (stroke.type === 'clear') {
             localStrokes.current = [];
             clearCanvas(main);
          } else if (stroke.data && stroke.data.points) {
             if (!stroke.undone) {
               if (stroke.type === 'pen') drawPen(ctx, stroke.data.points, stroke.data.color, stroke.data.brushSize);
               else if (stroke.type === 'eraser') drawEraser(ctx, stroke.data.points, stroke.data.brushSize);
               else if (stroke.type === 'highlighter') drawPen(ctx, stroke.data.points, stroke.data.color, stroke.data.brushSize, 0.3);
             }
             localStrokes.current.push({ strokeId: stroke.strokeId, type: stroke.type, points: stroke.data.points, color: stroke.data.color, brushSize: stroke.data.brushSize, undone: stroke.undone });
          }
        });
      },
    });
  }, [socket]);

  // Handle local image addition
  useEffect(() => {
    const handleAddImage = (e) => {
      const stroke = e.detail;
      const main = mainCanvasRef.current;
      if (!main) return;
      const ctx = main.getContext('2d');
      drawCustomImage(ctx, stroke);
      localStrokes.current.push({ ...stroke, undone: false });
      pushUndo(stroke.strokeId);
      if (onStrokeComplete) onStrokeComplete();
    };
    window.addEventListener('canvas:add-image', handleAddImage);
    return () => window.removeEventListener('canvas:add-image', handleAddImage);
  }, [pushUndo, onStrokeComplete]);

  // Unified redraw for local and remote strokes on preview canvas
  const redrawPreview = useCallback(() => {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);

    const mainCtx = mainCanvasRef.current?.getContext('2d');

    // Draw remote strokes
    const remoteStrokes = useCanvasStore.getState().remoteStrokes;
    Object.values(remoteStrokes).forEach((stroke) => {
      if (stroke.points?.length > 1) {
        if (stroke.type === 'pen') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize);
        else if (stroke.type === 'eraser' && mainCtx) drawEraser(mainCtx, stroke.points, stroke.brushSize);
      }
    });

    // Draw local stroke
    if (isDrawing.current && currentPoints.current.length > 1) {
      if (activeTool === TOOLS.PEN) drawPen(ctx, currentPoints.current, color, brushSize, opacity);
      else if (activeTool === TOOLS.HIGHLIGHTER) drawPen(ctx, currentPoints.current, color, Math.max(brushSize, 16), 0.3);
      else if (activeTool === TOOLS.ERASER && mainCtx) drawEraser(mainCtx, currentPoints.current, eraserSize);
      else if (activeTool === TOOLS.LINE) drawLine(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: currentPoints.current[currentPoints.current.length-1].x, endY: currentPoints.current[currentPoints.current.length-1].y, color, brushSize });
      else if (activeTool === TOOLS.RECT) drawRect(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: currentPoints.current[currentPoints.current.length-1].x, endY: currentPoints.current[currentPoints.current.length-1].y, color, brushSize });
      else if (activeTool === TOOLS.CIRCLE) drawCircle(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: currentPoints.current[currentPoints.current.length-1].x, endY: currentPoints.current[currentPoints.current.length-1].y, color, brushSize });
    }
  }, [activeTool, color, brushSize, eraserSize, opacity]);

  const remoteStrokes = useCanvasStore((s) => s.remoteStrokes);
  useEffect(() => {
    redrawPreview();
  }, [remoteStrokes, redrawPreview]);

  // ===== Pointer event handlers =====
  const getPos = (e) => {
    const rect = mainCanvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const isInGap = (y) => {
    const main = mainCanvasRef.current;
    if (!main) return false;
    // The width of the canvas is the width of the page
    const pageHeight = main.width * (9 / 16);
    const gapHeight = 32; // 2rem (gap-8)
    const cycleHeight = pageHeight + gapHeight;
    const localY = y % cycleHeight;
    return localY > pageHeight;
  };

  const getPageIndex = (y) => {
    const main = mainCanvasRef.current;
    if (!main) return 0;
    const pageHeight = main.width * (9 / 16);
    const cycleHeight = pageHeight + 32;
    return Math.floor(y / cycleHeight);
  };

  const activePageIndex = useRef(0);

  const onPointerDown = useCallback((e) => {
    if (isDrawing.current) return; // Prevent multi-touch zig-zags
    
    const pos = getPos(e);
    if (isInGap(pos.y)) return; // Prevent drawing in gaps
    activePageIndex.current = getPageIndex(pos.y);
    
    if (activeTool === TOOLS.TEXT) {
      setTextInput(pos);
      setTextValue('');
      return;
    }

    if (activeTool === TOOLS.STICKY_NOTE) {
      // Sticky note placement is handled by parent via onStickyAdd prop
      if (onStickyAdd) onStickyAdd(pos);
      return;
    }

    if (activeTool === TOOLS.SELECT || activeTool === TOOLS.LASER) {
      // These tools don't draw on the canvas
      return;
    }

    activePointerId.current = e.pointerId;
    if (e.target.setPointerCapture) {
      e.target.setPointerCapture(e.pointerId);
    }

    isDrawing.current = true;
    currentStrokeId.current = uuidv4();
    currentPoints.current = [];

    currentPoints.current.push(pos);
    shapeStart.current = pos;

    socket?.emit(SOCKET_EVENTS.CANVAS_STROKE_START, {
      strokeId: currentStrokeId.current,
      type: activeTool,
      color, size: activeTool === TOOLS.ERASER ? eraserSize : (activeTool === TOOLS.HIGHLIGHTER ? Math.max(brushSize, 16) : brushSize),
      x: pos.x, y: pos.y,
      sessionId,
    });
  }, [activeTool, color, brushSize, eraserSize, socket, sessionId]);

  const onPointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') e.preventDefault();
    if (e.pointerId !== activePointerId.current) return;

    const pos = getPos(e);

    // Stop drawing if they drag into the gap or cross into another page!
    if (isInGap(pos.y) || (isDrawing.current && getPageIndex(pos.y) !== activePageIndex.current)) {
      if (isDrawing.current) {
        onPointerUp(e);
      }
      return;
    }

    socket?.emit(SOCKET_EVENTS.CURSOR_MOVE, { x: pos.x, y: pos.y, roomId: room?._id, tool: activeTool });

    if (!isDrawing.current) return;
    currentPoints.current.push(pos);

    redrawPreview();

    socket?.emit(SOCKET_EVENTS.CANVAS_STROKE_MOVE, {
      strokeId: currentStrokeId.current,
      x: pos.x, y: pos.y,
      timestamp: Date.now(),
    });
  }, [room, redrawPreview, socket]);

  const onPointerUp = useCallback((e) => {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    
    if (e.target.releasePointerCapture) {
      e.target.releasePointerCapture(e.pointerId);
    }
    
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const preview = previewCanvasRef.current;
    const main = mainCanvasRef.current;
    if (!main || !preview) return;

    const ctx = main.getContext('2d');
    const pos = currentPoints.current[currentPoints.current.length - 1] || shapeStart.current;

    if (activeTool === TOOLS.PEN) {
      drawPen(ctx, currentPoints.current, color, brushSize, opacity);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'pen', points: [...currentPoints.current], color, brushSize, undone: false });
    } else if (activeTool === TOOLS.HIGHLIGHTER) {
      const hSize = Math.max(brushSize, 16);
      drawPen(ctx, currentPoints.current, color, hSize, 0.3);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'highlighter', points: [...currentPoints.current], color, brushSize: hSize, undone: false });
    } else if (activeTool === TOOLS.ERASER) {
      drawEraser(ctx, currentPoints.current, eraserSize);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'eraser', points: [...currentPoints.current], brushSize: eraserSize, undone: false });
    } else if (activeTool === TOOLS.LINE && shapeStart.current) {
      drawLine(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: pos.x, endY: pos.y, color, brushSize });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'line', startX: shapeStart.current.x, startY: shapeStart.current.y, endX: pos.x, endY: pos.y, color, brushSize, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, {
        strokeId: currentStrokeId.current, type: 'line',
        startX: shapeStart.current.x, startY: shapeStart.current.y,
        endX: pos.x, endY: pos.y, color, brushSize, sessionId,
      });
    } else if (activeTool === TOOLS.RECT && shapeStart.current) {
      drawRect(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: pos.x, endY: pos.y, color, brushSize });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'rect', startX: shapeStart.current.x, startY: shapeStart.current.y, endX: pos.x, endY: pos.y, color, brushSize, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, {
        strokeId: currentStrokeId.current, type: 'rect',
        startX: shapeStart.current.x, startY: shapeStart.current.y,
        endX: pos.x, endY: pos.y, color, brushSize, sessionId,
      });
    } else if (activeTool === TOOLS.CIRCLE && shapeStart.current) {
      drawCircle(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: pos.x, endY: pos.y, color, brushSize });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'circle', startX: shapeStart.current.x, startY: shapeStart.current.y, endX: pos.x, endY: pos.y, color, brushSize, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, {
        strokeId: currentStrokeId.current, type: 'circle',
        startX: shapeStart.current.x, startY: shapeStart.current.y,
        endX: pos.x, endY: pos.y, color, brushSize, sessionId,
      });
    }

    clearCanvas(preview);
    pushUndo(currentStrokeId.current);
    if (onStrokeComplete) onStrokeComplete();

    if ([TOOLS.PEN, TOOLS.ERASER, TOOLS.HIGHLIGHTER].includes(activeTool)) {
      socket?.emit(SOCKET_EVENTS.CANVAS_STROKE_END, {
        strokeId: currentStrokeId.current,
        points: currentPoints.current,
        metadata: { color, brushSize: activeTool === TOOLS.ERASER ? eraserSize : (activeTool === TOOLS.HIGHLIGHTER ? Math.max(brushSize, 16) : brushSize), opacity },
      });
    }

    currentStrokeId.current = null;
    currentPoints.current = [];
    shapeStart.current = null;
  }, [activeTool, color, brushSize, eraserSize, opacity, socket, sessionId, pushUndo, onStrokeComplete]);

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim() || !textInput) return;
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    const strokeId = uuidv4();
    drawText(ctx, { startX: textInput.x, startY: textInput.y, text: textValue, fontSize: 18, color });
    localStrokes.current.push({ strokeId, type: 'text', startX: textInput.x, startY: textInput.y, text: textValue, fontSize: 18, color, undone: false });
    pushUndo(strokeId);
    socket?.emit(SOCKET_EVENTS.CANVAS_TEXT, {
      strokeId, x: textInput.x, y: textInput.y,
      text: textValue, fontSize: 18, color, sessionId,
    });
    if (onStrokeComplete) onStrokeComplete();
    setTextInput(null);
    setTextValue('');
  }, [textInput, textValue, color, socket, sessionId, pushUndo, onStrokeComplete]);

  const getCursor = () => {
    if (activeTool === TOOLS.SELECT) return 'default';
    if (activeTool === TOOLS.TEXT) return 'text';
    if (activeTool === TOOLS.PEN) {
      const strokeHex = color.replace('#', '');
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${strokeHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
      const encodedSvg = encodeURIComponent(svgString);
      return `url("data:image/svg+xml;charset=utf-8,${encodedSvg}") 2 22, crosshair`;
    }
    const size = Math.max(activeTool === TOOLS.ERASER ? eraserSize : brushSize, 4);
    const strokeHex = activeTool === TOOLS.ERASER ? '999999' : color.replace('#', '');
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="#${strokeHex}" stroke-width="1" opacity="1.0"/>
    </svg>`;
    const encodedSvg = encodeURIComponent(svgString);
    return `url("data:image/svg+xml;charset=utf-8,${encodedSvg}") ${size/2} ${size/2}, crosshair`;
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ cursor: getCursor() }}>
      {/* Main canvas — committed strokes */}
      <canvas
        ref={mainCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />
      {/* Preview canvas — current stroke being drawn */}
      <canvas
        ref={previewCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 2, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />

      {/* Text input overlay */}
      {textInput && (
        <div
          className="absolute z-10"
          style={{ left: textInput.x, top: textInput.y - 4 }}
        >
          <input
            autoFocus
            type="text"
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextSubmit();
              if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
            }}
            onBlur={handleTextSubmit}
            className="bg-transparent border-none outline-none text-lg font-sans"
            style={{ color, minWidth: '4px' }}
            placeholder="Type here..."
          />
        </div>
      )}
    </div>
  );
});

export default Canvas;

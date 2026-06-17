import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useRoomStore } from '../../store/roomStore';
import { TOOLS } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import {
  drawPen, drawEraser, drawLine, drawRect, drawCircle, drawText, drawCustomImage, drawArrow,
  drawTriangle, drawDiamond, drawStar,
  clearCanvas, commitPreviewToMain, renderSingleStroke, drawImageOnCanvas
} from '../../utils/canvasUtils';
import { v4 as uuidv4 } from 'uuid';
import StickyNote from './StickyNote';

const Canvas = forwardRef(function Canvas({ socket, sessionId, aspectRatio = '16/9', onStrokeComplete, readOnly = false }, ref) {
  const mainCanvasRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const [, forceUpdate] = useState({});
  const [hasDrawn, setHasDrawn] = useState(false);

  const {
    activeTool, color, fillColor, brushSize, eraserSize, opacity, strokeStyle,
    fontSize, fontFamily, pushUndo, setSelectedStrokeId
  } = useCanvasStore();
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
  
  // Laser Pointer State
  const laserPoints = useRef([]);

  // Selection & Transformation State
  const selectedStrokeIdRef = useRef(null);
  const resizeHandle = useRef(null);
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const initialStrokeState = useRef(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState(null);
  const [clipboard, setClipboard] = useState(null);

  const setSelected = useCallback((id) => {
    selectedStrokeIdRef.current = id;
    setSelectedStrokeId(id);
  }, [setSelectedStrokeId]);

  const redrawMainCanvas = useCallback(() => {
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    clearCanvas(main);

    ctx.save();
    try {
      const [wRatio, hRatio] = aspectRatio.split('/').map(Number);
      const pageHeight = main.width * (hRatio / wRatio);
      const cycleHeight = pageHeight + 80; // gap 48 + label 32
      ctx.beginPath();
      for (let y = 0; y <= main.height + cycleHeight; y += cycleHeight) {
        ctx.rect(0, y, main.width, pageHeight);
      }
      ctx.clip();
    } catch (e) { console.error(e); }

    if (backgroundImage.current) {
      ctx.drawImage(backgroundImage.current, 0, 0, main.width, main.height);
    }

    localStrokes.current.forEach(stroke => {
      if (stroke.undone) return;
      if (stroke.type === 'pen') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize);
      else if (stroke.type === 'highlighter') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize, 0.3);
      else if (stroke.type === 'eraser') drawEraser(ctx, stroke.points, stroke.brushSize);
      else if (['line', 'rect', 'circle', 'arrow'].includes(stroke.type)) {
        const data = {
          startX: stroke.startX, startY: stroke.startY,
          endX: stroke.endX, endY: stroke.endY,
          color: stroke.color, fillColor: stroke.fillColor,
          brushSize: stroke.brushSize, strokeStyle: stroke.strokeStyle,
          cornerRadius: stroke.cornerRadius,
        };
        if (stroke.type === 'line') drawLine(ctx, data);
        else if (stroke.type === 'arrow') drawArrow(ctx, data);
        else if (stroke.type === 'rect') drawRect(ctx, data);
        else if (stroke.type === 'circle') drawCircle(ctx, data);
      }
      else if (stroke.type === 'text') {
        drawText(ctx, {
          startX: stroke.startX, startY: stroke.startY,
          text: stroke.text, fontSize: stroke.fontSize,
          fontFamily: stroke.fontFamily, color: stroke.color,
          bold: stroke.bold, italic: stroke.italic,
        });
      }
      else if (stroke.type === 'image') {
        drawCustomImage(ctx, {
          startX: stroke.startX, startY: stroke.startY,
          width: stroke.width, height: stroke.height,
          base64: stroke.base64, opacity: stroke.opacity,
          _imgCache: stroke._imgCache,
        });
      }
    });

    ctx.restore();
  }, [aspectRatio]);

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
      onShape: (data) => {
        localStrokes.current.push(data);
        if (data.type === 'sticky') forceUpdate({});
        else redrawMainCanvas();
      },
      onText: ({ strokeId, x, y, text, fontSize, fontFamily, color: c, undone = false }) => {
        const main = mainCanvasRef.current;
        if (!main) return;
        const ctx = main.getContext('2d');
        if (!undone) {
          drawText(ctx, { startX: x, startY: y, text, fontSize, fontFamily, color: c });
        }
        localStrokes.current.push({ strokeId, type: 'text', startX: x, startY: y, text, fontSize, fontFamily, color: c, undone });
      },
      onUndo: ({ strokeId }) => {
        // BUG FIX: undo sets undone = TRUE (was backwards)
        const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
        if (stroke) stroke.undone = true;
        redrawMainCanvas();
      },
      onRedo: ({ strokeId }) => {
        // BUG FIX: redo sets undone = FALSE
        const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
        if (stroke) stroke.undone = false;
        redrawMainCanvas();
      },
      onUpdateShape: ({ strokeId, startX, startY, endX, endY, width, height, text, color, fillColor }) => {
        const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
        if (stroke) {
          if (startX !== undefined) stroke.startX = startX;
          if (startY !== undefined) stroke.startY = startY;
          if (endX !== undefined) stroke.endX = endX;
          if (endY !== undefined) stroke.endY = endY;
          if (width !== undefined) stroke.width = width;
          if (height !== undefined) stroke.height = height;
          if (text !== undefined) stroke.text = text;
          if (color !== undefined) stroke.color = color;
          if (fillColor !== undefined) stroke.fillColor = fillColor;
          
          if (stroke.type !== 'sticky') {
            redrawMainCanvas();
            if (selectedStrokeIdRef.current === strokeId) redrawPreview();
          } else {
            forceUpdate({});
          }
        }
      },
      onClear: () => {
        localStrokes.current = [];
        backgroundImage.current = null;
        redrawMainCanvas();
        forceUpdate({});
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
        localStrokes.current = strokes;
        const bg = strokes.find(s => s.type === 'image' && s.isBackground);
        if (bg) backgroundImage.current = bg;
        redrawMainCanvas();
        forceUpdate({});
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
      setHasDrawn(true);
    };
    window.addEventListener('canvas:add-image', handleAddImage);
    return () => window.removeEventListener('canvas:add-image', handleAddImage);
  }, [pushUndo, onStrokeComplete]);

  // Handle layer arrangement (Bring Forward / Send Backward)
  useEffect(() => {
    const handleArrange = (e) => {
      const action = e.detail; // 'forward', 'backward', 'front', 'back'
      if (!selectedStrokeIdRef.current) return;
      
      const id = selectedStrokeIdRef.current;
      const idx = localStrokes.current.findIndex(s => s.strokeId === id);
      if (idx === -1) return;

      const stroke = localStrokes.current.splice(idx, 1)[0];
      
      if (action === 'forward') {
        localStrokes.current.splice(Math.min(idx + 1, localStrokes.current.length), 0, stroke);
      } else if (action === 'backward') {
        localStrokes.current.splice(Math.max(idx - 1, 0), 0, stroke);
      } else if (action === 'front') {
        localStrokes.current.push(stroke);
      } else if (action === 'back') {
        localStrokes.current.unshift(stroke);
      }

      redrawMainCanvas();
      
      // Optionally broadcast this so other clients see the z-index change
      // Currently our socket doesn't have a direct "reorder" event, but we can emit a save state later
      if (onStrokeComplete) onStrokeComplete();
    };
    window.addEventListener('canvas:arrange', handleArrange);

    const handleDuplicate = () => {
      if (!selectedStrokeIdRef.current) return;
      const src = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (src) {
        const newId = uuidv4();
        const clone = { ...src, strokeId: newId, startX: (src.startX || 0) + 20, startY: (src.startY || 0) + 20 };
        if (clone.endX !== undefined) { clone.endX = clone.endX + 20; clone.endY = clone.endY + 20; }
        localStrokes.current.push(clone);
        pushUndo(newId);
        socket?.emit('CANVAS:SHAPE', { ...clone, sessionId });
        redrawMainCanvas();
        setSelected(newId);
        forceUpdate({});
      }
    };
    
    const handleDelete = () => {
      if (!selectedStrokeIdRef.current) return;
      const id = selectedStrokeIdRef.current;
      const idx = localStrokes.current.findIndex(s => s.strokeId === id);
      if (idx !== -1) {
        localStrokes.current.splice(idx, 1);
        redrawMainCanvas();
        setSelected(null);
        forceUpdate({});
        socket?.emit('CANVAS:UNDO', { strokeId: id, sessionId });
      }
    };

    window.addEventListener('canvas:duplicate-selected', handleDuplicate);
    window.addEventListener('canvas:delete-selected', handleDelete);

    return () => {
      window.removeEventListener('canvas:arrange', handleArrange);
      window.removeEventListener('canvas:duplicate-selected', handleDuplicate);
      window.removeEventListener('canvas:delete-selected', handleDelete);
    };
  }, [redrawMainCanvas, onStrokeComplete, pushUndo, socket, sessionId, setSelected]);

  // Keyboard shortcuts for Delete, Duplicate, Escape, Ctrl+A
  useEffect(() => {
    const handleKey = (e) => {
      // Skip if user is typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // Delete / Backspace — remove selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStrokeIdRef.current) {
        e.preventDefault();
        const id = selectedStrokeIdRef.current;
        const idx = localStrokes.current.findIndex(s => s.strokeId === id);
        if (idx !== -1) {
          localStrokes.current.splice(idx, 1);
          redrawMainCanvas();
          setSelected(null);
          forceUpdate({});
          socket?.emit('CANVAS:UNDO', { strokeId: id, sessionId });
        }
        return;
      }

      // Ctrl+D — duplicate selected
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedStrokeIdRef.current) {
        e.preventDefault();
        const src = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
        if (src) {
          const newId = uuidv4();
          const clone = { ...src, strokeId: newId, startX: (src.startX || 0) + 20, startY: (src.startY || 0) + 20 };
          if (clone.endX !== undefined) { clone.endX = clone.endX + 20; clone.endY = clone.endY + 20; }
          localStrokes.current.push(clone);
          pushUndo(newId);
          socket?.emit('CANVAS:SHAPE', { ...clone, sessionId });
          redrawMainCanvas();
          setSelected(newId);
          forceUpdate({});
        }
        return;
      }

      // Escape — deselect
      if (e.key === 'Escape') {
        setSelected(null);
        setTextInput(null);
        setTextValue('');
        redrawPreview();
        return;
      }

      // Ctrl+A — select all (future: multi-select; for now just a hint)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        // TODO: multi-select
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [socket, sessionId, pushUndo, setSelected]);

  // Unified redraw for local and remote strokes on preview canvas
  const redrawPreview = useCallback(() => {
    const preview = previewCanvasRef.current;
    if (!preview) return;
    const ctx = preview.getContext('2d');
    ctx.clearRect(0, 0, preview.width, preview.height);

    ctx.save();
    try {
      const [wRatio, hRatio] = aspectRatio.split('/').map(Number);
      const pageHeight = preview.width * (hRatio / wRatio);
      const cycleHeight = pageHeight + 80; // gap 48 + label 32
      ctx.beginPath();
      for (let y = 0; y <= preview.height + cycleHeight; y += cycleHeight) {
        ctx.rect(0, y, preview.width, pageHeight);
      }
      ctx.clip();
    } catch (e) { console.error(e); }

    const mainCtx = mainCanvasRef.current?.getContext('2d');

    // Draw remote strokes
    const remoteStrokes = useCanvasStore.getState().remoteStrokes;
    Object.values(remoteStrokes).forEach((stroke) => {
      if (stroke.points?.length > 1) {
        if (stroke.type === 'pen') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize);
        else if (stroke.type === 'eraser' && mainCtx) drawEraser(mainCtx, stroke.points, stroke.brushSize);
      }
    });

    // Draw local stroke preview
    if (isDrawing.current && currentPoints.current.length > 1 && activeTool !== TOOLS.LASER && activeTool !== TOOLS.SELECT) {
      const endPt = currentPoints.current[currentPoints.current.length - 1];
      if (activeTool === TOOLS.PEN) drawPen(ctx, currentPoints.current, color, brushSize, opacity);
      else if (activeTool === TOOLS.MARKER) drawPen(ctx, currentPoints.current, color, brushSize * 2, opacity || 0.8);
      else if (activeTool === TOOLS.HIGHLIGHTER) drawPen(ctx, currentPoints.current, color, Math.max(brushSize, 16), 0.3);
      else if (activeTool === TOOLS.ERASER && mainCtx) drawEraser(mainCtx, currentPoints.current, eraserSize);
      else if (activeTool === TOOLS.LINE) drawLine(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, brushSize, strokeStyle });
      else if (activeTool === TOOLS.ARROW) drawArrow(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, brushSize });
      else if (activeTool === TOOLS.RECT) drawRect(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
      else if (activeTool === TOOLS.CIRCLE) drawCircle(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
      else if (activeTool === TOOLS.TRIANGLE) drawTriangle(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
      else if (activeTool === TOOLS.DIAMOND) drawDiamond(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
      else if (activeTool === TOOLS.STAR) drawStar(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
    }

    // Draw Laser Points
    if (laserPoints.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      
      const now = Date.now();
      for (let i = 1; i < laserPoints.current.length; i++) {
        const p1 = laserPoints.current[i - 1];
        const p2 = laserPoints.current[i];
        const age = now - p2.timestamp;
        const op = Math.max(0, 1 - age / 500);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineWidth = 6 * op + 2;
        ctx.globalAlpha = op;
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw Selection Bounding Box
    if (selectedStrokeIdRef.current) {
      const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (stroke && ['image', 'rect', 'circle', 'line', 'arrow'].includes(stroke.type)) {
        let x, y, w, h;
        if (stroke.type === 'image') {
          x = stroke.startX; y = stroke.startY; w = stroke.width; h = stroke.height;
        } else {
          x = Math.min(stroke.startX, stroke.endX);
          y = Math.min(stroke.startY, stroke.endY);
          w = Math.abs(stroke.endX - stroke.startX);
          h = Math.abs(stroke.endY - stroke.startY);
        }
        
        ctx.save();
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        ctx.setLineDash([]);
        
        // 8 handles: corners + midpoints
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        const handles = [
          [x - 4, y - 4], [x + w/2, y - 4], [x + w + 4, y - 4],
          [x + w + 4, y + h/2],
          [x + w + 4, y + h + 4], [x + w/2, y + h + 4], [x - 4, y + h + 4],
          [x - 4, y + h/2],
        ];
        handles.forEach(([hx, hy]) => {
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      }
    }
    
    ctx.restore();
  }, [activeTool, color, fillColor, brushSize, eraserSize, opacity, strokeStyle, aspectRatio]);

  const remoteStrokes = useCanvasStore((s) => s.remoteStrokes);
  useEffect(() => {
    redrawPreview();
  }, [remoteStrokes, redrawPreview]);

  const updateLaser = useCallback(() => {
    const now = Date.now();
    let changed = false;
    while (laserPoints.current.length > 0 && now - laserPoints.current[0].timestamp > 500) {
      laserPoints.current.shift();
      changed = true;
    }
    if (changed || laserPoints.current.length > 0) {
      redrawPreview();
    }
  }, [redrawPreview]);

  useEffect(() => {
    let afId;
    const loop = () => {
      updateLaser();
      afId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(afId);
  }, [updateLaser]);

  const handleStickyUpdate = useCallback((strokeId, updates) => {
    const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
    if (stroke) {
      Object.assign(stroke, updates);
      socket?.emit('CANVAS:UPDATE_SHAPE', { strokeId, ...updates });
      forceUpdate({});
    }
  }, [socket]);

  const handleStickyRemove = useCallback((strokeId) => {
    socket?.emit('CANVAS:UNDO', { strokeId, sessionId });
    const idx = localStrokes.current.findIndex(s => s.strokeId === strokeId);
    if (idx !== -1) {
      localStrokes.current.splice(idx, 1);
      forceUpdate({});
    }
  }, [socket, sessionId]);

  // ===== Pointer event handlers =====
  const prevAspectRatioRef = useRef(aspectRatio);

  useEffect(() => {
    if (prevAspectRatioRef.current !== aspectRatio) {
      const main = mainCanvasRef.current;
      if (main) {
        try {
          const [oldW, oldH] = prevAspectRatioRef.current.split('/').map(Number);
          const oldPageHeight = main.width * (oldH / oldW);
          const oldCycleHeight = oldPageHeight + PAGE_GAP;

          const [newW, newH] = aspectRatio.split('/').map(Number);
          const newPageHeight = main.width * (newH / newW);
          const deltaHeight = newPageHeight - oldPageHeight;

          let changed = false;
          localStrokes.current.forEach(stroke => {
            let firstY = 0;
            if (stroke.points && stroke.points.length > 0) firstY = stroke.points[0].y;
            else if (stroke.startY !== undefined) firstY = Math.min(stroke.startY, stroke.endY || stroke.startY);
            else if (stroke.y !== undefined) firstY = stroke.y;
            else return;

            const pageIndex = Math.floor(firstY / oldCycleHeight);
            if (pageIndex > 0) {
              const shift = pageIndex * deltaHeight;
              if (stroke.points) {
                stroke.points.forEach(p => { p.y += shift; });
              }
              if (stroke.startY !== undefined) stroke.startY += shift;
              if (stroke.endY !== undefined) stroke.endY += shift;
              if (stroke.y !== undefined) stroke.y += shift;
              changed = true;
              
              // Emit updated position to others since we moved it
              socket?.emit('CANVAS:UPDATE_SHAPE', stroke);
            }
          });

          if (changed) {
            redrawMainCanvas();
            forceUpdate({});
          }
        } catch (err) {
          console.error("Failed to translate strokes on aspect ratio change", err);
        }
      }
      prevAspectRatioRef.current = aspectRatio;
    }
  }, [aspectRatio, redrawMainCanvas, socket]);

  const getPos = useCallback((e) => {
    const rect = previewCanvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  // Gap between pages + label height
  const PAGE_GAP = 80;

  const isInGap = useCallback((y) => {
    const main = mainCanvasRef.current;
    if (!main) return false;
    const [wRatio, hRatio] = aspectRatio.split('/').map(Number);
    const pageHeight = main.width * (hRatio / wRatio);
    const cycleHeight = pageHeight + PAGE_GAP;
    const localY = y % cycleHeight;
    return localY > pageHeight;
  }, [aspectRatio]);

  const getPageIndex = useCallback((y) => {
    const main = mainCanvasRef.current;
    if (!main) return 0;
    const [wRatio, hRatio] = aspectRatio.split('/').map(Number);
    const pageHeight = main.width * (hRatio / wRatio);
    const cycleHeight = pageHeight + PAGE_GAP;
    return Math.floor(y / cycleHeight);
  }, [aspectRatio]);

  const activePageIndex = useRef(0);

  const onPointerDown = useCallback((e) => {
    if (readOnly) return;
    if (isDrawing.current) return;
    // Close context menu
    setContextMenu(null);
    
    const pos = getPos(e);
    if (isInGap(pos.y)) return;
    activePageIndex.current = getPageIndex(pos.y);

    if (activeTool === TOOLS.SELECT) {
      // Check for resize handles on currently selected shape
      if (selectedStrokeIdRef.current) {
        const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
        if (stroke && ['image', 'rect', 'circle', 'line', 'arrow'].includes(stroke.type)) {
          let x, y, w, h;
          if (stroke.type === 'image') {
            x = stroke.startX; y = stroke.startY; w = stroke.width; h = stroke.height;
          } else {
            x = Math.min(stroke.startX, stroke.endX);
            y = Math.min(stroke.startY, stroke.endY);
            w = Math.abs(stroke.endX - stroke.startX);
            h = Math.abs(stroke.endY - stroke.startY);
          }
          const handles = {
            nw: [x - 4, y - 4], n: [x + w/2, y - 4], ne: [x + w + 4, y - 4],
            e: [x + w + 4, y + h/2],
            se: [x + w + 4, y + h + 4], s: [x + w/2, y + h + 4], sw: [x - 4, y + h + 4],
            w: [x - 4, y + h/2],
          };
          for (const [key, [hx, hy]] of Object.entries(handles)) {
            const dx = pos.x - hx;
            const dy = pos.y - hy;
            if (dx * dx + dy * dy <= 144) {
              resizeHandle.current = key;
              initialStrokeState.current = { x, y, w, h, clickX: pos.x, clickY: pos.y };
              activePointerId.current = e.pointerId;
              if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
              isDrawing.current = true;
              return;
            }
          }
        }
      }

      // Hit test for selectable strokes
      let hitId = null;
      for (let i = localStrokes.current.length - 1; i >= 0; i--) {
        const stroke = localStrokes.current[i];
        if (stroke.undone) continue;
        if (['image', 'rect', 'circle', 'line', 'arrow'].includes(stroke.type)) {
          let x, y, w, h;
          if (stroke.type === 'image') {
            x = stroke.startX; y = stroke.startY; w = stroke.width; h = stroke.height;
          } else {
            x = Math.min(stroke.startX, stroke.endX);
            y = Math.min(stroke.startY, stroke.endY);
            w = Math.abs(stroke.endX - stroke.startX);
            h = Math.abs(stroke.endY - stroke.startY);
          }
          if (pos.x >= x - 6 && pos.x <= x + w + 6 && pos.y >= y - 6 && pos.y <= y + h + 6) {
            hitId = stroke.strokeId;
            dragStartOffset.current = {
              x: pos.x - stroke.startX,
              y: pos.y - stroke.startY,
              x2: stroke.endX !== undefined ? pos.x - stroke.endX : 0,
              y2: stroke.endY !== undefined ? pos.y - stroke.endY : 0,
            };
            break;
          }
        }
      }
      // BUG FIX: deselect if clicking empty space
      setSelected(hitId);
      if (hitId) {
        activePointerId.current = e.pointerId;
        if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
        isDrawing.current = true;
      }
      redrawPreview();
      return;
    }

    if (activeTool === TOOLS.TEXT) {
      setTextInput(pos);
      setTextValue('');
      return;
    }

    if (activeTool === TOOLS.STICKY_NOTE) {
      const strokeId = uuidv4();
      const stickyData = {
        type: 'sticky',
        startX: pos.x,
        startY: pos.y,
        text: '',
        color: '#FEF08A',
        strokeId,
        sessionId,
      };
      localStrokes.current.push(stickyData);
      socket?.emit('CANVAS:SHAPE', stickyData);
      pushUndo(strokeId);
      forceUpdate({});
      setHasDrawn(true);
      return;
    }

    if (activeTool === TOOLS.LASER) {
      activePointerId.current = e.pointerId;
      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
      isDrawing.current = true;
      laserPoints.current.push({ x: pos.x, y: pos.y, timestamp: Date.now() });
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
  }, [activeTool, color, fillColor, brushSize, eraserSize, socket, sessionId, getPos, setSelected, isInGap, getPageIndex]);

  const onPointerMove = useCallback((e) => {
    if (e.pointerType === 'touch') e.preventDefault();
    if (e.pointerId !== activePointerId.current) return;

    const pos = getPos(e);

    if (isInGap(pos.y) || (isDrawing.current && getPageIndex(pos.y) !== activePageIndex.current)) {
      if (isDrawing.current) onPointerUp(e);
      return;
    }

    socket?.emit(SOCKET_EVENTS.CURSOR_MOVE, { x: pos.x, y: pos.y, roomId: room?._id, tool: activeTool });

    if (!isDrawing.current) return;
    
    if (activeTool === TOOLS.SELECT) {
      const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (!stroke) return;
      const isSelectable = ['image', 'rect', 'circle', 'line', 'arrow'].includes(stroke.type);
      if (!isSelectable) return;

      if (resizeHandle.current) {
        const { x, y, w, h, clickX, clickY } = initialStrokeState.current;
        const dx = pos.x - clickX;
        const dy = pos.y - clickY;
        const minS = 20;

        if (stroke.type === 'image') {
          if (resizeHandle.current === 'se') { stroke.width = Math.max(minS, w + dx); stroke.height = Math.max(minS, h + dy); }
          else if (resizeHandle.current === 'sw') { stroke.width = Math.max(minS, w - dx); stroke.height = Math.max(minS, h + dy); if (w - dx >= minS) stroke.startX = x + dx; }
          else if (resizeHandle.current === 'ne') { stroke.width = Math.max(minS, w + dx); stroke.height = Math.max(minS, h - dy); if (h - dy >= minS) stroke.startY = y + dy; }
          else if (resizeHandle.current === 'nw') { stroke.width = Math.max(minS, w - dx); stroke.height = Math.max(minS, h - dy); if (w - dx >= minS) stroke.startX = x + dx; if (h - dy >= minS) stroke.startY = y + dy; }
        } else {
          if (resizeHandle.current === 'se' || resizeHandle.current === 'e' || resizeHandle.current === 's') { stroke.endX = pos.x; stroke.endY = pos.y; }
          else if (resizeHandle.current === 'nw' || resizeHandle.current === 'n' || resizeHandle.current === 'w') { stroke.startX = pos.x; stroke.startY = pos.y; }
          else if (resizeHandle.current === 'ne') { stroke.endX = pos.x; stroke.startY = pos.y; }
          else if (resizeHandle.current === 'sw') { stroke.startX = pos.x; stroke.endY = pos.y; }
        }
      } else {
        stroke.startX = pos.x - dragStartOffset.current.x;
        stroke.startY = pos.y - dragStartOffset.current.y;
        if (stroke.endX !== undefined) {
          stroke.endX = pos.x - dragStartOffset.current.x2;
          stroke.endY = pos.y - dragStartOffset.current.y2;
        }
      }
      redrawMainCanvas();
      redrawPreview();
      return;
    }

    if (activeTool === TOOLS.LASER) {
      laserPoints.current.push({ x: pos.x, y: pos.y, timestamp: Date.now() });
      return;
    }
    
    currentPoints.current.push(pos);
    redrawPreview();

    socket?.emit(SOCKET_EVENTS.CANVAS_STROKE_MOVE, {
      strokeId: currentStrokeId.current,
      x: pos.x, y: pos.y,
      timestamp: Date.now(),
    });
  }, [room, redrawPreview, redrawMainCanvas, socket, activeTool, getPos, isInGap, getPageIndex]);

  const onPointerUp = useCallback((e) => {
    if (e.pointerId !== activePointerId.current) return;
    activePointerId.current = null;
    
    if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (activeTool === TOOLS.SELECT) {
      if (selectedStrokeIdRef.current) {
        const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
        if (stroke && ['image', 'rect', 'circle', 'line', 'arrow'].includes(stroke.type)) {
          socket?.emit('CANVAS:UPDATE_SHAPE', {
            strokeId: stroke.strokeId,
            startX: stroke.startX, startY: stroke.startY,
            endX: stroke.endX, endY: stroke.endY,
            width: stroke.width, height: stroke.height,
          });
        }
      }
      resizeHandle.current = null;
      return;
    }

    if (activeTool === TOOLS.LASER) return;

    const preview = previewCanvasRef.current;
    const main = mainCanvasRef.current;
    if (!main || !preview) return;

    const ctx = main.getContext('2d');
    const pos = currentPoints.current[currentPoints.current.length - 1] || shapeStart.current;
    if (!pos) return;

    const shapeData = {
      startX: shapeStart.current?.x, startY: shapeStart.current?.y,
      endX: pos.x, endY: pos.y,
      color, fillColor, brushSize, strokeStyle, opacity,
    };

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.MARKER) {
      const isMarker = activeTool === TOOLS.MARKER;
      const mSize = isMarker ? brushSize * 2 : brushSize;
      const mOpacity = isMarker ? (opacity || 0.8) : opacity;
      drawPen(ctx, currentPoints.current, color, mSize, mOpacity);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: isMarker ? 'marker' : 'pen', points: [...currentPoints.current], color, brushSize: mSize, undone: false });
    } else if (activeTool === TOOLS.HIGHLIGHTER) {
      const hSize = Math.max(brushSize, 16);
      drawPen(ctx, currentPoints.current, color, hSize, 0.3);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'highlighter', points: [...currentPoints.current], color, brushSize: hSize, undone: false });
    } else if (activeTool === TOOLS.ERASER) {
      drawEraser(ctx, currentPoints.current, eraserSize);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'eraser', points: [...currentPoints.current], brushSize: eraserSize, undone: false });
    } else if (activeTool === TOOLS.LINE && shapeStart.current) {
      drawLine(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'line', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'line', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.ARROW && shapeStart.current) {
      drawArrow(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'arrow', ...shapeData, undone: false });
      // BUG FIX: Arrow now emits to socket
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'arrow', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.RECT && shapeStart.current) {
      drawRect(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'rect', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'rect', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.CIRCLE && shapeStart.current) {
      drawCircle(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'circle', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'circle', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.TRIANGLE && shapeStart.current) {
      drawTriangle(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'triangle', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'triangle', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.DIAMOND && shapeStart.current) {
      drawDiamond(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'diamond', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'diamond', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.STAR && shapeStart.current) {
      drawStar(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'star', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'star', ...shapeData, sessionId });
    }

    clearCanvas(preview);
    pushUndo(currentStrokeId.current);
    if (onStrokeComplete) onStrokeComplete();
    setHasDrawn(true);

    if ([TOOLS.PEN, TOOLS.MARKER, TOOLS.ERASER, TOOLS.HIGHLIGHTER].includes(activeTool)) {
      socket?.emit(SOCKET_EVENTS.CANVAS_STROKE_END, {
        strokeId: currentStrokeId.current,
        points: currentPoints.current,
        metadata: { color, brushSize: activeTool === TOOLS.ERASER ? eraserSize : (activeTool === TOOLS.HIGHLIGHTER ? Math.max(brushSize, 16) : brushSize), opacity },
      });
    }

    currentStrokeId.current = null;
    currentPoints.current = [];
    shapeStart.current = null;
  }, [activeTool, color, fillColor, brushSize, eraserSize, opacity, strokeStyle, socket, sessionId, pushUndo, onStrokeComplete]);

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim() || !textInput) return;
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    const strokeId = uuidv4();
    drawText(ctx, { startX: textInput.x, startY: textInput.y, text: textValue, fontSize, fontFamily, color });
    localStrokes.current.push({ strokeId, type: 'text', startX: textInput.x, startY: textInput.y, text: textValue, fontSize, fontFamily, color, undone: false });
    pushUndo(strokeId);
    socket?.emit(SOCKET_EVENTS.CANVAS_TEXT, {
      strokeId, x: textInput.x, y: textInput.y,
      text: textValue, fontSize, fontFamily, color, sessionId,
    });
    if (onStrokeComplete) onStrokeComplete();
    setTextInput(null);
    setTextValue('');
    setHasDrawn(true);
  }, [textInput, textValue, color, fontSize, fontFamily, socket, sessionId, pushUndo, onStrokeComplete]);

  // Right-click context menu
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);
    
    // Check if we right-clicked a stroke
    let hitStroke = null;
    for (let i = localStrokes.current.length - 1; i >= 0; i--) {
      const stroke = localStrokes.current[i];
      if (stroke.undone) continue;
      if (['image', 'rect', 'circle', 'line', 'arrow'].includes(stroke.type)) {
        const x = Math.min(stroke.startX, stroke.endX ?? stroke.startX);
        const y = Math.min(stroke.startY, stroke.endY ?? stroke.startY);
        const w = Math.abs((stroke.endX ?? stroke.startX) - stroke.startX);
        const h = Math.abs((stroke.endY ?? stroke.startY) - stroke.startY);
        if (pos.x >= x - 6 && pos.x <= x + w + 6 && pos.y >= y - 6 && pos.y <= y + h + 6) {
          hitStroke = stroke;
          break;
        }
      }
    }

    setContextMenu({ x: e.clientX, y: e.clientY, stroke: hitStroke, pos });
    if (hitStroke) setSelected(hitStroke.strokeId);
  }, [getPos, setSelected]);

  const getCursor = () => {
    if (activeTool === TOOLS.SELECT) return selectedStrokeIdRef.current ? 'move' : 'default';
    if (activeTool === TOOLS.TEXT) return 'text';
    if (activeTool === TOOLS.ERASER) {
      const size = Math.max(eraserSize, 4);
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 1}" fill="none" stroke="#999999" stroke-width="1"/></svg>`;
      return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}") ${size/2} ${size/2}, crosshair`;
    }
    if (activeTool === TOOLS.PEN || activeTool === TOOLS.MARKER) {
      const strokeHex = color.replace('#', '');
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${strokeHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
      return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}") 2 22, crosshair`;
    }
    return 'crosshair';
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ cursor: getCursor() }}>
      {/* Main canvas — committed strokes */}
      <canvas ref={mainCanvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />
      {/* Preview canvas — current stroke being drawn */}
      <canvas
        ref={previewCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 2, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={onContextMenu}
      />


      {/* Text input overlay */}
      {textInput && (
        <div className="absolute z-20" style={{ left: textInput.x, top: textInput.y - 4 }}>
          <div
            className="relative border-2 border-brand-400 rounded-lg bg-black/10 backdrop-blur-sm p-1 shadow-lg"
            style={{ minWidth: '150px' }}
          >
            <textarea
              autoFocus
              rows={3}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(); }
                if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
              }}
              onBlur={handleTextSubmit}
              className="bg-transparent border-none outline-none resize-none w-full"
              style={{ color, fontSize: `${fontSize}px`, fontFamily, lineHeight: 1.4, minWidth: '150px' }}
              placeholder="Type here... (Shift+Enter for new line)"
            />
            <div className="text-xs text-gray-400 mt-1">Enter to confirm · Esc to cancel</div>
          </div>
        </div>
      )}

      {/* Render Sticky Notes */}
      {localStrokes.current.filter(s => s.type === 'sticky' && !s.undone).map(note => (
        <StickyNote
          key={note.strokeId}
          note={{ id: note.strokeId, x: note.startX, y: note.startY, text: note.text, color: note.color, isNew: note.isNew }}
          onUpdate={handleStickyUpdate}
          onRemove={handleStickyRemove}
        />
      ))}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-xl shadow-2xl border border-white/10 overflow-hidden py-1"
          style={{
            left: contextMenu.x, top: contextMenu.y,
            background: 'rgba(15,15,20,0.95)',
            backdropFilter: 'blur(20px)',
            minWidth: '160px',
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.stroke ? (
            <>
              <button
                onClick={() => {
                  setClipboard({ ...contextMenu.stroke });
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span>📋</span> Copy
              </button>
              <button
                onClick={() => {
                  const src = contextMenu.stroke;
                  const newId = uuidv4();
                  const clone = { ...src, strokeId: newId, startX: (src.startX || 0) + 20, startY: (src.startY || 0) + 20 };
                  if (clone.endX !== undefined) { clone.endX += 20; clone.endY += 20; }
                  localStrokes.current.push(clone);
                  pushUndo(newId);
                  socket?.emit('CANVAS:SHAPE', { ...clone, sessionId });
                  redrawMainCanvas();
                  setSelected(newId);
                  forceUpdate({});
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span>⧉</span> Duplicate
              </button>
              <div className="h-px bg-white/10 mx-2 my-1" />
              <button
                onClick={() => {
                  const id = contextMenu.stroke.strokeId;
                  const idx = localStrokes.current.findIndex(s => s.strokeId === id);
                  if (idx !== -1) {
                    localStrokes.current.splice(idx, 1);
                    redrawMainCanvas();
                    setSelected(null);
                    forceUpdate({});
                    socket?.emit('CANVAS:UNDO', { strokeId: id, sessionId });
                  }
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <span>🗑</span> Delete
              </button>
            </>
          ) : (
            <>
              {clipboard && (
                <button
                  onClick={() => {
                    const newId = uuidv4();
                    const clone = { ...clipboard, strokeId: newId, startX: contextMenu.pos.x, startY: contextMenu.pos.y };
                    if (clone.endX !== undefined) {
                      const dx = contextMenu.pos.x - (clipboard.startX || 0);
                      const dy = contextMenu.pos.y - (clipboard.startY || 0);
                      clone.endX = clipboard.endX + dx;
                      clone.endY = clipboard.endY + dy;
                    }
                    localStrokes.current.push(clone);
                    pushUndo(newId);
                    socket?.emit('CANVAS:SHAPE', { ...clone, sessionId });
                    redrawMainCanvas();
                    setSelected(newId);
                    forceUpdate({});
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span>📌</span> Paste
                </button>
              )}
              <button
                onClick={() => {
                  const strokeId = uuidv4();
                  const stickyData = { type: 'sticky', startX: contextMenu.pos.x, startY: contextMenu.pos.y, text: '', color: '#FEF08A', strokeId, sessionId };
                  localStrokes.current.push(stickyData);
                  socket?.emit('CANVAS:SHAPE', stickyData);
                  pushUndo(strokeId);
                  forceUpdate({});
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <span>📝</span> Add Sticky Note
              </button>
              <div className="h-px bg-white/10 mx-2 my-1" />
              <button
                onClick={() => {
                  if (!confirm('Clear board for everyone?')) return;
                  localStrokes.current = [];
                  backgroundImage.current = null;
                  redrawMainCanvas();
                  setSelected(null);
                  forceUpdate({});
                  socket?.emit(SOCKET_EVENTS.CANVAS_CLEAR, { sessionId, timestamp: Date.now() });
                  setContextMenu(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
              >
                <span>🗑</span> Clear Board
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default Canvas;

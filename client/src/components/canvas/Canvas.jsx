import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useRoomStore } from '../../store/roomStore';
import { TOOLS } from '../../constants/tools';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import {
  drawPen, drawEraser, drawLine, drawRect, drawCircle, drawText, drawCustomImage, drawArrow,
  clearCanvas, commitPreviewToMain, renderSingleStroke, drawImageOnCanvas,
  drawPolygon, drawStar, drawFreehand, drawBezier, drawSlide, drawFrame, drawTriangle, drawDiamond, drawDoubleArrow
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
    fontSize, fontFamily, textBold, textItalic, pushUndo, setSelectedStrokeId,
    shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY
  } = useCanvasStore();
  const { room } = useRoomStore();

  // Expose mainCanvasRef to parent for export
  useImperativeHandle(ref, () => mainCanvasRef.current, []);

  const isDrawing = useRef(false);
  const currentStrokeId = useRef(null);
  const currentPoints = useRef([]);
  const shapeStart = useRef(null);
  const activePointerId = useRef(null);
  const mousePosRef = useRef(null);

  const isSelectableType = (type) => ['image', 'rect', 'circle', 'line', 'arrow', 'text', 'polygon', 'bezier', 'freehand', 'double_arrow', 'frame', 'slide'].includes(type);

  const getStrokeBoundingBox = (stroke) => {
    let x, y, w, h;
    if (stroke.type === 'image') {
      x = stroke.startX; y = stroke.startY; w = stroke.width; h = stroke.height;
    } else if (['polygon', 'bezier', 'freehand'].includes(stroke.type) && stroke.points && stroke.points.length > 0) {
      const xs = stroke.points.map(p => p.x);
      const ys = stroke.points.map(p => p.y);
      x = Math.min(...xs);
      y = Math.min(...ys);
      w = Math.max(...xs) - x;
      h = Math.max(...ys) - y;
    } else {
      x = Math.min(stroke.startX || 0, stroke.endX || 0);
      y = Math.min(stroke.startY || 0, stroke.endY || 0);
      w = Math.abs((stroke.endX || 0) - (stroke.startX || 0));
      h = Math.abs((stroke.endY || 0) - (stroke.startY || 0));
    }
    return { x, y, w, h };
  };


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
    if (id) {
      const stroke = localStrokes.current.find(s => s.strokeId === id);
      if (stroke) {
        if (stroke.color) useCanvasStore.getState().setColor(stroke.color);
        if (stroke.fillColor) useCanvasStore.getState().setFillColor(stroke.fillColor);
        if (stroke.opacity !== undefined) useCanvasStore.getState().setOpacity(stroke.opacity);
        if (stroke.brushSize) useCanvasStore.getState().setBrushSize(stroke.brushSize);
        if (stroke.shadowColor) useCanvasStore.getState().setShadowColor(stroke.shadowColor);
        if (stroke.shadowBlur !== undefined) useCanvasStore.getState().setShadowBlur(stroke.shadowBlur);
        if (stroke.shadowOffsetX !== undefined) useCanvasStore.getState().setShadowOffsetX(stroke.shadowOffsetX);
        if (stroke.shadowOffsetY !== undefined) useCanvasStore.getState().setShadowOffsetY(stroke.shadowOffsetY);
        if (stroke.fontSize) useCanvasStore.getState().setFontSize(stroke.fontSize);
        if (stroke.fontFamily) useCanvasStore.getState().setFontFamily(stroke.fontFamily);
        if (stroke.bold !== undefined) useCanvasStore.getState().setTextBold(stroke.bold);
        if (stroke.italic !== undefined) useCanvasStore.getState().setTextItalic(stroke.italic);
      }
    }
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
      const shadowData = {
        shadowColor: stroke.shadowColor,
        shadowBlur: stroke.shadowBlur,
        shadowOffsetX: stroke.shadowOffsetX,
        shadowOffsetY: stroke.shadowOffsetY,
        flipX: stroke.flipX,
        flipY: stroke.flipY,
        opacity: stroke.opacity
      };

      if (stroke.type === 'pen') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize, stroke.opacity, shadowData);
      else if (stroke.type === 'marker') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize, stroke.opacity || 0.8, shadowData);
      else if (stroke.type === 'highlighter') drawPen(ctx, stroke.points, stroke.color, stroke.brushSize, 0.3, shadowData);
      else if (stroke.type === 'eraser') drawEraser(ctx, stroke.points, stroke.brushSize);
      else if (['line', 'rect', 'circle', 'arrow', 'double_arrow', 'triangle', 'diamond', 'star', 'frame', 'slide'].includes(stroke.type)) {
        const data = {
          startX: stroke.startX, startY: stroke.startY,
          endX: stroke.endX, endY: stroke.endY,
          color: stroke.color, fillColor: stroke.fillColor,
          brushSize: stroke.brushSize, strokeStyle: stroke.strokeStyle,
          cornerRadius: stroke.cornerRadius,
          ...shadowData
        };
        if (stroke.type === 'line') drawLine(ctx, data);
        else if (stroke.type === 'arrow') drawArrow(ctx, data);
        else if (stroke.type === 'double_arrow') drawDoubleArrow(ctx, data);
        else if (stroke.type === 'rect') drawRect(ctx, data);
        else if (stroke.type === 'circle') drawCircle(ctx, data);
        else if (stroke.type === 'triangle') drawTriangle(ctx, data);
        else if (stroke.type === 'diamond') drawDiamond(ctx, data);
        else if (stroke.type === 'star') drawStar(ctx, data);
        else if (stroke.type === 'frame') drawFrame(ctx, data);
        else if (stroke.type === 'slide') drawSlide(ctx, data);
      }
      else if (['freehand', 'polygon', 'bezier'].includes(stroke.type)) {
        const data = {
          points: stroke.points,
          color: stroke.color, fillColor: stroke.fillColor,
          brushSize: stroke.brushSize, strokeStyle: stroke.strokeStyle,
          closed: stroke.closed,
          ...shadowData
        };
        if (stroke.type === 'freehand') drawFreehand(ctx, data);
        else if (stroke.type === 'polygon') drawPolygon(ctx, data);
        else if (stroke.type === 'bezier') drawBezier(ctx, data);
      }
      else if (['text', 'text_heading', 'text_bullet', 'text_numbered'].includes(stroke.type)) {
        drawText(ctx, {
          startX: stroke.startX, startY: stroke.startY,
          text: stroke.text, fontSize: stroke.fontSize,
          fontFamily: stroke.fontFamily, color: stroke.color,
          bold: stroke.bold, italic: stroke.italic,
          ...shadowData
        });
      }
      else if (stroke.type === 'image') {
        drawCustomImage(ctx, {
          startX: stroke.startX, startY: stroke.startY,
          width: stroke.width, height: stroke.height,
          base64: stroke.base64, ...shadowData,
          _imgCache: stroke._imgCache,
        });
      }
    });

    ctx.restore();
  }, [aspectRatio]);

  useEffect(() => {
    if (selectedStrokeIdRef.current && !isDrawing.current) {
      const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (stroke) {
        let changed = false;
        if (color && stroke.color !== color) { stroke.color = color; changed = true; }
        if (fillColor && stroke.fillColor !== fillColor) { stroke.fillColor = fillColor; changed = true; }
        if (opacity !== undefined && stroke.opacity !== opacity) { stroke.opacity = opacity; changed = true; }
        if (brushSize && stroke.brushSize !== brushSize) { stroke.brushSize = brushSize; changed = true; }
        if (strokeStyle && stroke.strokeStyle !== strokeStyle) { stroke.strokeStyle = strokeStyle; changed = true; }
        if (fontSize && stroke.fontSize !== fontSize) { stroke.fontSize = fontSize; changed = true; }
        if (fontFamily && stroke.fontFamily !== fontFamily) { stroke.fontFamily = fontFamily; changed = true; }
        if (textBold !== undefined && stroke.bold !== textBold) { stroke.bold = textBold; changed = true; }
        if (textItalic !== undefined && stroke.italic !== textItalic) { stroke.italic = textItalic; changed = true; }
        if (shadowColor && stroke.shadowColor !== shadowColor) { stroke.shadowColor = shadowColor; changed = true; }
        if (shadowBlur !== undefined && stroke.shadowBlur !== shadowBlur) { stroke.shadowBlur = shadowBlur; changed = true; }
        if (shadowOffsetX !== undefined && stroke.shadowOffsetX !== shadowOffsetX) { stroke.shadowOffsetX = shadowOffsetX; changed = true; }
        if (shadowOffsetY !== undefined && stroke.shadowOffsetY !== shadowOffsetY) { stroke.shadowOffsetY = shadowOffsetY; changed = true; }

        if (changed) {
          redrawMainCanvas();
          socket?.emit('CANVAS:UPDATE_SHAPE', { strokeId: stroke.strokeId, ...stroke, sessionId });
        }
      }
    }
  }, [color, fillColor, opacity, brushSize, strokeStyle, fontSize, fontFamily, textBold, textItalic, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, redrawMainCanvas, socket, sessionId]);

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

  // Local Undo/Redo listener
  useEffect(() => {
    const handleUndo = (e) => {
      const strokeId = e.detail;
      const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
      if (stroke) {
        stroke.undone = true;
        if (strokeId === selectedStrokeIdRef.current) setSelected(null);
        redrawMainCanvas();
      }
    };
    const handleRedo = (e) => {
      const strokeId = e.detail;
      const stroke = localStrokes.current.find(s => s.strokeId === strokeId);
      if (stroke) {
        stroke.undone = false;
        redrawMainCanvas();
      }
    };
    window.addEventListener('canvas:undo-local', handleUndo);
    window.addEventListener('canvas:redo-local', handleRedo);
    return () => {
      window.removeEventListener('canvas:undo-local', handleUndo);
      window.removeEventListener('canvas:redo-local', handleRedo);
    };
  }, [redrawMainCanvas, setSelected]);

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
      onText: ({ strokeId, type, x, y, text, fontSize, fontFamily, color: c, fillColor: f, undone = false }) => {
        const main = mainCanvasRef.current;
        if (!main) return;
        const ctx = main.getContext('2d');
        if (!undone) {
          drawText(ctx, { startX: x, startY: y, text, fontSize, fontFamily, color: c });
        }
        localStrokes.current.push({ strokeId, type: type || 'text', startX: x, startY: y, text, fontSize, fontFamily, color: c, fillColor: f, undone });
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

    const handleToggleLock = () => {
      if (!selectedStrokeIdRef.current) return;
      const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (stroke) {
        stroke.locked = !stroke.locked;
        redrawMainCanvas();
        socket?.emit('CANVAS:UPDATE_SHAPE', { strokeId: stroke.strokeId, locked: stroke.locked, sessionId });
      }
    };

    const handleFlip = (e) => {
      const axis = e.detail; // 'horizontal' or 'vertical'
      if (!selectedStrokeIdRef.current) return;
      const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (stroke) {
        if (axis === 'horizontal') stroke.flipX = !stroke.flipX;
        if (axis === 'vertical') stroke.flipY = !stroke.flipY;
        redrawMainCanvas();
        socket?.emit('CANVAS:UPDATE_SHAPE', { strokeId: stroke.strokeId, flipX: stroke.flipX, flipY: stroke.flipY, sessionId });
      }
    };

    window.addEventListener('canvas:toggle-lock', handleToggleLock);
    window.addEventListener('canvas:flip', handleFlip);

    return () => {
      window.removeEventListener('canvas:arrange', handleArrange);
      window.removeEventListener('canvas:duplicate-selected', handleDuplicate);
      window.removeEventListener('canvas:delete-selected', handleDelete);
      window.removeEventListener('canvas:toggle-lock', handleToggleLock);
      window.removeEventListener('canvas:flip', handleFlip);
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
    if (isDrawing.current && activeTool !== TOOLS.LASER && activeTool !== TOOLS.SELECT) {
      if ((activeTool === TOOLS.POLYGON || activeTool === TOOLS.BEZIER) && currentPoints.current.length > 0) {
        const pts = [...currentPoints.current];
        if (mousePosRef.current) pts.push(mousePosRef.current);
        if (activeTool === TOOLS.POLYGON) drawPolygon(ctx, { points: pts, color, fillColor, brushSize, opacity, closed: false });
        else drawBezier(ctx, { points: pts, color, fillColor, brushSize, opacity });
      } else if (currentPoints.current.length > 1) {
        const endPt = currentPoints.current[currentPoints.current.length - 1];
        if (activeTool === TOOLS.PEN) drawPen(ctx, currentPoints.current, color, brushSize, opacity);
        else if (activeTool === TOOLS.MARKER) drawPen(ctx, currentPoints.current, color, brushSize * 2, opacity || 0.8);
        else if (activeTool === TOOLS.HIGHLIGHTER) drawPen(ctx, currentPoints.current, color, Math.max(brushSize, 16), 0.3);
        else if (activeTool === TOOLS.ERASER && mainCtx) drawEraser(mainCtx, currentPoints.current, eraserSize);
        else if (activeTool === TOOLS.FREEHAND) drawFreehand(ctx, { points: currentPoints.current, color, fillColor, brushSize, opacity });
        else if (activeTool === TOOLS.LINE) drawLine(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, brushSize, strokeStyle });
        else if (activeTool === TOOLS.ARROW) drawArrow(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, brushSize });
        else if (activeTool === TOOLS.DOUBLE_ARROW) drawDoubleArrow(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, brushSize });
        else if (activeTool === TOOLS.RECT) drawRect(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
        else if (activeTool === TOOLS.CIRCLE) drawCircle(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
        else if (activeTool === TOOLS.TRIANGLE) drawTriangle(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
        else if (activeTool === TOOLS.DIAMOND) drawDiamond(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
        else if (activeTool === TOOLS.STAR) drawStar(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, strokeStyle });
        else if (activeTool === TOOLS.FRAME) drawFrame(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, opacity });
        else if (activeTool === TOOLS.SLIDE) drawSlide(ctx, { startX: shapeStart.current.x, startY: shapeStart.current.y, endX: endPt.x, endY: endPt.y, color, fillColor, brushSize, opacity });
      }
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
      if (stroke && isSelectableType(stroke.type)) {
        const { x, y, w, h } = getStrokeBoundingBox(stroke);

        ctx.save();
        ctx.strokeStyle = stroke.locked ? '#ef4444' : '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
        ctx.setLineDash([]);

        if (!stroke.locked) {
          // 8 handles: corners + midpoints
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 2;
          const handles = [
            [x - 4, y - 4], [x + w / 2, y - 4], [x + w + 4, y - 4],
            [x + w + 4, y + h / 2],
            [x + w + 4, y + h + 4], [x + w / 2, y + h + 4], [x - 4, y + h + 4],
            [x - 4, y + h / 2],
          ];
          handles.forEach(([hx, hy]) => {
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        }
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
      if (updates.x !== undefined) stroke.startX = updates.x;
      if (updates.y !== undefined) stroke.startY = updates.y;
      if (updates.text !== undefined) stroke.text = updates.text;
      if (updates.color !== undefined) stroke.color = updates.color;
      if (updates.width !== undefined) stroke.width = updates.width;
      if (updates.height !== undefined) stroke.height = updates.height;
      
      socket?.emit('CANVAS:UPDATE_SHAPE', { 
        strokeId, 
        ...updates,
        startX: stroke.startX,
        startY: stroke.startY
      });
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
        if (stroke && !stroke.locked && isSelectableType(stroke.type)) {
          const { x, y, w, h } = getStrokeBoundingBox(stroke);
          const handles = {
            nw: [x - 4, y - 4], n: [x + w / 2, y - 4], ne: [x + w + 4, y - 4],
            e: [x + w + 4, y + h / 2],
            se: [x + w + 4, y + h + 4], s: [x + w / 2, y + h + 4], sw: [x - 4, y + h + 4],
            w: [x - 4, y + h / 2],
          };
          for (const [key, [hx, hy]] of Object.entries(handles)) {
            const dx = pos.x - hx;
            const dy = pos.y - hy;
            if (dx * dx + dy * dy <= 144) {
              resizeHandle.current = key;
              initialStrokeState.current = { x, y, w, h, clickX: pos.x, clickY: pos.y, fontSize: stroke.fontSize, points: stroke.points ? stroke.points.map(p => ({...p})) : null };
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
        if (isSelectableType(stroke.type)) {
          const { x, y, w, h } = getStrokeBoundingBox(stroke);
          if (pos.x >= x - 6 && pos.x <= x + w + 6 && pos.y >= y - 6 && pos.y <= y + h + 6) {
            hitId = stroke.strokeId;
            dragStartOffset.current = { x: pos.x - (stroke.startX || 0), y: pos.y - (stroke.startY || 0), x2: stroke.endX !== undefined ? pos.x - stroke.endX : 0, y2: stroke.endY !== undefined ? pos.y - stroke.endY : 0, clickX: pos.x, clickY: pos.y };
            initialStrokeState.current = { points: stroke.points ? stroke.points.map(p => ({...p})) : null };
            break;
          }
        }
      }
      // BUG FIX: deselect if clicking empty space
      setSelected(hitId);
      if (hitId) {
        const stroke = localStrokes.current.find(s => s.strokeId === hitId);
        if (stroke && !stroke.locked) {
          activePointerId.current = e.pointerId;
          if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
          isDrawing.current = true;
        }
      }
      redrawPreview();
      return;
    }

    if (activeTool === TOOLS.TEXT || activeTool === TOOLS.TEXT_HEADING || activeTool === TOOLS.TEXT_BULLET || activeTool === TOOLS.TEXT_NUMBERED) {
      setTextInput({ ...pos, tool: activeTool });
      if (activeTool === TOOLS.TEXT_BULLET) setTextValue('• ');
      else if (activeTool === TOOLS.TEXT_NUMBERED) setTextValue('1. ');
      else setTextValue('');
      
      if (activeTool === TOOLS.TEXT_HEADING) {
          useCanvasStore.getState().setFontSize(48);
          useCanvasStore.getState().setTextBold(true);
      }
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

    if (activeTool === TOOLS.POLYGON || activeTool === TOOLS.BEZIER) {
      if (!isDrawing.current) {
        isDrawing.current = true;
        currentStrokeId.current = uuidv4();
        currentPoints.current = [pos];
        shapeStart.current = pos;
        mousePosRef.current = pos;
      } else {
        currentPoints.current.push(pos);
      }
      redrawPreview();
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
    
    const pos = getPos(e);

    if (!isDrawing.current && activeTool === TOOLS.SELECT) {
      let hoverCursor = 'default';
      let isResizeHandle = false;

      if (selectedStrokeIdRef.current) {
        const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
        if (stroke && isSelectableType(stroke.type)) {
          const { x, y, w, h } = getStrokeBoundingBox(stroke);
          const handles = {
            nw: [x - 4, y - 4], n: [x + w / 2, y - 4], ne: [x + w + 4, y - 4],
            e: [x + w + 4, y + h / 2],
            se: [x + w + 4, y + h + 4], s: [x + w / 2, y + h + 4], sw: [x - 4, y + h + 4],
            w: [x - 4, y + h / 2],
          };
          for (const [key, [hx, hy]] of Object.entries(handles)) {
            const dx = pos.x - hx;
            const dy = pos.y - hy;
            if (dx * dx + dy * dy <= 144) {
              isResizeHandle = true;
              if (key === 'nw' || key === 'se') hoverCursor = 'nwse-resize';
              else if (key === 'ne' || key === 'sw') hoverCursor = 'nesw-resize';
              else if (key === 'n' || key === 's') hoverCursor = 'ns-resize';
              else if (key === 'e' || key === 'w') hoverCursor = 'ew-resize';
              break;
            }
          }
          
          if (!isResizeHandle && pos.x >= x - 6 && pos.x <= x + w + 6 && pos.y >= y - 6 && pos.y <= y + h + 6) {
            hoverCursor = 'move';
          }
        }
      }

      if (hoverCursor === 'default') {
        for (let i = localStrokes.current.length - 1; i >= 0; i--) {
          const stroke = localStrokes.current[i];
          if (stroke.undone) continue;
          if (isSelectableType(stroke.type)) {
            const { x, y, w, h } = getStrokeBoundingBox(stroke);
            if (pos.x >= x - 6 && pos.x <= x + w + 6 && pos.y >= y - 6 && pos.y <= y + h + 6) {
              hoverCursor = 'move';
              break;
            }
          }
        }
      }

      if (containerRef.current && containerRef.current.style.cursor !== hoverCursor) {
        containerRef.current.style.cursor = hoverCursor;
      }
    }

    if (e.pointerId !== activePointerId.current) return;

    if (isInGap(pos.y) || (isDrawing.current && getPageIndex(pos.y) !== activePageIndex.current)) {
      if (isDrawing.current) onPointerUp(e);
      return;
    }

    socket?.emit(SOCKET_EVENTS.CURSOR_MOVE, { x: pos.x, y: pos.y, roomId: room?._id, tool: activeTool });

    if (!isDrawing.current) return;

    if (activeTool === TOOLS.SELECT) {
      const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
      if (!stroke) return;
      const isSelectable = isSelectableType(stroke.type);
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
        } else if (stroke.type === 'slide') {
          let newW = Math.max(minS, w + (resizeHandle.current.includes('e') ? dx : -dx));
          let newH = newW * 9 / 16;
          
          if (resizeHandle.current === 'se') { stroke.endX = x + newW; stroke.endY = y + newH; }
          else if (resizeHandle.current === 'nw') { stroke.startX = x + w - newW; stroke.startY = y + h - newH; }
          else if (resizeHandle.current === 'ne') { stroke.endX = x + newW; stroke.startY = y + h - newH; }
          else if (resizeHandle.current === 'sw') { stroke.startX = x + w - newW; stroke.endY = y + newH; }
          else if (resizeHandle.current === 'e' || resizeHandle.current === 'w') {
             if (resizeHandle.current === 'e') stroke.endX = x + newW;
             else stroke.startX = x + w - newW;
             stroke.endY = y + newH;
          }
          else if (resizeHandle.current === 's' || resizeHandle.current === 'n') {
             newH = Math.max(minS, h + (resizeHandle.current === 's' ? dy : -dy));
             newW = newH * 16 / 9;
             if (resizeHandle.current === 's') stroke.endY = y + newH;
             else stroke.startY = y + h - newH;
             stroke.endX = x + newW;
          }
        } else if (['polygon', 'bezier', 'freehand'].includes(stroke.type)) {
          let newW = w, newH = h;
          if (resizeHandle.current.includes('e')) newW = Math.max(minS, w + dx);
          if (resizeHandle.current.includes('w')) newW = Math.max(minS, w - dx);
          if (resizeHandle.current.includes('s')) newH = Math.max(minS, h + dy);
          if (resizeHandle.current.includes('n')) newH = Math.max(minS, h - dy);

          const scaleX = newW / (w || 1);
          const scaleY = newH / (h || 1);
          
          const origPts = initialStrokeState.current.points;
          if (origPts) {
            stroke.points = origPts.map(p => ({
              x: resizeHandle.current.includes('w') ? (x + w) - (x + w - p.x) * scaleX : x + (p.x - x) * scaleX,
              y: resizeHandle.current.includes('n') ? (y + h) - (y + h - p.y) * scaleY : y + (p.y - y) * scaleY
            }));
          }
        } else if (stroke.type === 'text') {
          const initialFontSize = initialStrokeState.current.fontSize || 18;
          let newH = h;
          if (resizeHandle.current.includes('s')) newH = Math.max(minS, h + dy);
          else if (resizeHandle.current.includes('n')) newH = Math.max(minS, h - dy);
          
          const scale = newH / h;
          stroke.fontSize = Math.max(10, initialFontSize * scale);
          
          const main = mainCanvasRef.current;
          if (main) {
            const ctx = main.getContext('2d');
            ctx.font = `${stroke.italic ? 'italic ' : ''}${stroke.bold ? 'bold ' : ''}${stroke.fontSize}px ${stroke.fontFamily || 'Inter'}, sans-serif`;
            let maxWidth = 0;
            const lines = (stroke.text || '').split('\n');
            lines.forEach(line => {
              const metrics = ctx.measureText(line);
              if (metrics.width > maxWidth) maxWidth = metrics.width;
            });
            const newHeight = lines.length * (stroke.fontSize * 1.4);
            
            if (resizeHandle.current.includes('n')) stroke.startY = y + h - newHeight;
            if (resizeHandle.current.includes('w')) stroke.startX = x + w - maxWidth;
            
            stroke.endX = stroke.startX + maxWidth;
            stroke.endY = stroke.startY + newHeight;
          }
        } else {
          if (resizeHandle.current === 'se' || resizeHandle.current === 'e' || resizeHandle.current === 's') { stroke.endX = pos.x; stroke.endY = pos.y; }
          else if (resizeHandle.current === 'nw' || resizeHandle.current === 'n' || resizeHandle.current === 'w') { stroke.startX = pos.x; stroke.startY = pos.y; }
          else if (resizeHandle.current === 'ne') { stroke.endX = pos.x; stroke.startY = pos.y; }
          else if (resizeHandle.current === 'sw') { stroke.startX = pos.x; stroke.endY = pos.y; }
        }
      } else {
        if (['polygon', 'bezier', 'freehand'].includes(stroke.type)) {
           const ddx = pos.x - dragStartOffset.current.clickX;
           const ddy = pos.y - dragStartOffset.current.clickY;
           const origPts = initialStrokeState.current?.points || stroke.points;
           stroke.points = origPts.map(p => ({ x: p.x + ddx, y: p.y + ddy }));
        } else {
           stroke.startX = pos.x - dragStartOffset.current.x;
           stroke.startY = pos.y - dragStartOffset.current.y;
           if (stroke.endX !== undefined) {
             stroke.endX = pos.x - dragStartOffset.current.x2;
             stroke.endY = pos.y - dragStartOffset.current.y2;
           }
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
    
    if (activeTool === TOOLS.POLYGON || activeTool === TOOLS.BEZIER) {
      // Don't release capture or reset isDrawing yet
      return;
    }
    
    activePointerId.current = null;
    if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (activeTool === TOOLS.SELECT) {
      if (selectedStrokeIdRef.current) {
        const stroke = localStrokes.current.find(s => s.strokeId === selectedStrokeIdRef.current);
        if (stroke && isSelectableType(stroke.type)) {
          socket?.emit('CANVAS:UPDATE_SHAPE', {
            strokeId: stroke.strokeId,
            startX: stroke.startX, startY: stroke.startY,
            endX: stroke.endX, endY: stroke.endY,
            width: stroke.width, height: stroke.height,
            points: stroke.points,
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
      shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
    };

    if (activeTool === TOOLS.PEN || activeTool === TOOLS.MARKER) {
      const isMarker = activeTool === TOOLS.MARKER;
      const mSize = isMarker ? brushSize * 2 : brushSize;
      const mOpacity = isMarker ? (opacity || 0.8) : opacity;
      const data = { shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY };
      drawPen(ctx, currentPoints.current, color, mSize, mOpacity, data);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: isMarker ? 'marker' : 'pen', points: [...currentPoints.current], color, brushSize: mSize, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, undone: false });
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
    } else if (activeTool === TOOLS.DOUBLE_ARROW && shapeStart.current) {
      drawDoubleArrow(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'double_arrow', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'double_arrow', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.FRAME && shapeStart.current) {
      drawFrame(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'frame', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'frame', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.SLIDE && shapeStart.current) {
      drawSlide(ctx, { ...shapeData });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'slide', ...shapeData, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'slide', ...shapeData, sessionId });
    } else if (activeTool === TOOLS.FREEHAND) {
      const pts = currentPoints.current;
      let closed = false;
      if (pts.length > 2) {
        const dx = pts[pts.length - 1].x - pts[0].x;
        const dy = pts[pts.length - 1].y - pts[0].y;
        if (dx * dx + dy * dy < 400) closed = true;
      }
      const data = { points: [...pts], color, fillColor, brushSize, opacity, closed, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY };
      drawFreehand(ctx, data);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'freehand', ...data, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'freehand', ...data, sessionId });
    }

    pushUndo(currentStrokeId.current);

    clearCanvas(preview);
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
  }, [activeTool, color, fillColor, brushSize, eraserSize, opacity, strokeStyle, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, socket, sessionId, pushUndo, onStrokeComplete]);

  const onDoubleClick = useCallback((e) => {
    if (activeTool === TOOLS.POLYGON || activeTool === TOOLS.BEZIER) {
      if (isDrawing.current && currentPoints.current.length > 0) {
        while (currentPoints.current.length > 1) {
           const last = currentPoints.current[currentPoints.current.length - 1];
           const prev = currentPoints.current[currentPoints.current.length - 2];
           if (last && prev && ((last.x - prev.x) ** 2 + (last.y - prev.y) ** 2 < 100)) {
             currentPoints.current.pop();
           } else {
             break;
           }
        }
        isDrawing.current = false;
        
        const strokeId = currentStrokeId.current;
        const data = {
          strokeId,
          type: activeTool,
          points: [...currentPoints.current],
          color, fillColor, brushSize, strokeStyle, opacity,
          shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
          closed: activeTool === TOOLS.POLYGON,
          sessionId
        };
        
        const main = mainCanvasRef.current;
        if (main) {
           const ctx = main.getContext('2d');
           if (activeTool === TOOLS.POLYGON) drawPolygon(ctx, data);
           else drawBezier(ctx, data);
        }

        localStrokes.current.push({ ...data, undone: false });
        socket?.emit('CANVAS:SHAPE', data);
        pushUndo(strokeId);
        
        currentStrokeId.current = null;
        currentPoints.current = [];
        redrawPreview();
        setHasDrawn(true);
      }
    }
  }, [activeTool, color, fillColor, brushSize, strokeStyle, opacity, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY, socket, sessionId, pushUndo]);

  const handleTextSubmit = useCallback((e) => {
    if (!textValue.trim() || !textInput) {
      setTextInput(null);
      setTextValue('');
      return;
    }
    const main = mainCanvasRef.current;
    if (!main) return;
    const ctx = main.getContext('2d');
    const strokeId = uuidv4();
    const type = 'text';

    let maxWidth = 0;
    const lines = textValue.split('\n');
    ctx.font = `${textItalic ? 'italic ' : ''}${textBold ? 'bold ' : ''}${fontSize}px ${fontFamily}, sans-serif`;
    lines.forEach(line => {
      const metrics = ctx.measureText(line);
      if (metrics.width > maxWidth) maxWidth = metrics.width;
    });
    const height = lines.length * (fontSize * 1.4);
    const endX = textInput.x + maxWidth;
    const endY = textInput.y + height;

    drawText(ctx, { startX: textInput.x, startY: textInput.y, text: textValue, fontSize, fontFamily, color, bold: textBold, italic: textItalic });

    localStrokes.current.push({ strokeId, type, startX: textInput.x, startY: textInput.y, endX, endY, text: textValue, fontSize, fontFamily, color, fillColor: null, bold: textBold, italic: textItalic, undone: false });
    pushUndo(strokeId);
    socket?.emit(SOCKET_EVENTS.CANVAS_TEXT, {
      strokeId, type, x: textInput.x, y: textInput.y, endX, endY,
      text: textValue, fontSize, fontFamily, color, fillColor: null, bold: textBold, italic: textItalic, sessionId,
    });
    if (onStrokeComplete) onStrokeComplete();
    setTextInput(null);
    setTextValue('');
    setHasDrawn(true);
  }, [textInput, textValue, textBold, textItalic, color, fontSize, fontFamily, socket, sessionId, pushUndo, onStrokeComplete]);

  // Handle clicking outside text input overlay
  useEffect(() => {
    if (!textInput) return;
    const handleGlobalPointerDown = (e) => {
      // Don't submit if clicking inside the text input or its toolbar
      if (e.target.closest('.text-input-overlay')) return;
      handleTextSubmit();
    };
    // Use pointerdown to catch it before focus changes
    window.addEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', handleGlobalPointerDown, { capture: true });
  }, [textInput, handleTextSubmit]);

  // Right-click context menu
  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    const pos = getPos(e);

    // Check if we right-clicked a stroke
    let hitStroke = null;
    for (let i = localStrokes.current.length - 1; i >= 0; i--) {
      const stroke = localStrokes.current[i];
      if (stroke.undone) continue;
      if (isSelectableType(stroke.type)) {
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
    if (activeTool === TOOLS.SELECT) return 'default';
    if (activeTool === TOOLS.TEXT) return 'text';
    if (activeTool === TOOLS.ERASER) {
      const size = Math.max(eraserSize, 4);
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="none" stroke="#999999" stroke-width="1"/></svg>`;
      return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}") ${size / 2} ${size / 2}, crosshair`;
    }
    if (activeTool === TOOLS.PEN || activeTool === TOOLS.MARKER) {
      const strokeHex = color.replace('#', '');
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#${strokeHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
      return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}") 2 22, crosshair`;
    }
    return 'crosshair';
  };

  return (
    <div className="absolute inset-0 z-0 touch-none" ref={containerRef} onDoubleClick={onDoubleClick} style={{ cursor: getCursor() }}>
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
        <div className="absolute z-20 text-input-overlay flex flex-col" style={{ left: textInput.x, top: textInput.y - 4 }}>
          <div
            className="relative border-2 border-brand-400 rounded-lg bg-black/5 backdrop-blur-md p-1 shadow-2xl transition-all"
            style={{ minWidth: '150px' }}
          >
            <textarea
              autoFocus
              rows={3}
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
              }}
              className="bg-transparent border-none outline-none w-full custom-scrollbar resize"
              style={{ color, fontSize: `${fontSize}px`, fontFamily, fontWeight: textBold ? 'bold' : 'normal', fontStyle: textItalic ? 'italic' : 'normal', lineHeight: 1.4, minWidth: '150px' }}
              placeholder="Type your text..."
            />
          </div>
          <button 
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); handleTextSubmit(); }}
            className="self-end mt-2 px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-full shadow-lg transition-transform active:scale-95"
          >
            Done
          </button>
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

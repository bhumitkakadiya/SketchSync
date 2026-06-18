const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'components', 'canvas', 'Canvas.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update UPDATE_SHAPE emit to include points
const updateShapeTarget = `
          socket?.emit('CANVAS:UPDATE_SHAPE', {
            strokeId: stroke.strokeId,
            startX: stroke.startX, startY: stroke.startY,
            endX: stroke.endX, endY: stroke.endY,
            width: stroke.width, height: stroke.height,
          });
`;
const updateShapeReplacement = `
          socket?.emit('CANVAS:UPDATE_SHAPE', {
            strokeId: stroke.strokeId,
            startX: stroke.startX, startY: stroke.startY,
            endX: stroke.endX, endY: stroke.endY,
            width: stroke.width, height: stroke.height,
            points: stroke.points,
          });
`;
content = content.replace(updateShapeTarget, updateShapeReplacement);

// 2. Add shadow properties to shapeData
const shapeDataTarget = `
    const shapeData = {
      startX: shapeStart.current?.x, startY: shapeStart.current?.y,
      endX: pos.x, endY: pos.y,
      color, fillColor, brushSize, strokeStyle, opacity,
    };
`;
const shapeDataReplacement = `
    const shapeData = {
      startX: shapeStart.current?.x, startY: shapeStart.current?.y,
      endX: pos.x, endY: pos.y,
      color, fillColor, brushSize, strokeStyle, opacity,
      shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY,
    };
`;
content = content.replace(shapeDataTarget, shapeDataReplacement);

// 3. Add shadow properties to PEN/MARKER
const penTarget = `
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
`;

const penReplacement = `
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
`;
content = content.replace(penTarget, penReplacement);

// 4. Update Freehand push
const freehandTarget = `
    } else if (activeTool === TOOLS.FREEHAND) {
      const pts = currentPoints.current;
      let closed = false;
      if (pts.length > 2) {
        const dx = pts[pts.length - 1].x - pts[0].x;
        const dy = pts[pts.length - 1].y - pts[0].y;
        if (dx * dx + dy * dy < 400) closed = true;
      }
      drawFreehand(ctx, { points: pts, color, fillColor, brushSize, opacity, closed });
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'freehand', points: [...pts], color, fillColor, brushSize, opacity, closed, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'freehand', points: [...pts], color, fillColor, brushSize, opacity, closed, sessionId });
    }
`;
const freehandReplacement = `
    } else if (activeTool === TOOLS.FREEHAND) {
      const pts = currentPoints.current;
      let closed = false;
      if (pts.length > 2) {
        const dx = pts[pts.length - 1].x - pts[0].x;
        const dy = pts[pts.length - 1].y - pts[0].y;
        if (dx * dx + dy * dy < 400) closed = true;
      }
      const data = { points: pts, color, fillColor, brushSize, opacity, closed, shadowColor, shadowBlur, shadowOffsetX, shadowOffsetY };
      drawFreehand(ctx, data);
      localStrokes.current.push({ strokeId: currentStrokeId.current, type: 'freehand', ...data, undone: false });
      socket?.emit(SOCKET_EVENTS.CANVAS_SHAPE, { strokeId: currentStrokeId.current, type: 'freehand', ...data, sessionId });
    }
`;
content = content.replace(freehandTarget, freehandReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed little mistakes');

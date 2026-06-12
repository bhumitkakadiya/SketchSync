// Core canvas drawing utilities and replay renderer

export const clearCanvas = (canvas) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

export const drawPen = (ctx, points, color, brushSize, opacity = 1) => {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  // Smooth with quadratic bezier
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
};

export const drawEraser = (ctx, points, brushSize) => {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.lineWidth = brushSize * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
};

export const drawLine = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.strokeStyle = data.color || '#000';
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(data.startX, data.startY);
  ctx.lineTo(data.endX, data.endY);
  ctx.stroke();
  ctx.restore();
};

export const drawRect = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.strokeStyle = data.color || '#000';
  ctx.lineWidth = data.brushSize || 4;
  ctx.strokeRect(data.startX, data.startY, data.endX - data.startX, data.endY - data.startY);
  ctx.restore();
};

export const drawCircle = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.strokeStyle = data.color || '#000';
  ctx.lineWidth = data.brushSize || 4;
  const rx = Math.abs(data.endX - data.startX) / 2;
  const ry = Math.abs(data.endY - data.startY) / 2;
  const cx = Math.min(data.startX, data.endX) + rx;
  const cy = Math.min(data.startY, data.endY) + ry;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

export const drawText = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.fillStyle = data.color || '#000';
  ctx.font = `${data.fontSize || 16}px Inter, sans-serif`;
  ctx.fillText(data.text || '', data.startX, data.startY);
  ctx.restore();
};

const drawStroke = (ctx, stroke) => {
  ctx.save();
  ctx.globalAlpha = stroke.data?.opacity || 1;
  ctx.strokeStyle = stroke.data?.color || '#000000';
  ctx.lineWidth = stroke.data?.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (stroke.type) {
    case 'pen':    drawPen(ctx, stroke.data?.points, stroke.data?.color, stroke.data?.brushSize, stroke.data?.opacity);    break;
    case 'eraser': drawEraser(ctx, stroke.data?.points, stroke.data?.brushSize); break;
    case 'line':   drawLine(ctx, stroke.data);   break;
    case 'rect':   drawRect(ctx, stroke.data);   break;
    case 'circle': drawCircle(ctx, stroke.data); break;
    case 'text':   drawText(ctx, stroke.data);   break;
    default: break;
  }
  ctx.restore();
};

/**
 * Core replay renderer — renders all strokes up to targetMs
 * Used by replay engine and undo/redo
 */
export const renderUpTo = (canvas, strokes, targetMs) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const visible = strokes.filter((s) => s.timestamp <= targetMs && !s.undone);
  for (const stroke of visible) {
    drawStroke(ctx, stroke);
  }
};

/**
 * Composite preview canvas onto main canvas and clear preview
 */
export const commitPreviewToMain = (mainCanvas, previewCanvas) => {
  if (!mainCanvas || !previewCanvas) return;
  const mainCtx = mainCanvas.getContext('2d');
  mainCtx.drawImage(previewCanvas, 0, 0);
  clearCanvas(previewCanvas);
};

/**
 * Draw a single stroke on canvas (for real-time remote strokes)
 */
export const renderSingleStroke = (canvas, stroke) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  drawStroke(ctx, stroke);
};

/**
 * Get canvas as base64 PNG
 */
export const getCanvasDataURL = (canvas) => {
  if (!canvas) return null;
  return canvas.toDataURL('image/png');
};

/**
 * Draw a base64 image onto a canvas (for late-joiner state sync)
 */
export const drawImageOnCanvas = (canvas, base64) => {
  if (!canvas || !base64) return;
  const img = new Image();
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
  };
  img.src = base64;
};

// Core canvas drawing utilities and replay renderer

export const clearCanvas = (canvas) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const applyStrokeStyle = (ctx, strokeStyle) => {
  if (strokeStyle === 'dashed') ctx.setLineDash([12, 6]);
  else if (strokeStyle === 'dotted') ctx.setLineDash([3, 6]);
  else ctx.setLineDash([]);
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
  ctx.lineWidth = brushSize;
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
  applyStrokeStyle(ctx, data.strokeStyle);
  ctx.beginPath();
  ctx.moveTo(data.startX, data.startY);
  ctx.lineTo(data.endX, data.endY);
  ctx.stroke();
  ctx.restore();
};

export const drawArrow = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.strokeStyle = data.color || '#000';
  ctx.fillStyle = data.color || '#000';
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dx = data.endX - data.startX;
  const dy = data.endY - data.startY;
  const angle = Math.atan2(dy, dx);
  const headlen = Math.max(12, data.brushSize * 3);

  // Draw the main line (stop before arrowhead)
  ctx.beginPath();
  ctx.moveTo(data.startX, data.startY);
  ctx.lineTo(
    data.endX - headlen * 0.7 * Math.cos(angle),
    data.endY - headlen * 0.7 * Math.sin(angle)
  );
  ctx.stroke();

  // Draw the arrowhead
  ctx.beginPath();
  ctx.moveTo(data.endX, data.endY);
  ctx.lineTo(data.endX - headlen * Math.cos(angle - Math.PI / 6), data.endY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(data.endX - headlen * Math.cos(angle + Math.PI / 6), data.endY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const drawRect = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  applyStrokeStyle(ctx, data.strokeStyle);
  
  const x = Math.min(data.startX, data.endX);
  const y = Math.min(data.startY, data.endY);
  const w = Math.abs(data.endX - data.startX);
  const h = Math.abs(data.endY - data.startY);
  const r = data.cornerRadius || 0;

  if (r > 0) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
  }
  
  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#3B82F6';
  ctx.stroke();
  ctx.restore();
};

export const drawCircle = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  applyStrokeStyle(ctx, data.strokeStyle);
  
  const rx = Math.abs(data.endX - data.startX) / 2;
  const ry = Math.abs(data.endY - data.startY) / 2;
  const cx = Math.min(data.startX, data.endX) + rx;
  const cy = Math.min(data.startY, data.endY) + ry;
  
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  
  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#3B82F6';
  ctx.stroke();
  ctx.restore();
};

export const drawTriangle = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyStrokeStyle(ctx, data.strokeStyle);
  
  const w = Math.abs(data.endX - data.startX);
  const h = Math.abs(data.endY - data.startY);
  const minX = Math.min(data.startX, data.endX);
  const minY = Math.min(data.startY, data.endY);
  
  ctx.beginPath();
  // Isosceles triangle: top center, bottom right, bottom left
  if (data.startY < data.endY) {
    ctx.moveTo(minX + w / 2, minY);
    ctx.lineTo(minX + w, minY + h);
    ctx.lineTo(minX, minY + h);
  } else {
    ctx.moveTo(minX + w / 2, minY + h);
    ctx.lineTo(minX + w, minY);
    ctx.lineTo(minX, minY);
  }
  ctx.closePath();
  
  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#3B82F6';
  ctx.stroke();
  ctx.restore();
};

export const drawDiamond = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyStrokeStyle(ctx, data.strokeStyle);
  
  const w = Math.abs(data.endX - data.startX);
  const h = Math.abs(data.endY - data.startY);
  const minX = Math.min(data.startX, data.endX);
  const minY = Math.min(data.startY, data.endY);
  
  ctx.beginPath();
  ctx.moveTo(minX + w / 2, minY);
  ctx.lineTo(minX + w, minY + h / 2);
  ctx.lineTo(minX + w / 2, minY + h);
  ctx.lineTo(minX, minY + h / 2);
  ctx.closePath();
  
  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#3B82F6';
  ctx.stroke();
  ctx.restore();
};

export const drawStar = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  applyStrokeStyle(ctx, data.strokeStyle);
  
  const w = Math.abs(data.endX - data.startX);
  const h = Math.abs(data.endY - data.startY);
  const cx = Math.min(data.startX, data.endX) + w / 2;
  const cy = Math.min(data.startY, data.endY) + h / 2;
  const spikes = 5;
  const outerRadius = Math.min(w, h) / 2;
  const innerRadius = outerRadius / 2.5;
  
  let rot = Math.PI / 2 * 3;
  const step = Math.PI / spikes;
  
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    let x = cx + Math.cos(rot) * outerRadius;
    let y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  
  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#3B82F6';
  ctx.stroke();
  ctx.restore();
};

export const drawText = (ctx, data) => {
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  ctx.fillStyle = data.color || '#000';
  const ff = data.fontFamily || 'Inter';
  const bold = data.bold ? 'bold ' : '';
  const italic = data.italic ? 'italic ' : '';
  ctx.font = `${italic}${bold}${data.fontSize || 18}px ${ff}, sans-serif`;
  
  // Support multi-line
  const lines = (data.text || '').split('\n');
  const lineHeight = (data.fontSize || 18) * 1.4;
  lines.forEach((line, i) => {
    ctx.fillText(line, data.startX, data.startY + i * lineHeight);
  });
  ctx.restore();
};

export const drawCustomImage = (ctx, data) => {
  if (!data.base64) return;
  ctx.save();
  ctx.globalAlpha = data.opacity || 1;
  const img = new Image();
  const draw = () => {
    ctx.drawImage(img, data.startX, data.startY, data.width, data.height);
    ctx.restore();
  };
  if (data._imgCache && data._imgCache.complete) {
    ctx.drawImage(data._imgCache, data.startX, data.startY, data.width, data.height);
    ctx.restore();
    return;
  }
  img.onload = () => {
    data._imgCache = img;
    draw();
  };
  img.src = data.base64;
  if (img.complete) draw();
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
    case 'marker': drawPen(ctx, stroke.data?.points, stroke.data?.color, (stroke.data?.brushSize || 4) * 2, stroke.data?.opacity || 0.8); break;
    case 'highlighter': drawPen(ctx, stroke.data?.points, stroke.data?.color, stroke.data?.brushSize, 0.3); break;
    case 'eraser': drawEraser(ctx, stroke.data?.points, stroke.data?.brushSize); break;
    case 'line':   drawLine(ctx, stroke.data);   break;
    case 'arrow':  drawArrow(ctx, stroke.data);  break;
    case 'rect':   drawRect(ctx, stroke.data);   break;
    case 'circle': drawCircle(ctx, stroke.data); break;
    case 'triangle': drawTriangle(ctx, stroke.data); break;
    case 'diamond': drawDiamond(ctx, stroke.data); break;
    case 'star':   drawStar(ctx, stroke.data); break;
    case 'text':   drawText(ctx, stroke.data);   break;
    case 'image':  drawCustomImage(ctx, stroke.data); break;
    default: break;
  }
  ctx.restore();
};

/**
 * Core replay renderer — renders all strokes up to targetMs
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;
};

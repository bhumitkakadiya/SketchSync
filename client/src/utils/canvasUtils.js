// Core canvas drawing utilities and replay renderer

export const clearCanvas = (canvas) => {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

export const applyShadowAndTransform = (ctx, data) => {
  if (!data) return;
  if (data.shadowColor && data.shadowColor !== 'transparent') {
    ctx.shadowColor = data.shadowColor;
    ctx.shadowBlur = data.shadowBlur || 0;
    ctx.shadowOffsetX = data.shadowOffsetX || 0;
    ctx.shadowOffsetY = data.shadowOffsetY || 0;
  }
  if (data.flipX || data.flipY) {
    let cx, cy;
    if (data.type === 'image') {
      cx = data.startX + (data.width || 0) / 2;
      cy = data.startY + (data.height || 0) / 2;
    } else if (data.startX !== undefined && data.endX !== undefined) {
      cx = (data.startX + data.endX) / 2;
      cy = (data.startY + data.endY) / 2;
    } else if (data.points && data.points.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      data.points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      cx = (minX + maxX) / 2;
      cy = (minY + maxY) / 2;
    } else if (data.startX !== undefined && data.startY !== undefined) {
      cx = data.startX;
      cy = data.startY;
    }
    if (cx !== undefined && cy !== undefined) {
      ctx.translate(cx, cy);
      ctx.scale(data.flipX ? -1 : 1, data.flipY ? -1 : 1);
      ctx.translate(-cx, -cy);
    }
  }
};

const applyStrokeStyle = (ctx, strokeStyle) => {
  if (strokeStyle === 'dashed') ctx.setLineDash([12, 6]);
  else if (strokeStyle === 'dotted') ctx.setLineDash([3, 6]);
  else ctx.setLineDash([]);
};

export const drawPen = (ctx, points, color, brushSize, opacity = 1, data = null) => {
  if (!points || points.length < 2) return;
  ctx.save();
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
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
  applyShadowAndTransform(ctx, data);
  ctx.globalAlpha = data.opacity || 1;
  ctx.fillStyle = data.color || '#000';
  ctx.textBaseline = 'top'; // Align text correctly within its bounding box
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
  applyShadowAndTransform(ctx, data);
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

export const drawFreehand = (ctx, data) => {
  if (!data.points || data.points.length < 2) return;
  ctx.save();
  applyShadowAndTransform(ctx, data);
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(data.points[0].x, data.points[0].y);
  for (let i = 1; i < data.points.length - 1; i++) {
    const mx = (data.points[i].x + data.points[i + 1].x) / 2;
    const my = (data.points[i].y + data.points[i + 1].y) / 2;
    ctx.quadraticCurveTo(data.points[i].x, data.points[i].y, mx, my);
  }
  const last = data.points[data.points.length - 1];
  ctx.lineTo(last.x, last.y);

  if (data.closed) ctx.closePath();

  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#000';
  ctx.stroke();
  ctx.restore();
};

export const drawPolygon = (ctx, data) => {
  if (!data.points || data.points.length === 0) return;
  ctx.save();
  applyShadowAndTransform(ctx, data);
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(data.points[0].x, data.points[0].y);
  for (let i = 1; i < data.points.length; i++) {
    ctx.lineTo(data.points[i].x, data.points[i].y);
  }
  if (data.closed) ctx.closePath();

  if (data.fillColor && data.fillColor !== 'transparent') {
    ctx.fillStyle = data.fillColor;
    if (data.closed || data.points.length > 2) ctx.fill();
  }
  ctx.strokeStyle = data.color || '#000';
  ctx.stroke();
  ctx.restore();
};

export const drawBezier = (ctx, data) => {
  if (!data.points || data.points.length < 2) return;
  ctx.save();
  applyShadowAndTransform(ctx, data);
  ctx.globalAlpha = data.opacity || 1;
  ctx.lineWidth = data.brushSize || 4;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  const pts = data.points;
  ctx.moveTo(pts[0].x, pts[0].y);
  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else if (pts.length === 3) {
    ctx.quadraticCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y);
  } else if (pts.length >= 4) {
    ctx.bezierCurveTo(pts[1].x, pts[1].y, pts[2].x, pts[2].y, pts[3].x, pts[3].y);
  }
  
  if (data.fillColor && data.fillColor !== 'transparent' && pts.length >= 3) {
    ctx.fillStyle = data.fillColor;
    ctx.fill();
  }
  ctx.strokeStyle = data.color || '#000';
  ctx.stroke();
  ctx.restore();
};

export const drawDoubleArrow = (ctx, data) => {
  ctx.save();
  applyShadowAndTransform(ctx, data);
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

  ctx.beginPath();
  ctx.moveTo(data.startX + headlen * 0.7 * Math.cos(angle), data.startY + headlen * 0.7 * Math.sin(angle));
  ctx.lineTo(data.endX - headlen * 0.7 * Math.cos(angle), data.endY - headlen * 0.7 * Math.sin(angle));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(data.endX, data.endY);
  ctx.lineTo(data.endX - headlen * Math.cos(angle - Math.PI / 6), data.endY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(data.endX - headlen * Math.cos(angle + Math.PI / 6), data.endY - headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(data.startX, data.startY);
  ctx.lineTo(data.startX + headlen * Math.cos(angle - Math.PI / 6), data.startY + headlen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(data.startX + headlen * Math.cos(angle + Math.PI / 6), data.startY + headlen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
};

export const drawFrame = (ctx, data) => {
  ctx.save();
  applyShadowAndTransform(ctx, data);
  ctx.globalAlpha = data.opacity || 1;
  
  const x = Math.min(data.startX, data.endX);
  const y = Math.min(data.startY, data.endY);
  const w = Math.abs(data.endX - data.startX);
  const h = Math.abs(data.endY - data.startY);

  ctx.fillStyle = data.fillColor && data.fillColor !== 'transparent' ? data.fillColor : '#f3f4f6';
  ctx.fillRect(x, y, w, h);
  
  ctx.strokeStyle = data.color || '#9ca3af';
  ctx.lineWidth = data.brushSize || 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = data.color || '#9ca3af';
  ctx.font = '12px Inter, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.fillText(data.text || 'Frame', x, y - 4);
  
  ctx.restore();
};

export const drawSlide = (ctx, data) => {
  ctx.save();
  applyShadowAndTransform(ctx, data);
  ctx.globalAlpha = data.opacity || 1;
  
  let x = Math.min(data.startX, data.endX);
  let y = Math.min(data.startY, data.endY);
  let w = Math.abs(data.endX - data.startX);
  let h = w * (9 / 16);
  if (data.startY > data.endY) y = data.startY - h;
  
  ctx.shadowColor = 'rgba(0,0,0,0.1)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = data.fillColor && data.fillColor !== 'transparent' ? data.fillColor : '#ffffff';
  ctx.fillRect(x, y, w, h);
  
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = data.color || '#e5e7eb';
  ctx.lineWidth = data.brushSize || 1;
  ctx.strokeRect(x, y, w, h);

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
    case 'text':
    case 'text_heading':
    case 'text_bullet':
    case 'text_numbered': drawText(ctx, stroke.data); break;
    case 'image':  drawCustomImage(ctx, stroke.data); break;
    case 'freehand': drawFreehand(ctx, stroke.data); break;
    case 'polygon': drawPolygon(ctx, stroke.data); break;
    case 'bezier': drawBezier(ctx, stroke.data); break;
    case 'double_arrow': drawDoubleArrow(ctx, stroke.data); break;
    case 'frame': drawFrame(ctx, stroke.data); break;
    case 'slide': drawSlide(ctx, stroke.data); break;
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

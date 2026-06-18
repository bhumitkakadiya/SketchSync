const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'components', 'canvas', 'Canvas.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `
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
`;

const replacement = `
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
`;

content = content.replace(target, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed redrawMainCanvas');

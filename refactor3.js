const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'components', 'canvas', 'Canvas.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update initialStrokeState to include points
content = content.replace(
  /initialStrokeState\.current = \{ x, y, w, h, clickX: pos\.x, clickY: pos\.y, fontSize: stroke\.fontSize \};/,
  'initialStrokeState.current = { x, y, w, h, clickX: pos.x, clickY: pos.y, fontSize: stroke.fontSize, points: stroke.points ? stroke.points.map(p => ({...p})) : null };'
);

// 2. Update dragStartOffset to include clickX, clickY and initialStrokeState points
content = content.replace(
  /dragStartOffset\.current = \{\s*x: pos\.x - stroke\.startX,\s*y: pos\.y - stroke\.startY,\s*x2: stroke\.endX !== undefined \? pos\.x - stroke\.endX : 0,\s*y2: stroke\.endY !== undefined \? pos\.y - stroke\.endY : 0,\s*\};/,
  'dragStartOffset.current = { x: pos.x - (stroke.startX || 0), y: pos.y - (stroke.startY || 0), x2: stroke.endX !== undefined ? pos.x - stroke.endX : 0, y2: stroke.endY !== undefined ? pos.y - stroke.endY : 0, clickX: pos.x, clickY: pos.y };\\n            initialStrokeState.current = { points: stroke.points ? stroke.points.map(p => ({...p})) : null };'
);

// 3. Update resize logic block in onPointerMove
const resizeTarget = `
        if (stroke.type === 'image') {
          if (resizeHandle.current === 'se') { stroke.width = Math.max(minS, w + dx); stroke.height = Math.max(minS, h + dy); }
          else if (resizeHandle.current === 'sw') { stroke.width = Math.max(minS, w - dx); stroke.height = Math.max(minS, h + dy); if (w - dx >= minS) stroke.startX = x + dx; }
          else if (resizeHandle.current === 'ne') { stroke.width = Math.max(minS, w + dx); stroke.height = Math.max(minS, h - dy); if (h - dy >= minS) stroke.startY = y + dy; }
          else if (resizeHandle.current === 'nw') { stroke.width = Math.max(minS, w - dx); stroke.height = Math.max(minS, h - dy); if (w - dx >= minS) stroke.startX = x + dx; if (h - dy >= minS) stroke.startY = y + dy; }
        } else if (stroke.type === 'text') {`;

const resizeReplacement = `
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
        } else if (stroke.type === 'text') {`;

content = content.replace(resizeTarget, resizeReplacement);

// 4. Update drag logic block in onPointerMove
const dragTarget = `
      } else {
        stroke.startX = pos.x - dragStartOffset.current.x;
        stroke.startY = pos.y - dragStartOffset.current.y;
        if (stroke.endX !== undefined) {
          stroke.endX = pos.x - dragStartOffset.current.x2;
          stroke.endY = pos.y - dragStartOffset.current.y2;
        }
      }
`;

const dragReplacement = `
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
`;

content = content.replace(dragTarget, dragReplacement);

// 5. Fix onDoubleClick duplicate coords
const dblClickTarget = `
        currentPoints.current.pop(); // Remove the extra point from the second click
        isDrawing.current = false;
`;

const dblClickReplacement = `
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
`;

content = content.replace(dblClickTarget, dblClickReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactor3 complete');

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'components', 'canvas', 'Canvas.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const utilsToAdd = `
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
`;

// Insert utils after refs
content = content.replace('const mousePosRef = useRef(null);', 'const mousePosRef = useRef(null);\n' + utilsToAdd);

// Replace array includes
content = content.replace(/\['image', 'rect', 'circle', 'line', 'arrow', 'text'\].includes\(stroke.type\)/g, 'isSelectableType(stroke.type)');

// Replace repetitive bounding box code
const bboxRegex = /let x, y, w, h;\s*if \(stroke\.type === 'image'\) \{\s*x = stroke\.startX; y = stroke\.startY; w = stroke\.width; h = stroke\.height;\s*\} else \{\s*x = Math\.min\(stroke\.startX, stroke\.endX\);\s*y = Math\.min\(stroke\.startY, stroke\.endY\);\s*w = Math\.abs\(stroke\.endX - stroke\.startX\);\s*h = Math\.abs\(stroke\.endY - stroke\.startY\);\s*\}/g;

content = content.replace(bboxRegex, 'const { x, y, w, h } = getStrokeBoundingBox(stroke);');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Refactor complete');

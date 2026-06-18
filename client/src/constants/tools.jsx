import React from 'react';

export const TOOLS = {
  SELECT: 'select',
  PAN: 'pan',
  PEN: 'pen',
  HIGHLIGHTER: 'highlighter',
  MARKER: 'marker',
  ERASER: 'eraser',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
  DIAMOND: 'diamond',
  STAR: 'star',
  ARROW: 'arrow',
  
  TEXT: 'text',
  TEXT_HEADING: 'text_heading',
  TEXT_BULLET: 'text_bullet',
  TEXT_NUMBERED: 'text_numbered',
  STICKY_NOTE: 'sticky_note',
  
  FREEHAND: 'freehand',
  POLYGON: 'polygon',
  BEZIER: 'bezier',
  DOUBLE_ARROW: 'double_arrow',
  FRAME: 'frame',
  SLIDE: 'slide',

  LASER: 'laser',
};

export const TOOL_LIST = [
  // --- SHAPE & DRAWING ---
  {
    id: TOOLS.SELECT, label: 'Select', shortcut: 'V', category: 'draw',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
  },
  {
    id: TOOLS.PEN, label: 'Pen', shortcut: 'P', category: 'draw',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  },
  {
    id: TOOLS.HIGHLIGHTER, label: 'Highlighter', shortcut: 'H', category: 'draw',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.385 14.288l1.328 1.328a3 3 0 004.243 0l6.59-6.59a3 3 0 000-4.243l-1.328-1.328a3 3 0 00-4.243 0l-6.59 6.59a3 3 0 000 4.243zM3 21h18M8.5 9.5l7 7" /></svg>
  },
  {
    id: TOOLS.MARKER, label: 'Marker', shortcut: 'M', category: 'draw',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-4 4" /></svg>
  },
  {
    id: TOOLS.ERASER, label: 'Eraser', shortcut: 'E', category: 'draw',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14l-4 4a2.828 2.828 0 01-4 0l-7-7a2.828 2.828 0 010-4l4-4a2.828 2.828 0 014 0l7 7a2.828 2.828 0 010 4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 22H9" /></svg>
  },
  {
    id: TOOLS.LINE, label: 'Line', shortcut: 'L', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" /></svg>
  },
  {
    id: TOOLS.FREEHAND, label: 'Freehand Shape', shortcut: 'F', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
  },
  {
    id: TOOLS.POLYGON, label: 'Polygon', shortcut: 'G', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l8 6v8l-8 6-8-6V8l8-6z" /></svg>
  },
  {
    id: TOOLS.BEZIER, label: 'Bezier Curve', shortcut: 'B', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12c0-4.418-4.03-8-9-8S3 7.582 3 12c0 2.21 1.007 4.21 2.636 5.656C7.265 19.102 9.53 20 12 20c4.97 0 9-3.582 9-8z" /></svg>
  },
  {
    id: TOOLS.RECT, label: 'Rectangle', shortcut: 'R', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="4" y="6" width="16" height="12" rx="2" /></svg>
  },
  {
    id: TOOLS.CIRCLE, label: 'Circle', shortcut: 'C', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="8" /></svg>
  },
  {
    id: TOOLS.TRIANGLE, label: 'Triangle', shortcut: 'Y', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4l8 14H4L12 4z" /></svg>
  },
  {
    id: TOOLS.DIAMOND, label: 'Diamond', shortcut: 'I', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 9-8 9-8-9 8-9z" /></svg>
  },
  {
    id: TOOLS.STAR, label: 'Star', shortcut: 'S', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" /></svg>
  },
  {
    id: TOOLS.ARROW, label: 'Arrow', shortcut: 'A', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
  },
  {
    id: TOOLS.DOUBLE_ARROW, label: 'Double Arrow', shortcut: 'Shift+A', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7L3 12l5 5m8-10l5 5-5 5M3 12h18" /></svg>
  },
  {
    id: TOOLS.FRAME, label: 'Frame', shortcut: 'Shift+F', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v2h10a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /></svg>
  },
  {
    id: TOOLS.SLIDE, label: 'Presentation Slide', shortcut: 'Shift+S', category: 'shape',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="3" y="6" width="18" height="12" rx="1" /><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" /></svg>
  },
  
  // --- TEXT & TYPOGRAPHY ---
  {
    id: TOOLS.TEXT, label: 'Text', shortcut: 'T', category: 'text',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5h18v2M12 5v14m-4 0h8" /></svg>
  },
  {
    id: TOOLS.TEXT_HEADING, label: 'Heading Text', shortcut: 'Shift+T', category: 'text',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M7 12h10" /></svg>
  },
  {
    id: TOOLS.TEXT_BULLET, label: 'Bullet List', shortcut: 'Shift+B', category: 'text',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h.01M4 12h.01M4 18h.01M8 6h12M8 12h12M8 18h12" /></svg>
  },
  {
    id: TOOLS.TEXT_NUMBERED, label: 'Numbered List', shortcut: 'Shift+N', category: 'text',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h1.5v12M8 6h12M8 12h12M8 18h12" /></svg>
  },
  {
    id: TOOLS.STICKY_NOTE, label: 'Sticky Note', shortcut: 'N', category: 'text',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  },
  
  // --- MEDIA / OTHER ---
  {
    id: TOOLS.LASER, label: 'Laser Pointer', shortcut: 'K', category: 'media',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
  },
];

export const DEFAULT_COLORS = [
  '#000000', '#ffffff', '#EF4444', '#F59E0B',
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
  '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export const BRUSH_SIZES = [2, 4, 8, 12, 20, 32];
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

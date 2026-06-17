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
  STICKY_NOTE: 'sticky_note',
  LASER: 'laser',
};

export const TOOL_LIST = [
  {
    id: TOOLS.SELECT, label: 'Select', shortcut: 'V',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
  },
  {
    id: TOOLS.PEN, label: 'Pen', shortcut: 'P',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  },
  {
    id: TOOLS.HIGHLIGHTER, label: 'Highlighter', shortcut: 'H',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
  },
  {
    id: TOOLS.MARKER, label: 'Marker', shortcut: 'M',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-4 4" /></svg>
  },
  {
    id: TOOLS.ERASER, label: 'Eraser', shortcut: 'E',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14l-4 4a2.828 2.828 0 01-4 0l-7-7a2.828 2.828 0 010-4l4-4a2.828 2.828 0 014 0l7 7a2.828 2.828 0 010 4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 22H9" /></svg>
  },
  {
    id: TOOLS.LINE, label: 'Line', shortcut: 'L',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" /></svg>
  },
  {
    id: TOOLS.RECT, label: 'Rectangle', shortcut: 'R',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="4" y="6" width="16" height="12" rx="2" /></svg>
  },
  {
    id: TOOLS.CIRCLE, label: 'Circle', shortcut: 'C',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="8" /></svg>
  },
  {
    id: TOOLS.TRIANGLE, label: 'Triangle', shortcut: 'Y',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4l8 14H4L12 4z" /></svg>
  },
  {
    id: TOOLS.DIAMOND, label: 'Diamond', shortcut: 'I',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8 9-8 9-8-9 8-9z" /></svg>
  },
  {
    id: TOOLS.STAR, label: 'Star', shortcut: 'S',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" /></svg>
  },
  {
    id: TOOLS.ARROW, label: 'Arrow', shortcut: 'A',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
  },
  {
    id: TOOLS.TEXT, label: 'Text', shortcut: 'T',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5h18v2M12 5v14m-4 0h8" /></svg>
  },
  {
    id: TOOLS.STICKY_NOTE, label: 'Sticky Note', shortcut: 'N',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
  },
  {
    id: TOOLS.LASER, label: 'Laser Pointer', shortcut: 'K',
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

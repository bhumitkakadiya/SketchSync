import React from 'react';

export const TOOLS = {
  PEN: 'pen',
  HIGHLIGHTER: 'highlighter',
  ERASER: 'eraser',
  LINE: 'line',
  RECT: 'rect',
  CIRCLE: 'circle',
  TEXT: 'text',
  STICKY_NOTE: 'sticky_note',
};

export const TOOL_LIST = [
  { id: TOOLS.PEN,         label: 'Pen',         icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg> },
  { id: TOOLS.HIGHLIGHTER, label: 'Highlighter', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg> },
  { id: TOOLS.ERASER,      label: 'Eraser',      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.5 14l-4 4a2.828 2.828 0 0 1-4 0l-7-7a2.828 2.828 0 0 1 0-4l4-4a2.828 2.828 0 0 1 4 0l7 7a2.828 2.828 0 0 1 0 4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M14.5 9.5L9.5 14.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M22 22H9" /></svg> },
  { id: TOOLS.LINE,        label: 'Line',        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" /></svg> },
  { id: TOOLS.RECT,        label: 'Rect',        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="4" y="6" width="16" height="12" rx="2" /></svg> },
  { id: TOOLS.CIRCLE,      label: 'Circle',      icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="8" /></svg> },
  { id: TOOLS.TEXT,        label: 'Text',        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5h18v2M12 5v14m-4 0h8" /></svg> },
  { id: TOOLS.STICKY_NOTE, label: 'Sticky Note', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
];

export const DEFAULT_COLORS = [
  '#000000', '#ffffff', '#EF4444', '#F59E0B',
  '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
  '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export const BRUSH_SIZES = [2, 4, 8, 12, 20, 32];
export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4];

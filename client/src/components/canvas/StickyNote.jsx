import { useState, useRef, useCallback } from 'react';

const NOTE_COLORS = [
  { bg: '#FEF08A', text: '#713f12', label: 'Yellow' },
  { bg: '#FCA5A5', text: '#7f1d1d', label: 'Red' },
  { bg: '#86EFAC', text: '#14532d', label: 'Green' },
  { bg: '#93C5FD', text: '#1e3a5f', label: 'Blue' },
  { bg: '#D8B4FE', text: '#4a1d96', label: 'Purple' },
  { bg: '#FD7EAC', text: '#831843', label: 'Pink' },
  { bg: '#6EE7B7', text: '#064e3b', label: 'Teal' },
  { bg: '#FED7AA', text: '#7c2d12', label: 'Orange' },
];

export default function StickyNote({ note, onUpdate, onRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(note.isNew || false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const noteRef = useRef(null);

  const colorConfig = NOTE_COLORS.find(c => c.bg === note.color) || NOTE_COLORS[0];

  const onMouseDown = useCallback((e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    e.preventDefault();
    const rect = noteRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);

    const onMouseMove = (e) => {
      if (!noteRef.current) return;
      const parentRect = noteRef.current.parentElement.getBoundingClientRect();
      const x = e.clientX - parentRect.left - dragOffset.current.x;
      const y = e.clientY - parentRect.top - dragOffset.current.y;
      onUpdate(note.id, { x: Math.max(0, x), y: Math.max(0, y) });
    };
    const onMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [note.id, onUpdate]);

  return (
    <div
      ref={noteRef}
      className="absolute rounded-xl shadow-lg select-none group"
      style={{
        left: note.x,
        top: note.y,
        width: 180,
        minHeight: 120,
        backgroundColor: colorConfig.bg,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 20,
        transform: isDragging ? 'scale(1.02) rotate(1deg)' : 'rotate(0)',
        transition: isDragging ? 'none' : 'transform 0.15s ease, box-shadow 0.15s ease',
        boxShadow: isDragging ? '0 12px 30px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.15)',
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-2 pt-1.5 pb-1" style={{ borderBottom: `1px solid ${colorConfig.text}20` }}>
        {/* Color picker dots */}
        <div className="flex gap-1">
          {NOTE_COLORS.slice(0, 4).map(c => (
            <button
              key={c.bg}
              onClick={() => onUpdate(note.id, { color: c.bg })}
              className="w-3 h-3 rounded-full hover:scale-125 transition-transform"
              style={{ backgroundColor: c.bg, border: `1.5px solid ${c.text}40` }}
            />
          ))}
        </div>
        <button
          onClick={() => onRemove(note.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/10"
          style={{ color: colorConfig.text }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Text area */}
      <textarea
        className="w-full p-2 text-sm font-medium resize-none bg-transparent border-none outline-none leading-relaxed"
        style={{ color: colorConfig.text, minHeight: 80 }}
        value={note.text}
        onChange={(e) => onUpdate(note.id, { text: e.target.value })}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        placeholder="Type a note..."
        rows={4}
      />
    </div>
  );
}

import { useRoomStore } from '../../store/roomStore';

export default function UserCursors() {
  const cursors = useRoomStore((s) => s.cursors);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {Object.entries(cursors).map(([userId, cursor]) => (
        <div
          key={userId}
          className="absolute transition-all duration-75"
          style={{ left: cursor.x, top: cursor.y, transform: 'translate(-4px, -4px)' }}
        >
          {/* Cursor dot */}
          <div
            className="w-3 h-3 rounded-full shadow-lg border-2 border-white"
            style={{ backgroundColor: cursor.color }}
          />
          {/* Name tag */}
          <div
            className="absolute left-4 top-0 px-2 py-0.5 rounded-md text-xs text-white whitespace-nowrap font-medium shadow-lg"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.username || 'Anonymous'}
          </div>
        </div>
      ))}
    </div>
  );
}

import { useRoomStore } from '../../store/roomStore';

export default function UserCursors() {
  const cursors = useRoomStore((s) => s.cursors);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {Object.entries(cursors).map(([userId, cursor]) => {
        const isLaser = cursor.tool === 'laser';
        return (
          <div
            key={userId}
            className={`absolute ${isLaser ? '' : 'transition-all duration-75'}`}
            style={{ left: cursor.x, top: cursor.y, transform: 'translate(-4px, -4px)' }}
          >
            {/* Cursor dot */}
            <div
              className={`rounded-full shadow-lg ${isLaser ? 'w-4 h-4 bg-red-500 shadow-glow-md animate-pulse' : 'w-3 h-3 border-2 border-white'}`}
              style={{ backgroundColor: isLaser ? '#ef4444' : cursor.color }}
            />
            {/* Name tag */}
            {!isLaser && (
              <div
                className="absolute left-4 top-0 px-2 py-0.5 rounded-md text-xs text-white whitespace-nowrap font-medium shadow-lg"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.username || 'Anonymous'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

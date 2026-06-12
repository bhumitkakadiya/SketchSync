import { Link, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { roomService } from '../../services/roomService';
import { useSocket } from '../../hooks/useSocket';
import ThemeToggle from '../ThemeToggle';

export default function RoomHeader({ room, sessions = [] }) {
  const navigate = useNavigate();
  const { activeUsers, isConnected } = useRoomStore();
  const { user } = useAuthStore();
  const socket = useSocket();

  const isOwner = user?._id === room?.owner?._id || user?._id === room?.owner;

  const handleLeave = async () => {
    try {
      socket.emit('ROOM:LEAVE', { roomId: room?._id });
      await roomService.leave(room?._id);
    } catch (e) {
      console.error(e);
    }
    navigate('/dashboard');
  };

  const handleEndSession = () => {
    if (confirm('Are you sure you want to end this session for everyone?')) {
      socket.emit('ROOM:END', { roomId: room?._id });
      navigate('/dashboard');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
  };

  return (
    <header className="glass-dark border-b border-white/[0.06] px-5 py-3 flex items-center justify-between z-20 flex-shrink-0">
      {/* Left: Brand + Room name */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.png" alt="SketchSync" className="w-7 h-7 rounded-lg object-cover" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{room?.name || 'Loading...'}</h1>
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400' : 'bg-red-400 animate-pulse'}`} />
          </div>
          <button
            id="copy-room-code"
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 text-xs transition-colors mt-0.5 group"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span className="font-mono px-1.5 py-0.5 rounded transition-colors group-hover:text-current" style={{ background: 'var(--bg-hover)' }}>
              {room?.code}
            </span>
            <svg className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity theme-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Right: Active users + Replay */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Active users avatars */}
        <div className="flex items-center -space-x-2">
          {/* Current user */}
          <div
            className="w-7 h-7 rounded-full border-2 border-surface-100 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: user?.cursorColor || '#6366f1', zIndex: activeUsers.length + 1 }}
            title={user?.displayName || user?.username}
          >
            {(user?.displayName || user?.username || '?')[0].toUpperCase()}
          </div>
          {activeUsers.slice(0, 4).map((u, i) => (
            <div
              key={u.userId}
              className="w-7 h-7 rounded-full border-2 border-surface-100 flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: u.color || '#6366f1', zIndex: activeUsers.length - i }}
              title={u.displayName || u.username}
            >
              {(u.displayName || u.username || '?')[0].toUpperCase()}
            </div>
          ))}
          {activeUsers.length > 4 && (
            <div className="w-7 h-7 rounded-full border-2 border-surface-100 flex items-center justify-center text-xs" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              +{activeUsers.length - 4}
            </div>
          )}
        </div>

        {/* Sessions / Replay */}
        {sessions.length > 0 && (
          <button
            id="view-replays-btn"
            onClick={() => navigate(`/replay/${sessions[0]._id}`)}
            className="btn-secondary py-1.5 px-3 text-xs gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Replay
          </button>
        )}

        <ThemeToggle />

        {isOwner ? (
          <button onClick={handleEndSession} className="btn-danger py-1.5 px-3 text-xs shadow-glow-sm hover:shadow-glow-md">
            End Session
          </button>
        ) : (
          <button onClick={handleLeave} className="btn-ghost py-1.5 px-3 text-xs">
            Leave
          </button>
        )}
      </div>
    </header>
  );
}

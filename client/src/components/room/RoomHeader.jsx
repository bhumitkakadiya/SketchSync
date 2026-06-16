import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useCanvasStore } from '../../store/canvasStore';
import { roomService } from '../../services/roomService';
import { useSocket } from '../../hooks/useSocket';
import { useChatStore } from '../../store/chatStore';
import ThemeToggle from '../ThemeToggle';

export default function RoomHeader({ room, sessions = [] }) {
  const navigate = useNavigate();
  const { activeUsers, isConnected } = useRoomStore();
  const { user } = useAuthStore();
  const { toggleAI } = useCanvasStore();
  const socket = useSocket();
  const { unreadCount, isOpen, setIsOpen } = useChatStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = user?._id?.toString() === room?.owner?._id?.toString() || user?._id?.toString() === room?.owner?.toString();

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

  const handleDeleteRoom = async () => {
    try {
      await roomService.delete(room?._id);
      socket.emit('ROOM:END', { roomId: room?._id });
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to delete room');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room?.code || '');
  };

  return (
    <header className="bg-transparent px-5 py-3 flex items-center justify-between z-20 flex-shrink-0">
      {/* Left: Brand + Room name */}
      <div className="flex items-center gap-4 min-w-0">
        <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0" title="Back to Dashboard">
          <svg className="w-5 h-5 opacity-70 hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
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
        <div className="flex items-center -space-x-3 mr-2">
          {/* Current user */}
          <div
            className="w-10 h-10 rounded-xl shadow-glow-sm flex items-center justify-center text-sm font-bold text-white flex-shrink-0 relative border-[3px] border-surface-100"
            style={{ backgroundColor: user?.cursorColor || 'var(--color-brand)', zIndex: activeUsers.length + 1 }}
            title={user?.displayName || user?.username}
          >
            {(user?.displayName || user?.username || '?')[0].toUpperCase()}
          </div>
          {activeUsers.slice(0, 4).map((u, i) => (
            <div
              key={u.userId}
              className="w-10 h-10 rounded-xl shadow-glow-sm flex items-center justify-center text-sm font-bold text-white relative border-[3px] border-surface-100"
              style={{ backgroundColor: u.color || 'var(--color-brand)', zIndex: activeUsers.length - i }}
              title={u.displayName || u.username}
            >
              {(u.displayName || u.username || '?')[0].toUpperCase()}
            </div>
          ))}
          {activeUsers.length > 4 && (
            <div className="w-10 h-10 rounded-xl border-[3px] border-surface-100 flex items-center justify-center text-sm font-bold shadow-sm" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
              +{activeUsers.length - 4}
            </div>
          )}
        </div>

        {/* Sessions / Replay */}
        {sessions.length > 0 && (
          <button
            id="view-replays-btn"
            onClick={() => navigate(`/replay/${sessions[0]._id}`)}
            className="btn-secondary hidden md:flex"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Replay
          </button>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`btn-ghost relative ${isOpen ? 'bg-white/10' : ''}`}
          title="Toggle Chat"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
              {unreadCount}
            </span>
          )}
        </button>

        {/* AI Toggle */}
        <button
          onClick={toggleAI}
          className="btn-ghost hidden md:flex text-brand-500 hover:text-brand-400"
          title="AI Assistant"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Ask AI
        </button>

        <ThemeToggle />

        {isOwner ? (
          <div className="flex items-center gap-2">
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
                <span className="text-sm text-red-500 font-medium mr-2">Delete Room?</span>
                <button onClick={handleDeleteRoom} className="btn-danger p-1">Yes</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost p-1">No</button>
              </div>
            ) : (
              <button onClick={() => setShowDeleteConfirm(true)} className="btn-danger">
                Delete Room
              </button>
            )}
            <button onClick={handleEndSession} className="btn-secondary">
              End Session
            </button>
          </div>
        ) : (
          <button onClick={handleLeave} className="btn-ghost">
            Leave
          </button>
        )}
      </div>
    </header>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRoomStore } from '../../store/roomStore';
import { useAuthStore } from '../../store/authStore';
import { useCanvasStore } from '../../store/canvasStore';
import { roomService } from '../../services/roomService';
import { useSocket } from '../../hooks/useSocket';
import { useChatStore } from '../../store/chatStore';
import ThemeToggle from '../ThemeToggle';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import toast from 'react-hot-toast';

export default function RoomHeader({ room, sessions = [], currentPageIndex = 0, sessionId }) {
  const navigate = useNavigate();
  const { activeUsers, isConnected } = useRoomStore();
  const { user } = useAuthStore();
  const { toggleAI } = useCanvasStore();
  const socket = useSocket();
  const { unreadCount, isOpen, setIsOpen } = useChatStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { undo, redo, activeTool } = useCanvasStore();
  const { pageCount } = useRoomStore();
  const [isCopied, setIsCopied] = useState(false);

  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  const copyToClipboard = async (text) => {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Async: Could not copy text: ', err);
      fallbackCopyTextToClipboard(text);
    }
  };

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

  const handleCopyCode = async () => {
    await copyToClipboard(room?.code || '');
    toast.success('Room code copied!');
  };

  const handleShare = async () => {
    const shareData = {
      title: room?.name || 'SketchSync Room',
      text: 'Join my SketchSync room to collaborate in real-time!',
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await copyToClipboard(window.location.href);
        setIsCopied(true);
        toast.success('Room link copied!');
        setTimeout(() => setIsCopied(false), 2000);
      }
    } catch (err) {
      // User cancelled share or it failed
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        await copyToClipboard(window.location.href);
        setIsCopied(true);
        toast.success('Room link copied!');
        setTimeout(() => setIsCopied(false), 2000);
      }
    }
  };

  return (
    <header className="px-4 py-2 flex items-center justify-between z-50 flex-shrink-0 h-12 shadow-sm transition-colors" style={{
      background: 'var(--header-bg)',
      borderBottom: '1px solid var(--header-border)'
    }}>
      {/* Left: Brand + Room name */}
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/dashboard" className="flex items-center gap-1.5 flex-shrink-0 hover:opacity-80 transition-opacity" style={{ color: '#00C896' }} title="Back to Dashboard">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="w-px h-5 mx-1" style={{ background: 'rgba(0,200,150,0.2)' }} />
        <div className="flex items-center gap-2 min-w-0 group">
          <h1 className="text-base font-bold truncate transition-colors" style={{ color: 'var(--text-primary)' }}>
            {room?.name || 'Loading...'}
          </h1>
          <button
            id="copy-room-code"
            onClick={handleCopyCode}
            className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full transition-colors hover:bg-brand-500/20 font-mono font-medium"
            style={{ background: 'rgba(0,200,150,0.12)', color: '#00C896', border: '1px solid rgba(0,200,150,0.3)' }}
            title="Copy Room ID"
          >
            {room?.code}
          </button>
        </div>
      </div>

      {/* Right: Active users + Actions */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Undo / Redo */}
        <div className="hidden md:flex items-center gap-0.5 mr-2">
          <button 
            onClick={() => { const sid = undo(); if(sid) { socket.emit(SOCKET_EVENTS.CANVAS_UNDO, { strokeId: sid, sessionId }); window.dispatchEvent(new CustomEvent('canvas:undo-local', { detail: sid })); } }} 
            className="p-1 rounded-md hover:bg-brand-500/10 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors flex items-center justify-center" 
            title="Undo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button 
            onClick={() => { const sid = redo(); if(sid) { socket.emit(SOCKET_EVENTS.CANVAS_REDO, { strokeId: sid, sessionId }); window.dispatchEvent(new CustomEvent('canvas:redo-local', { detail: sid })); } }} 
            className="p-1 rounded-md hover:bg-brand-500/10 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors flex items-center justify-center" 
            title="Redo"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* Theme Toggle — first, like home/dashboard */}
        <ThemeToggle />
        <div className="w-px h-5" style={{ background: 'rgba(0,200,150,0.2)' }} />

        {/* Active users avatars */}
        <div className="flex items-center -space-x-2 mr-2">
          {/* Current user */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white relative border-2"
            style={{ backgroundColor: user?.cursorColor || 'var(--color-brand)', borderColor: '#00C896', zIndex: activeUsers.length + 1 }}
            title={user?.displayName || user?.username}
          >
            {(user?.displayName || user?.username || '?')[0].toUpperCase()}
          </div>
          {activeUsers.slice(0, 2).map((u, i) => (
            <div
              key={u.userId}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white relative border-2"
              style={{ backgroundColor: u.color || 'var(--color-brand)', borderColor: '#00C896', zIndex: activeUsers.length - i }}
              title={u.displayName || u.username}
            >
              {(u.displayName || u.username || '?')[0].toUpperCase()}
            </div>
          ))}
          {activeUsers.length > 2 && (
            <div className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold" style={{ borderColor: '#00C896', background: 'rgba(0,200,150,0.1)', color: '#00C896' }}>
              +{activeUsers.length - 2}
            </div>
          )}
        </div>

        <button onClick={handleShare} className="py-1.5 px-4 text-xs font-semibold rounded-lg text-white shadow-sm hover:opacity-90 transition-opacity hidden sm:flex items-center justify-center min-w-[70px]" style={{ backgroundColor: '#00C896' }}>
          {isCopied ? 'Copied!' : 'Share'}
        </button>

        {sessions.length > 0 && (
          <button onClick={() => navigate(`/replay/${sessions[0]._id}`)} className="py-1.5 px-3 text-xs font-semibold rounded-lg hidden md:flex items-center gap-1.5 hover:bg-brand-500/10 transition-colors" style={{ color: '#00C896', border: '1px solid #00C896' }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Present
          </button>
        )}

        <button onClick={handleLeave} className="px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-red-500/10 transition-colors hidden sm:block" style={{ color: '#EF4444', border: '1px solid #EF4444' }}>
          Leave
        </button>
      </div>
    </header>
  );
}

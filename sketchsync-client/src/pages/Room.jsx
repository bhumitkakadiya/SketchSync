import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { roomService } from '../services/roomService';
import { replayService } from '../services/replayService';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../store/roomStore';
import { useCanvasStore } from '../store/canvasStore';
import RoomHeader from '../components/room/RoomHeader';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import AIAssistant from '../components/canvas/AIAssistant';
import Canvas from '../components/canvas/Canvas';
import UserCursors from '../components/room/UserCursors';
import StickyNote from '../components/canvas/StickyNote';
import ZoomControls from '../components/canvas/ZoomControls';
import { exportAsPNG, exportAsPDF, getSnapshotDataURL } from '../utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function Room() {
  const { id: roomId } = useParams();
  const mainCanvasRef = useRef(null);
  const { setRoom, clearRoom, setSessionId } = useRoomStore();
  const { clearStacks } = useCanvasStore();
  const socket = useSocket();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isReplayTab = searchParams.get('tab') === 'replay';

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const handleZoomIn  = useCallback(() => setZoom(z => Math.min(z + 0.25, 4)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.25)), []);
  const handleZoomReset = useCallback(() => setZoom(1), []);

  // Sticky notes state
  const [stickyNotes, setStickyNotes] = useState([]);
  const handleStickyAdd = useCallback((pos) => {
    const id = uuidv4();
    setStickyNotes(prev => [...prev, { id, x: pos.x, y: pos.y, text: '', color: '#FEF08A', isNew: true }]);
  }, []);
  const handleStickyUpdate = useCallback((id, updates) => {
    setStickyNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, isNew: false } : n));
  }, []);
  const handleStickyRemove = useCallback((id) => {
    setStickyNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // Load room data
  const { data: roomData } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomService.get(roomId).then((r) => r.data.data.room),
  });

  // Sync room data to store
  useEffect(() => {
    if (roomData) {
      setRoom(roomData);
      if (roomData.pageCount) {
        useRoomStore.getState().setPageCount(roomData.pageCount);
      }
    }
  }, [roomData, setRoom]);

  // Load sessions for replay button
  const { data: sessions } = useQuery({
    queryKey: ['sessions', roomId],
    queryFn: () => replayService.listSessions(roomId).then((r) => r.data.data.sessions),
    enabled: !!roomId,
  });

  const sessionId = roomData?.activeSession || null;
  const pageCount = useRoomStore((state) => state.pageCount);

  // Join socket room on mount
  useEffect(() => {
    if (!roomId) return;
    socket.joinRoom(roomId);

    const handleRoomEnded = () => {
      toast.error('The host has ended the session');
      navigate('/dashboard');
    };
    
    const socketInstance = socket.getSocket();
    socketInstance.on('ROOM:ENDED', handleRoomEnded);

    return () => {
      socketInstance.off('ROOM:ENDED', handleRoomEnded);
      socket.leaveRoom(roomId);
      clearRoom();
      clearStacks();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const strokeId = useCanvasStore.getState().undo();
        if (strokeId) socket.emit('CANVAS:UNDO', { strokeId, sessionId });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        const strokeId = useCanvasStore.getState().redo();
        if (strokeId) socket.emit('CANVAS:REDO', { strokeId });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [socket, sessionId]);

  const handleExportPNG = () => {
    if (mainCanvasRef.current) {
      exportAsPNG(mainCanvasRef.current, `${roomData?.name || 'canvas'}.png`);
      toast.success('Exported as PNG');
    }
  };

  const handleExportPDF = () => {
    if (mainCanvasRef.current) {
      exportAsPDF(mainCanvasRef.current, `${roomData?.name || 'canvas'}.pdf`);
      toast.success('Exported as PDF');
    }
  };

  const handleSaveSnapshot = async () => {
    if (!mainCanvasRef.current) return;
    try {
      const imageData = getSnapshotDataURL(mainCanvasRef.current);
      await roomService.saveSnapshot(roomId, imageData, `Snapshot ${new Date().toLocaleDateString()}`);
      toast.success('Snapshot saved!');
    } catch {
      toast.error('Failed to save snapshot');
    }
  };

  const handleAddPage = () => {
    socket.emit('CANVAS:ADD_PAGE');
  };

  const handleRemovePage = () => {
    if (pageCount > 1) {
      if (confirm('Are you sure you want to remove the last page? Any drawing on it will be lost for everyone.')) {
        socket.emit('CANVAS:REMOVE_PAGE');
      }
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <RoomHeader room={roomData} sessions={sessions || []} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <CanvasToolbar 
          socket={socket} 
          sessionId={sessionId} 
          mainCanvasRef={mainCanvasRef}
          onExportPNG={() => exportAsPNG(mainCanvasRef.current, `sketchsync-room-${roomId}`)}
          onExportPDF={() => exportAsPDF(mainCanvasRef.current, `sketchsync-room-${roomId}`)}
          onSaveSnapshot={handleSaveSnapshot}
        />

        {/* AI Assistant Chat UI */}
        <AIAssistant socket={socket} sessionId={sessionId} />

        {/* Canvas area (Scrolling Multi-Page layout) */}
        <div className="relative flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 flex flex-col items-center" style={{ background: 'var(--bg-input)' }}>
          <div
            className="relative w-full max-w-7xl flex flex-col gap-8 pb-32 origin-top"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
          >
            
            {/* The Physical White Pages */}
            {Array.from({ length: pageCount }).map((_, i) => (
              <div 
                key={i} 
                className="w-full bg-white shadow-xl rounded-2xl border border-black/5 relative"
                style={{ aspectRatio: '16 / 9' }}
              >
                {/* Page Number Badge */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-xs font-semibold text-gray-500 bg-white px-4 py-1 rounded-full border border-gray-200 z-20 shadow-md">
                  Page {i + 1}
                </div>
              </div>
            ))}

            {/* The Single Transparent Canvas Overlay */}
            <div className="absolute inset-0 z-10" style={{ bottom: '8rem' }}>
              <Canvas
                ref={mainCanvasRef}
                socket={socket}
                sessionId={sessionId}
                onStickyAdd={handleStickyAdd}
              />
              <UserCursors />
              {/* Sticky Notes Layer */}
              {stickyNotes.map(note => (
                <StickyNote
                  key={note.id}
                  note={note}
                  onUpdate={handleStickyUpdate}
                  onRemove={handleStickyRemove}
                />
              ))}
            </div>

          </div>

          <div className="my-8 flex flex-col items-center gap-2">
            <div className="flex gap-4">
              <button 
                onClick={handleAddPage}
                title="Add a new page below the current one"
                className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-glass flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add New Page Below (Page {pageCount})
              </button>

              {pageCount > 1 && (
                <button 
                  onClick={handleRemovePage}
                  title="Remove the last page"
                  className="px-6 py-3 bg-red-600/80 hover:bg-red-500 text-white rounded-xl shadow-glass flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                  </svg>
                  Remove Last Page
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Zoom Controls */}
      <ZoomControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleZoomReset}
      />

      {/* Sessions / Replay Modal */}
      {isReplayTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSearchParams({})} />
          <div className="relative w-full max-w-lg card animate-slide-up" style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Room Sessions</h2>
              <button onClick={() => setSearchParams({})} className="btn-ghost p-1.5 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {sessions?.length === 0 ? (
                <p className="text-center py-4" style={{ color: 'var(--text-secondary)' }}>No sessions found.</p>
              ) : (
                sessions?.map((session) => (
                  <div key={session._id} className="card p-4 flex items-center justify-between transition-colors hover:border-brand-500/30" style={{ background: 'var(--bg-primary)' }}>
                    <div>
                      <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                        {new Date(session.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}
                        {new Date(session.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs mt-1 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span>{session.totalStrokes || 0} strokes</span>
                        <span>·</span>
                        <span>{session.participants?.length || 0} participants</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${session.status === 'active' ? 'bg-green-500/20 text-green-500 dark:text-green-400' : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'}`}>
                        {session.status}
                      </span>
                      {session.isReplayable && (
                        <button
                          onClick={() => navigate(`/replay/${session._id}`)}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          ▶ Replay
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

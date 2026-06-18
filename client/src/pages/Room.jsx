import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { roomService } from '../services/roomService';
import { replayService } from '../services/replayService';
import { useSocket } from '../hooks/useSocket';
import { useRoomStore } from '../store/roomStore';
import { useCanvasStore } from '../store/canvasStore';
import { useAuthStore } from '../store/authStore';
import RoomHeader from '../components/room/RoomHeader';
import CanvasToolbar from '../components/canvas/CanvasToolbar';
import AIAssistant from '../components/canvas/AIAssistant';
import Canvas from '../components/canvas/Canvas';
import UserCursors from '../components/room/UserCursors';
import LeftSidebar from '../components/room/LeftSidebar';
import RightSidebar from '../components/room/RightSidebar';
import { useChat } from '../hooks/useChat';

import { exportAsPNG, exportAsPDF, getSnapshotDataURL } from '../utils/exportUtils';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export default function Room() {
  const { id: roomId } = useParams();
  const mainCanvasRef = useRef(null);
  const { setRoom, clearRoom, setSessionId } = useRoomStore();
  const { clearStacks } = useCanvasStore();
  const socket = useSocket();
  const { sendMessage } = useChat(socket);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  const isReplayTab = searchParams.get('tab') === 'replay';
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.25, 4)), []);
  const handleZoomOut = useCallback(() => setZoom(z => Math.max(z - 0.25, 0.25)), []);
  const handleZoomReset = useCallback(() => setZoom(1), []);

  // Board configuration state
  const [boardConfig, setBoardConfig] = useState(() => {
    const saved = localStorage.getItem('sketchsync_boardConfig');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      bgStyle: 'none', // 'none', 'dots', 'grid'
      aspectRatio: '16/9', // '16/9' (Laptop), '1/1.414' (A4 Portrait), '1.414/1' (A4 Landscape), '1/1' (Square)
      pageTheme: 'dark', // 'light', 'dark'
    };
  });

  useEffect(() => {
    localStorage.setItem('sketchsync_boardConfig', JSON.stringify(boardConfig));
  }, [boardConfig]);

  // Current page tracking
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const handleScroll = useCallback((e) => {
    const container = e.target;
    const pageEls = container.querySelectorAll('[id^="page-"]');
    if (!pageEls.length) return;

    let maxVisibleHeight = 0;
    let currentIdx = currentPageIndex;
    const containerRect = container.getBoundingClientRect();

    pageEls.forEach((el, i) => {
      const rect = el.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);

      if (visibleHeight > maxVisibleHeight) {
        maxVisibleHeight = visibleHeight;
        currentIdx = i;
      }
    });

    if (currentIdx !== currentPageIndex) {
      setCurrentPageIndex(currentIdx);
    }
  }, [currentPageIndex]);

  // Canvas state persistence: cache latest canvas data so we can save on leave
  const cachedCanvasDataRef = useRef(null);
  const saveThrottleRef = useRef(null);

  const saveCanvasToServer = useCallback(() => {
    if (!mainCanvasRef.current) return;
    try {
      // Always update the cache immediately
      const base64 = mainCanvasRef.current.toDataURL('image/png').split(',')[1];
      if (base64) cachedCanvasDataRef.current = base64;
      // Throttle server emit to at most once every 4 seconds
      if (saveThrottleRef.current) return;
      saveThrottleRef.current = setTimeout(() => {
        saveThrottleRef.current = null;
        if (!isReplayTab) socket.emit('CANVAS:SAVE', { roomId, data: cachedCanvasDataRef.current });
      }, 4000);
    } catch (e) { console.warn('Could not export canvas base64'); }
  }, [roomId, socket, isReplayTab]);

  // Handle Export Events from RightSidebar
  useEffect(() => {
    const handleExportPNG = () => exportAsPNG(mainCanvasRef.current, `sketchsync-room-${roomId}`);
    const handleExportPDF = () => exportAsPDF(mainCanvasRef.current, `sketchsync-room-${roomId}`);
    const handleSaveSnapshot = () => {
      saveCanvasToServer();
      const event = new CustomEvent('toast', { detail: { type: 'success', message: 'Board saved to cloud.' } });
      window.dispatchEvent(event);
      alert('Snapshot saved to cloud successfully!');
    };

    window.addEventListener('canvas:export-png', handleExportPNG);
    window.addEventListener('canvas:export-pdf', handleExportPDF);
    window.addEventListener('canvas:save-snapshot', handleSaveSnapshot);
    return () => {
      window.removeEventListener('canvas:export-png', handleExportPNG);
      window.removeEventListener('canvas:export-pdf', handleExportPDF);
      window.removeEventListener('canvas:save-snapshot', handleSaveSnapshot);
    };
  }, [roomId]);

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
      // Clear pending throttle
      if (saveThrottleRef.current) {
        clearTimeout(saveThrottleRef.current);
        saveThrottleRef.current = null;
      }
      // Save cached canvas data immediately (canvas may already be unmounted)
      const data = cachedCanvasDataRef.current;
      if (data) socket.emit('CANVAS:SAVE_STATE', { imageBase64: data });
      socket.leaveRoom(roomId);
      clearRoom();
      clearStacks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Keyboard shortcuts for undo/redo and tools
  useEffect(() => {
    const handleKey = (e) => {
      // Don't trigger tool shortcuts if user is typing in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const { undo, redo, setTool } = useCanvasStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const strokeId = undo();
        if (strokeId) {
          socket.emit('CANVAS:UNDO', { strokeId, sessionId });
          window.dispatchEvent(new CustomEvent('canvas:undo-local', { detail: strokeId }));
        }
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        const strokeId = redo();
        if (strokeId) {
          socket.emit('CANVAS:REDO', { strokeId });
          window.dispatchEvent(new CustomEvent('canvas:redo-local', { detail: strokeId }));
        }
      }

      // Tool shortcuts
      const keyMap = {
        'v': 'select', 's': 'select',
        'p': 'pen', 'h': 'highlighter', 'e': 'eraser',
        'l': 'line', 'r': 'rect', 'c': 'circle', 'a': 'arrow',
        't': 'text', 'n': 'sticky_note', 'k': 'laser',
      };

      const toolId = keyMap[e.key.toLowerCase()] || (e.key === 'Escape' ? 'select' : null);
      if (toolId && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setTool(toolId);
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

  const handleRemovePage = (index) => {
    if (pageCount <= 1) return;
    // Right now, the backend only supports removing the *last* page by just reducing the count.
    // If they clicked on a cross icon that wasn't the last page, we should warn them.
    if (index !== undefined && index !== pageCount - 1) {
      toast.error('Currently, only the last page can be removed.');
      return;
    }
    if (confirm('Are you sure you want to remove this page? Any drawing on it will be lost for everyone.')) {
      socket.emit('CANVAS:REMOVE_PAGE');
    }
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end this session? This will close the room for everyone.')) {
      try {
        await roomService.delete(roomId);
        socket.emit('ROOM:END', { roomId });
        navigate('/dashboard');
      } catch (e) {
        toast.error('Failed to end session');
      }
    }
  };

  const handleClearBoard = () => {
    if (confirm('Are you sure you want to clear the entire board? This cannot be undone.')) {
      useCanvasStore.getState().clearStacks();
      socket.emit('CANVAS:CLEAR', { sessionId });
    }
  };

  const isOwner = user?._id?.toString() === roomData?.owner?._id?.toString() || user?._id?.toString() === roomData?.owner?.toString();

  useEffect(() => {
    const handleScrollToPage = (e) => {
      const pageIndex = e.detail;
      const el = document.getElementById(`page-${pageIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };
    window.addEventListener('canvas:scroll-to-page', handleScrollToPage);
    return () => window.removeEventListener('canvas:scroll-to-page', handleScrollToPage);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden relative bg-transparent text-white">
      <RoomHeader
        room={roomData}
        sessions={sessions || []}
        sessionId={sessionId}
      />

      <div className="flex-1 overflow-hidden relative flex">

        {/* Left Sidebar (Pages) */}
        <LeftSidebar
          pageCount={pageCount}
          currentPageIndex={currentPageIndex}
          onAddPage={handleAddPage}
          onRemovePage={handleRemovePage}
          isOpen={showLeftSidebar}
          toggleOpen={() => setShowLeftSidebar(v => !v)}
          boardConfig={boardConfig}
          isOwner={isOwner}
        />

        {/* Center Canvas Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {/* Floating Toolbar (Zoom Controls) */}
          <div className="absolute bottom-6 right-4 z-40 transition-transform duration-300">
            <CanvasToolbar
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onZoomReset={handleZoomReset}
            />
          </div>

          {/* AI Assistant Chat UI */}
          <AIAssistant socket={socket} sessionId={sessionId} />

          {/* Canvas area (Scrolling Multi-Page layout) */}
          <div
            onScroll={handleScroll}
            className="relative flex-1 overflow-y-auto overflow-x-hidden flex flex-col items-center transition-colors duration-300"
            style={{
              background: 'var(--room-canvas-bg)',
              padding: '40px 32px',
            }}
          >
            <div
              className="relative w-full max-w-6xl flex flex-col origin-top transition-transform duration-200"
              style={{ transform: `scale(${zoom})`, gap: '48px', paddingBottom: '160px' }}
            >
              {/* Pages */}
              {Array.from({ length: pageCount }).map((_, i) => {
                const isLight = boardConfig.pageTheme === 'light';
                return (
                  <div key={i} id={`page-${i}`} className="relative w-full flex-shrink-0 transition-all duration-300 flex flex-col items-center">
                    {/* The actual page */}
                    <div
                      className="w-full relative overflow-hidden transition-all duration-300"
                      style={{
                        aspectRatio: boardConfig.aspectRatio.replace('/', ' / '),
                        backgroundColor: isLight ? (boardConfig.bgStyle === 'dots' ? '#FAFFFE' : '#FFFFFF') : '#000000',
                        backgroundImage: boardConfig.bgStyle === 'dots'
                          ? `radial-gradient(circle, ${isLight ? 'rgba(0,200,150,0.2)' : 'rgba(0,200,150,0.25)'} 1.5px, transparent 1.5px)`
                          : boardConfig.bgStyle === 'grid'
                            ? `linear-gradient(${isLight ? 'rgba(0,200,150,0.12)' : 'rgba(0,200,150,0.15)'} 1px, transparent 1px), linear-gradient(90deg, ${isLight ? 'rgba(0,200,150,0.12)' : 'rgba(0,200,150,0.25)'} 1px, transparent 1px)`
                            : 'none',
                        backgroundSize: boardConfig.bgStyle !== 'none' ? '24px 24px' : undefined,
                        borderRadius: '2px', // Sharp, realistic paper corners
                        border: isLight
                          ? '1px solid rgba(0,200,150,0.2)'
                          : '1px solid rgba(255,255,255,0.15)',
                        boxShadow: isLight
                          ? '0 16px 56px rgba(0, 200, 150, 0.35), 0 6px 16px rgba(0, 200, 150, 0.25)'
                          : '0 16px 56px rgba(0, 200, 150, 0.45), 0 6px 16px rgba(0, 200, 150, 0.3)',
                      }}
                    />
                    <div
                      className="flex items-center justify-center h-[32px] px-4 rounded-b-xl text-[12px] font-bold select-none shadow-md"
                      style={{
                        background: isLight ? '#FFFFFF' : '#18181B',
                        border: isLight ? '1px solid rgba(0,200,150,0.4)' : '1px solid rgba(0,200,150,0.3)',
                        borderTop: 'none',
                        color: '#00C896',
                        zIndex: 5,
                      }}
                    >
                      Page {i + 1}
                    </div>
                  </div>
                );
              })}

              {/* The Single Transparent Canvas Overlay */}
              <div className="absolute inset-0 z-10" style={{ bottom: '8rem' }}>
                <Canvas
                  ref={mainCanvasRef}
                  socket={socket}
                  sessionId={sessionId}
                  aspectRatio={boardConfig.aspectRatio}
                  onStrokeComplete={saveCanvasToServer}
                  readOnly={boardConfig.readOnly}
                />
                {boardConfig.showCursors !== false && <UserCursors />}
              </div>
            </div>
          </div>
        </div>

        {/* Removed Zoom Controls floating box */}

        {/* Right Sidebar (Properties) */}
        <RightSidebar
          mainCanvasRef={mainCanvasRef}
          boardConfig={boardConfig}
          setBoardConfig={setBoardConfig}
          socket={socket}
          sessionId={sessionId}
          isOwner={isOwner}
          onClearBoard={handleClearBoard}
          onEndSession={handleEndSession}
          sendMessage={sendMessage}
        />
      </div>

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
                          className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Replay
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

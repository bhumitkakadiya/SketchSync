import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { replayService } from '../services/replayService';
import { useReplay } from '../hooks/useReplay';
import { useReplayStore } from '../store/replayStore';
import ReplayCanvas from '../components/replay/ReplayCanvas';
import ReplayTimeline from '../components/replay/ReplayTimeline';
import PlaybackControls from '../components/replay/PlaybackControls';
import Logo from '../components/ui/Logo';

export default function Replay() {
  const { sessionId } = useParams();
  const { play, pause, scrubTo, canvasRef } = useReplay(sessionId);
  const { strokes, isLoaded } = useReplayStore();

  const { data: meta } = useQuery({
    queryKey: ['session-meta', sessionId],
    queryFn: () => replayService.getMetadata(sessionId).then((r) => r.data.data.session),
  });

  return (
    <div className="h-screen flex flex-col bg-transparent overflow-hidden">
      {/* Header */}
      <header className="bg-transparent px-6 py-3 flex items-center justify-between flex-shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <Link to="/" className="group">
            <Logo className="w-7 h-7 text-brand-500 group-hover:scale-105 transition-transform" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Session Replay</span>
              <span className="badge bg-brand-500/20 text-brand-400 text-[10px]">Read-only</span>
            </div>
            {meta && (
              <div className="text-xs text-gray-500">
                {new Date(meta.startedAt).toLocaleDateString()} · {meta.totalStrokes} strokes · {meta.participants?.length} participants
              </div>
            )}
          </div>
        </div>
        <Link to="/dashboard" className="btn-secondary text-xs py-1.5 px-3">
          ← Dashboard
        </Link>
      </header>

      {/* Canvas */}
      <div className="flex-1 p-4 overflow-hidden">
        {!isLoaded ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-10 h-10 animate-spin text-brand-500 mx-auto mb-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-gray-400 text-sm">Loading replay data...</p>
            </div>
          </div>
        ) : strokes.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-surface-300 dark:text-surface-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400">No strokes recorded in this session.</p>
            </div>
          </div>
        ) : (
          <ReplayCanvas canvasRef={canvasRef} />
        )}
      </div>

      {/* Controls bar */}
      <div className="glass-dark border-t border-white/[0.06] px-6 py-4 flex-shrink-0 space-y-3">
        <ReplayTimeline scrubTo={scrubTo} />
        <PlaybackControls play={play} pause={pause} scrubTo={scrubTo} />
      </div>
    </div>
  );
}

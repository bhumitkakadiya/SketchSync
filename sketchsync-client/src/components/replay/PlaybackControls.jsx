import { useReplayStore } from '../../store/replayStore';
import { PLAYBACK_SPEEDS } from '../../constants/tools';

export default function PlaybackControls({ play, pause, scrubTo }) {
  const { isPlaying, speed, setSpeed, playhead, duration, strokes } = useReplayStore();

  const handleRestart = () => {
    scrubTo(0);
  };

  const handleSkipEnd = () => {
    scrubTo(duration);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Restart */}
      <button id="replay-restart" onClick={handleRestart} title="Restart" className="btn-ghost p-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </svg>
      </button>

      {/* Play / Pause */}
      <button
        id="replay-play-pause"
        onClick={isPlaying ? pause : play}
        disabled={!strokes.length}
        className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center shadow-glow-sm hover:shadow-glow-brand transition-all active:scale-95 disabled:opacity-50"
      >
        {isPlaying ? (
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Skip to end */}
      <button id="replay-skip-end" onClick={handleSkipEnd} title="Skip to end" className="btn-ghost p-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 18l8.5-6L6 6v12zm2.5-6 5.5 3.9V8.1L8.5 12zM16 6h2v12h-2z" />
        </svg>
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1 ml-2">
        {PLAYBACK_SPEEDS.map((s) => (
          <button
            key={s}
            id={`replay-speed-${s}`}
            onClick={() => setSpeed(s)}
            className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-all ${
              speed === s
                ? 'bg-brand-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-surface-300'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      {/* Stroke count */}
      <span className="text-xs text-gray-500 ml-auto">
        {strokes.filter(s => s.timestamp <= playhead).length}/{strokes.length} strokes
      </span>
    </div>
  );
}

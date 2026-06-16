import { useReplayStore } from '../../store/replayStore';

const fmt = (ms) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60).toString().padStart(2, '0');
  const s = (total % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export default function ReplayTimeline({ scrubTo }) {
  const { playhead, duration } = useReplayStore();
  const pct = duration > 0 ? (playhead / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs font-mono text-gray-400 w-10 text-right flex-shrink-0">{fmt(playhead)}</span>
      <div className="relative flex-1 h-2 bg-surface-300 rounded-full overflow-hidden cursor-pointer group">
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full gradient-brand transition-none"
          style={{ width: `${pct}%` }}
        />
        {/* Range input */}
        <input
          id="replay-timeline"
          type="range"
          min={0}
          max={duration || 1}
          step={100}
          value={playhead}
          onChange={(e) => scrubTo(+e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg border-2 border-brand-500 group-hover:scale-125 transition-transform"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-500 w-10 flex-shrink-0">{fmt(duration)}</span>
    </div>
  );
}

import { useEffect, useRef } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { renderUpTo } from '../../utils/canvasUtils';

export default function ReplayCanvas({ canvasRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      const state = useReplayStore.getState();
      renderUpTo(canvasRef.current, state.strokes, state.playhead);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    
    const unsub = useReplayStore.subscribe((state, prevState) => {
      if (state.playhead !== prevState.playhead) {
        if (!canvasRef.current) return;
        renderUpTo(canvasRef.current, state.strokes, state.playhead);
      }
    });

    return () => {
      ro.disconnect();
      unsub();
    };
  }, [canvasRef]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden rounded-xl border border-white/5 shadow-xl" style={{ background: 'var(--bg-card)' }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

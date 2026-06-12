import { useEffect, useRef } from 'react';
import { useReplayStore } from '../../store/replayStore';
import { useReplay } from '../../hooks/useReplay';

export default function ReplayCanvas({ canvasRef }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const resize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-canvas-bg overflow-hidden rounded-xl">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

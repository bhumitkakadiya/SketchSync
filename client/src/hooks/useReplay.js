import { useEffect, useRef, useCallback } from 'react';
import { useReplayStore } from '../store/replayStore';
import { replayService } from '../services/replayService';
import { renderUpTo, clearCanvas } from '../utils/canvasUtils';

export const useReplay = (sessionId) => {
  const { strokes, setStrokes, playhead, setPlayhead, isPlaying, setIsPlaying, speed, duration } = useReplayStore();

  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastRealTime = useRef(null);

  // Keyframes cache: {timestampMs: ImageData}
  const keyframes = useRef({});
  const KEYFRAME_INTERVAL = 60000; // 60s

  // Load strokes on mount
  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        let allStrokes = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
          const res = await replayService.getReplay(sessionId, page);
          const { strokes: batch, hasMore: more } = res.data.data;
          allStrokes = [...allStrokes, ...batch];
          hasMore = more;
          page++;
        }
        setStrokes(allStrokes);
      } catch (err) {
        console.error('Failed to load replay strokes:', err);
      }
    };
    load();
    return () => useReplayStore.getState().reset();
  }, [sessionId]);

  // Build keyframes when strokes load
  useEffect(() => {
    if (!strokes.length || !canvasRef.current) return;
    keyframes.current = {};
    const maxTs = Math.max(...strokes.map((s) => s.timestamp));
    for (let ts = KEYFRAME_INTERVAL; ts <= maxTs; ts += KEYFRAME_INTERVAL) {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      renderUpTo(tempCanvas, strokes, ts);
      keyframes.current[ts] = tempCanvas.getContext('2d').getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    }
  }, [strokes]);

  // Efficient scrub using nearest keyframe
  const scrubTo = useCallback((targetMs) => {
    if (!canvasRef.current) return;
    setPlayhead(targetMs);

    // Find nearest keyframe
    const keyframeTimes = Object.keys(keyframes.current).map(Number).sort((a, b) => a - b);
    const nearestKf = keyframeTimes.filter((t) => t <= targetMs).pop();

    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    if (nearestKf && keyframes.current[nearestKf]) {
      ctx.putImageData(keyframes.current[nearestKf], 0, 0);
      // Render delta strokes from keyframe to target
      const delta = strokes.filter((s) => s.timestamp > nearestKf && s.timestamp <= targetMs && !s.undone);
      // Draw delta on top
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      renderUpTo(tempCanvas, delta.map(s => ({ ...s, timestamp: s.timestamp - nearestKf })), targetMs - nearestKf);
      ctx.drawImage(tempCanvas, 0, 0);
    } else {
      renderUpTo(canvasRef.current, strokes, targetMs);
    }
  }, [strokes, setPlayhead]);

  // Animation tick
  const tick = useCallback((realTimestamp) => {
    if (!lastRealTime.current) {
      lastRealTime.current = realTimestamp;
    }

    const state = useReplayStore.getState();
    const delta = (realTimestamp - lastRealTime.current) * state.speed;
    lastRealTime.current = realTimestamp;
    
    const newPlayhead = Math.min(state.playhead + delta, state.duration);
    state.setPlayhead(newPlayhead);

    if (canvasRef.current) {
      renderUpTo(canvasRef.current, state.strokes, newPlayhead);
    }

    if (newPlayhead >= state.duration) {
      state.setIsPlaying(false);
      return;
    }
    frameRef.current = requestAnimationFrame(tick);
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
    lastRealTime.current = null;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [tick, setIsPlaying]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    cancelAnimationFrame(frameRef.current);
    lastRealTime.current = null;
  }, [setIsPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(frameRef.current);
    }
  }, [isPlaying]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return { canvasRef, play, pause, scrubTo };
};

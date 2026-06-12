import { create } from 'zustand';

export const useReplayStore = create((set, get) => ({
  strokes: [],
  playhead: 0,       // current position in ms
  duration: 0,       // total session duration in ms
  isPlaying: false,
  speed: 1,          // 1x, 2x, 4x
  isLoaded: false,

  setStrokes: (strokes) => {
    const duration = strokes.length > 0 ? Math.max(...strokes.map((s) => s.timestamp)) + 1000 : 0;
    set({ strokes, duration, isLoaded: true, playhead: 0 });
  },

  setPlayhead: (playhead) => set({ playhead }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setSpeed: (speed) => set({ speed }),

  reset: () => set({ strokes: [], playhead: 0, duration: 0, isPlaying: false, speed: 1, isLoaded: false }),
}));

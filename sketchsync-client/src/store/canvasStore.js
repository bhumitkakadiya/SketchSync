import { create } from 'zustand';
import { TOOLS } from '../constants/tools';

export const useCanvasStore = create((set, get) => ({
  activeTool: TOOLS.PEN,
  color: '#3B82F6',
  brushSize: 4,
  eraserSize: 40,
  opacity: 1,
  isAIOpen: false,

  // Undo/Redo stacks (arrays of strokeIds)
  undoStack: [],
  redoStack: [],

  // Active strokes map from other users: {strokeId -> {points, color, size, ...}}
  remoteStrokes: {},

  setTool: (tool) => set({ activeTool: tool }),
  setColor: (color) => set({ color }),
  setBrushSize: (size) => set({ brushSize: size }),
  setEraserSize: (size) => set({ eraserSize: size }),
  setOpacity: (opacity) => set({ opacity }),
  toggleAI: () => set((state) => ({ isAIOpen: !state.isAIOpen })),

  pushUndo: (strokeId) =>
    set((state) => ({
      undoStack: [...state.undoStack, strokeId],
      redoStack: [], // Clear redo on new action
    })),

  undo: () => {
    const { undoStack, redoStack } = get();
    if (!undoStack.length) return null;
    const strokeId = undoStack[undoStack.length - 1];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, strokeId],
    });
    return strokeId;
  },

  redo: () => {
    const { undoStack, redoStack } = get();
    if (!redoStack.length) return null;
    const strokeId = redoStack[redoStack.length - 1];
    set({
      undoStack: [...undoStack, strokeId],
      redoStack: redoStack.slice(0, -1),
    });
    return strokeId;
  },

  clearStacks: () => set({ undoStack: [], redoStack: [] }),

  // Remote stroke management
  addRemoteStroke: (strokeId, data) =>
    set((state) => ({ remoteStrokes: { ...state.remoteStrokes, [strokeId]: data } })),
  updateRemoteStroke: (strokeId, point) =>
    set((state) => {
      const stroke = state.remoteStrokes[strokeId];
      if (!stroke) return state;
      return {
        remoteStrokes: {
          ...state.remoteStrokes,
          [strokeId]: { ...stroke, points: [...(stroke.points || []), point] },
        },
      };
    }),
  removeRemoteStroke: (strokeId) =>
    set((state) => {
      const { [strokeId]: _, ...rest } = state.remoteStrokes;
      return { remoteStrokes: rest };
    }),
}));

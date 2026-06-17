const mongoose = require('mongoose');

const StrokeSchema = new mongoose.Schema({
  sessionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  roomId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seqNum:     { type: Number, required: true },
  timestamp:  { type: Number, required: true },   // ms since session start (relative)
  absoluteTs: { type: Date, default: Date.now },  // wall clock
  type: {
    type: String,
    enum: ['pen','eraser','highlighter','line','arrow','rect','circle','text','image','sticky','undo','redo','clear'],
    required: true,
  },
  data: {
    points:    [{ x: Number, y: Number }],
    startX:    Number,
    startY:    Number,
    endX:      Number,
    endY:      Number,
    text:      String,
    fontSize:  { type: Number, default: 16 },
    color:     { type: String, default: '#000000' },
    brushSize: { type: Number, default: 4 },
    opacity:   { type: Number, default: 1 },
  },
  strokeId:   { type: String, required: true, unique: true }, // UUID from client
  undone:     { type: Boolean, default: false },
}, { timestamps: false });

// Performance indexes for replay
StrokeSchema.index({ sessionId: 1, seqNum: 1 });
StrokeSchema.index({ sessionId: 1, timestamp: 1 });
StrokeSchema.index({ roomId: 1, absoluteTs: -1 });
// TTL: auto-delete strokes after 1 year
StrokeSchema.index({ absoluteTs: 1 }, { expireAfterSeconds: 31536000 });

module.exports = mongoose.model('Stroke', StrokeSchema);

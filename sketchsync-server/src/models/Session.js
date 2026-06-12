const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  roomId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  startedAt:    { type: Date, default: Date.now },
  endedAt:      { type: Date },
  duration:     { type: Number },  // ms
  participants: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username:    { type: String },
    joinedAt:    { type: Date },
    leftAt:      { type: Date },
    strokeCount: { type: Number, default: 0 },
  }],
  strokeCounter: { type: Number, default: 0 }, // monotonic seq per session
  totalStrokes:  { type: Number, default: 0 },
  status:        { type: String, enum: ['active', 'ended'], default: 'active' },
  snapshotUrl:   { type: String },
  isReplayable:  { type: Boolean, default: true },
}, { timestamps: true });

SessionSchema.index({ roomId: 1, startedAt: -1 });
SessionSchema.index({ status: 1 });

module.exports = mongoose.model('Session', SessionSchema);

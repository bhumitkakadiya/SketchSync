const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true, maxlength: 60 },
  code:         { type: String, unique: true, uppercase: true, length: 6 },
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  bannedUsers:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isPublic:     { type: Boolean, default: false },
  maxMembers:   { type: Number, default: 20 },
  isActive:     { type: Boolean, default: true },
  canvasState:  { type: String, default: null }, // Base64 PNG for late-joiner sync
  pageCount:    { type: Number, default: 1 },    // Multi-page scrolling board
  settings: {
    allowGuests: { type: Boolean, default: false },
    toolsLocked: { type: Boolean, default: false },
    chatEnabled: { type: Boolean, default: true },
  },
  activeSession:  { type: mongoose.Schema.Types.ObjectId, ref: 'Session', default: null },
  lastActivity:   { type: Date, default: Date.now },
}, { timestamps: true });

RoomSchema.index({ owner: 1 });
RoomSchema.index({ lastActivity: -1 });
// TTL: auto-delete inactive rooms after 30 days
RoomSchema.index({ lastActivity: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30, partialFilterExpression: { isActive: false } });

module.exports = mongoose.model('Room', RoomSchema);

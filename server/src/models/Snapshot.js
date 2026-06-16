const mongoose = require('mongoose');

const SnapshotSchema = new mongoose.Schema({
  roomId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name:      { type: String, default: 'Snapshot' },
  url:       { type: String, required: true },   // Cloudinary URL or base64
  publicId:  { type: String },                   // Cloudinary public_id
}, { timestamps: true });

SnapshotSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Snapshot', SnapshotSchema);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true },
  displayName:  { type: String, trim: true },
  avatarUrl:    { type: String, default: '' },
  cursorColor:  { type: String, default: '#3B82F6' },
  refreshToken: { type: String, default: null }, // SHA-256 hashed
  rooms:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Room' }],
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },
}, { timestamps: true });

// Indexes are created automatically by unique: true in schema

// Hash password before save
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password helper
UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Remove sensitive fields from JSON output
UserSchema.methods.toPublic = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

// Auto-assign a cursor color on register
const CURSOR_COLORS = ['#3B82F6','#EF4444','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#84CC16'];
UserSchema.pre('validate', function () {
  if (this.isNew && !this.cursorColor) {
    this.cursorColor = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
  }
});

module.exports = mongoose.model('User', UserSchema);

const Room = require('../models/Room');
const Session = require('../models/Session');
const Snapshot = require('../models/Snapshot');
const User = require('../models/User');
const { generateRoomCode } = require('../utils/generateCode');
const logger = require('../utils/logger');

// POST /rooms
exports.createRoom = async (req, res, next) => {
  try {
    const { name, isPublic, maxMembers } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'MISSING_NAME', message: 'Room name required' } });

    let code, exists;
    do {
      code = generateRoomCode();
      exists = await Room.exists({ code });
    } while (exists);

    const room = await Room.create({
      name, code, isPublic: isPublic || false,
      maxMembers: maxMembers || 20,
      owner: req.user.id,
      members: [req.user.id],
    });

    // Add room to user's list
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { rooms: room._id } });

    // Create initial session
    const session = await Session.create({
      roomId: room._id,
      participants: [{ userId: req.user.id, joinedAt: new Date() }],
    });
    await Room.findByIdAndUpdate(room._id, { activeSession: session._id });

    logger.info(`Room created: ${code} by ${req.user.username}`);
    res.status(201).json({ success: true, data: { room: await room.populate('owner', 'username displayName avatarUrl cursorColor') } });
  } catch (err) {
    next(err);
  }
};

// GET /rooms
exports.listRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({ members: req.user.id, isActive: true })
      .populate('owner', 'username displayName avatarUrl cursorColor')
      .sort({ lastActivity: -1 });
    res.json({ success: true, data: { rooms } });
  } catch (err) {
    next(err);
  }
};

// GET /rooms/:id
exports.getRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('owner', 'username displayName avatarUrl cursorColor')
      .populate('members', 'username displayName avatarUrl cursorColor');
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    res.json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
};

// PUT /rooms/:id
exports.updateRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    if (room.owner.toString() !== req.user.id) return res.status(403).json({ success: false, error: { code: 'NOT_OWNER', message: 'Only room owner can update' } });

    const { name, isPublic, maxMembers, settings } = req.body;
    if (name) room.name = name;
    if (isPublic !== undefined) room.isPublic = isPublic;
    if (maxMembers) room.maxMembers = maxMembers;
    if (settings) room.settings = { ...room.settings, ...settings };
    await room.save();
    res.json({ success: true, data: { room } });
  } catch (err) {
    next(err);
  }
};

// DELETE /rooms/:id
exports.deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    if (room.owner.toString() !== req.user.id) return res.status(403).json({ success: false, error: { code: 'NOT_OWNER', message: 'Only owner can delete' } });
    await Room.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /rooms/join
exports.joinRoom = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: { code: 'MISSING_CODE', message: 'Room code required' } });

    const room = await Room.findOne({ code: code.toUpperCase(), isActive: true });
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Invalid room code' } });
    if (room.bannedUsers.includes(req.user.id)) return res.status(403).json({ success: false, error: { code: 'BANNED', message: 'You are banned from this room' } });
    if (room.members.length >= room.maxMembers && !room.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, error: { code: 'ROOM_FULL', message: 'Room is full' } });
    }

    await Room.findByIdAndUpdate(room._id, {
      $addToSet: { members: req.user.id },
      lastActivity: new Date(),
    });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { rooms: room._id } });

    const updated = await Room.findById(room._id)
      .populate('owner', 'username displayName avatarUrl cursorColor')
      .populate('members', 'username displayName avatarUrl cursorColor');
    res.json({ success: true, data: { room: updated } });
  } catch (err) {
    next(err);
  }
};

// POST /rooms/:id/leave
exports.leaveRoom = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    if (room.owner.toString() === req.user.id) {
      return res.status(400).json({ success: false, error: { code: 'OWNER_CANNOT_LEAVE', message: 'Owner must delete the room instead of leaving' } });
    }
    await Room.findByIdAndUpdate(room._id, { $pull: { members: req.user.id } });
    await User.findByIdAndUpdate(req.user.id, { $pull: { rooms: room._id } });
    res.json({ success: true, message: 'Left room' });
  } catch (err) {
    next(err);
  }
};

// GET /rooms/:id/members
exports.getMembers = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id).populate('members', 'username displayName avatarUrl cursorColor');
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    res.json({ success: true, data: { members: room.members } });
  } catch (err) {
    next(err);
  }
};

// DELETE /rooms/:id/members/:uid
exports.kickMember = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room not found' } });
    if (room.owner.toString() !== req.user.id) return res.status(403).json({ success: false, error: { code: 'NOT_OWNER', message: 'Only owner can kick members' } });
    if (req.params.uid === req.user.id) return res.status(400).json({ success: false, error: { code: 'CANNOT_KICK_SELF', message: 'Cannot kick yourself' } });

    await Room.findByIdAndUpdate(room._id, {
      $pull: { members: req.params.uid },
      $addToSet: { bannedUsers: req.params.uid },
    });
    res.json({ success: true, message: 'Member kicked' });
  } catch (err) {
    next(err);
  }
};

// POST /rooms/:id/snapshot
exports.saveSnapshot = async (req, res, next) => {
  try {
    const { imageData, name } = req.body;
    if (!imageData) return res.status(400).json({ success: false, error: { code: 'NO_IMAGE', message: 'imageData required' } });

    const snapshot = await Snapshot.create({
      roomId: req.params.id,
      createdBy: req.user.id,
      name: name || `Snapshot ${new Date().toLocaleDateString()}`,
      url: imageData, // base64 or Cloudinary URL
    });

    // Also update room's canvasState for late joiners
    await Room.findByIdAndUpdate(req.params.id, { canvasState: imageData, lastActivity: new Date() });

    res.status(201).json({ success: true, data: { snapshot } });
  } catch (err) {
    next(err);
  }
};

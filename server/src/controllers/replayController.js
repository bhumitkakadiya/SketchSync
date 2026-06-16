const Session = require('../models/Session');
const Stroke = require('../models/Stroke');

// GET /sessions/:roomId
exports.listSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ roomId: req.params.roomId })
      .sort({ startedAt: -1 })
      .limit(20)
      .select('-participants.strokeCount');
    res.json({ success: true, data: { sessions } });
  } catch (err) {
    next(err);
  }
};

// GET /sessions/:id/replay
exports.getReplay = async (req, res, next) => {
  try {
    const { page = 1, limit = 5000 } = req.query;
    const sessionId = req.params.id;

    const strokes = await Stroke.find({ sessionId, undone: false })
      .sort({ seqNum: 1 })
      .skip((page - 1) * limit)
      .limit(+limit)
      .select('type data timestamp seqNum userId strokeId');

    const total = await Stroke.countDocuments({ sessionId });
    res.json({
      success: true,
      data: {
        strokes,
        total,
        page: +page,
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};

// GET /sessions/:id/metadata
exports.getSessionMetadata = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('participants.userId', 'username displayName avatarUrl cursorColor');
    if (!session) return res.status(404).json({ success: false, error: { code: 'SESSION_NOT_FOUND', message: 'Session not found' } });
    res.json({ success: true, data: { session } });
  } catch (err) {
    next(err);
  }
};

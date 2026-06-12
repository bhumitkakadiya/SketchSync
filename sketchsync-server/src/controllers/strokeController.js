const Stroke = require('../models/Stroke');
const Snapshot = require('../models/Snapshot');

// GET /strokes/:sessionId?from=ts&to=ts
exports.getRange = async (req, res, next) => {
  try {
    const { from = 0, to } = req.query;
    const query = {
      sessionId: req.params.sessionId,
      timestamp: { $gte: +from },
    };
    if (to) query.timestamp.$lte = +to;

    const strokes = await Stroke.find(query)
      .sort({ timestamp: 1 })
      .select('type data timestamp seqNum userId strokeId undone');
    res.json({ success: true, data: { strokes } });
  } catch (err) {
    next(err);
  }
};

// GET /snapshots/:roomId
exports.listSnapshots = async (req, res, next) => {
  try {
    const snapshots = await Snapshot.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username displayName');
    res.json({ success: true, data: { snapshots } });
  } catch (err) {
    next(err);
  }
};

// DELETE /snapshots/:id
exports.deleteSnapshot = async (req, res, next) => {
  try {
    const snapshot = await Snapshot.findById(req.params.id);
    if (!snapshot) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snapshot not found' } });
    await snapshot.deleteOne();
    res.json({ success: true, message: 'Snapshot deleted' });
  } catch (err) {
    next(err);
  }
};

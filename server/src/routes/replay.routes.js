const router = require('express').Router();
const replay = require('../controllers/replayController');
const stroke = require('../controllers/strokeController');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Sessions / Replay
router.get('/sessions/:roomId', replay.listSessions);
router.get('/sessions/:id/replay', replay.getReplay);
router.get('/sessions/:id/metadata', replay.getSessionMetadata);

// Strokes range query
router.get('/strokes/:sessionId', stroke.getRange);

// Snapshots
router.get('/snapshots/:roomId', stroke.listSnapshots);
router.delete('/snapshots/:id', stroke.deleteSnapshot);

module.exports = router;

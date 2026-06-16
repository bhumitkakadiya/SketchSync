const router = require('express').Router();
const room = require('../controllers/roomController');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.post('/', room.createRoom);
router.get('/', room.listRooms);
router.post('/join', room.joinRoom);
router.get('/:id', room.getRoom);
router.put('/:id', room.updateRoom);
router.delete('/:id', room.deleteRoom);
router.post('/:id/leave', room.leaveRoom);
router.get('/:id/members', room.getMembers);
router.delete('/:id/members/:uid', room.kickMember);
router.post('/:id/snapshot', room.saveSnapshot);

module.exports = router;

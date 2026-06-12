const router = require('express').Router();
const auth = require('../controllers/authController');
const authMiddleware = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/register', auth.register);
router.post('/login', loginLimiter, auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', authMiddleware, auth.logout);
router.get('/me', authMiddleware, auth.me);
router.put('/profile', authMiddleware, auth.updateProfile);

module.exports = router;

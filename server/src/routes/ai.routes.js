const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth.middleware');

// POST /api/v1/ai/chat - Process an AI chat message
router.post('/chat', authMiddleware, aiController.chat);

module.exports = router;

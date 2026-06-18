const crypto = require('crypto');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtUtils');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production' || process.env.RENDER || process.env.VERCEL;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// POST /auth/register
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'username, email, and password are required' } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_EMAIL', message: 'Please provide a valid email address' } });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one special character' } });
    }

    const user = new User({ username, email, password, displayName: displayName || username });
    await user.save();

    const payload = { id: user._id, username: user.username, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    user.refreshToken = hashToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    logger.info(`User registered: ${user.email}`);
    res.status(201).json({ success: true, data: { accessToken, user: user.toPublic() } });
  } catch (err) {
    next(err);
  }
};

// POST /auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Email and password required' } });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Account disabled' } });
    }

    const payload = { id: user._id, username: user.username, email: user.email };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    user.refreshToken = hashToken(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    logger.info(`User login: ${user.email}`);
    res.json({ success: true, data: { accessToken, user: user.toPublic() } });
  } catch (err) {
    next(err);
  }
};

// POST /auth/refresh
exports.refresh = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token' } });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' } });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== hashToken(token)) {
      return res.status(401).json({ success: false, error: { code: 'TOKEN_REUSE', message: 'Refresh token reuse detected' } });
    }

    const payload = { id: user._id, username: user.username, email: user.email };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    res.json({ success: true, data: { accessToken: newAccessToken } });
  } catch (err) {
    next(err);
  }
};

// POST /auth/logout
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: null });
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

// GET /auth/me
exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

// PUT /auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { displayName, avatarUrl, cursorColor } = req.body;
    const updates = {};
    if (displayName) updates.displayName = displayName;
    if (avatarUrl) updates.avatarUrl = avatarUrl;
    if (cursorColor) updates.cursorColor = cursorColor;

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true }).select('-password -refreshToken');
    res.json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
};

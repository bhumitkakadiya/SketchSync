const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User'); // Import User model for seeding

let mongoServer;

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sketchsync';
    let isMemory = false;
    
    // First, try connecting to the actual local MongoDB (if running)
    try {
      if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
        logger.info(`Attempting to connect to local MongoDB at ${uri} for persistence...`);
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
        logger.info(`MongoDB connected: ${conn.connection.host}`);
      } else {
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        logger.info(`MongoDB connected: ${conn.connection.host}`);
      }
    } catch (err) {
      if (uri.includes('127.0.0.1') || uri.includes('localhost')) {
        logger.warn('Local MongoDB not running. Falling back to MongoDB Memory Server (Persisting to local ./data folder)...');
        const fs = require('fs');
        const path = require('path');
        const dbPath = path.join(__dirname, '../../data/db');
        if (!fs.existsSync(dbPath)) {
          fs.mkdirSync(dbPath, { recursive: true });
        }
        mongoServer = await MongoMemoryServer.create({
          instance: {
            dbPath,
            storageEngine: 'wiredTiger'
          }
        });
        
        // Ensure it doesn't clean up the database directory when stopping
        const originalStop = mongoServer.stop.bind(mongoServer);
        mongoServer.stop = async (options) => {
          return await originalStop({ ...options, doCleanup: false });
        };

        uri = mongoServer.getUri();
        isMemory = true;
        const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
        logger.info(`MongoDB Memory Server connected: ${conn.connection.host} (Persistent)`);
      } else {
        throw err;
      }
    }

    if (isMemory) {
      // Auto-seed a default user so they don't have to keep recreating accounts
      const existing = await User.findOne({ email: 'admin@sketchsync.com' });
      if (!existing) {
        await User.create({
          username: 'admin',
          displayName: 'Admin User',
          email: 'admin@sketchsync.com',
          password: 'password123',
        });
        logger.info('🌱 Auto-seeded default user: admin@sketchsync.com / password123');
      }
    }
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting reconnect...');
});

module.exports = connectDB;

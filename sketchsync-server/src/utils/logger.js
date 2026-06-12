const winston = require('winston');

const { combine, timestamp, colorize, printf, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}]: ${message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'HH:mm:ss' }), json()),
  transports: [
    new winston.transports.Console({
      format: combine(timestamp({ format: 'HH:mm:ss' }), colorize(), consoleFormat),
    }),
  ],
});

module.exports = logger;

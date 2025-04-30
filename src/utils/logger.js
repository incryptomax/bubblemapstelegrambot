const winston = require('winston');
require('dotenv').config();

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Set default log level to debug in development environment
const defaultLogLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || defaultLogLevel,
  levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.printf(info => {
      return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf(info => {
          return `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`;
        })
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.File({ filename: 'logs/debug.log', level: 'debug' })
  ],
});

// Create directory structure if it doesn't exist
const fs = require('fs');
const path = require('path');
const logDirectory = path.join(process.cwd(), 'logs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Add a helper method to log objects
logger.logObject = (level, message, obj) => {
  logger[level](`${message} ${JSON.stringify(obj, null, 2)}`);
};

module.exports = logger; 
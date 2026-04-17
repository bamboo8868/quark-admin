import pino from 'pino';
import { config } from '../config/env.js';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');

// Create logs directory if not exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Base logger options
const options = {
  level: config.app.logLevel,
  base: { env: config.app.env }
};

// Dev: console + file | Prod: file only
if (config.app.env === 'dev') {
  options.transport = {
    targets: [
      { target: 'pino/file', options: { destination: path.join(logsDir, 'app.log') } },
      { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' } }
    ]
  };
} else {
  options.transport = {
    targets: [
      { target: 'pino/file', options: { destination: path.join(logsDir, 'app.log') } },
      { target: 'pino/file', options: { destination: path.join(logsDir, 'error.log'), level: 'error' } }
    ]
  };
}

const logger = pino(options);

// Logger wrapper
export const log = {
  info: (msg, meta = {}) => logger.info(meta, msg),
  error: (msg, error, meta = {}) => {
    const err = error ? { error: { message: error.message, stack: error.stack } } : {};
    logger.error({ ...meta, ...err }, msg);
  },
  warn: (msg, meta = {}) => logger.warn(meta, msg),
  debug: (msg, meta = {}) => logger.debug(meta, msg),
  req: (request) => logger.info({
    method: request.method,
    url: request.url,
    ip: request.ip
  }, 'request')
};

export default logger;

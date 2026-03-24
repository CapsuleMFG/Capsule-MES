import winston from 'winston';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const { combine, timestamp, colorize, printf, json } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

// Simple dev format: "2026-03-19 10:30:00 [info]: Server started on port 3001"
const devFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  colorize(),
  printf(({ timestamp, level, message, requestId, ...meta }) => {
    const rid = requestId ? ` [${requestId}]` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}:${rid} ${message}${extra}`;
  }),
);

// Production format: structured JSON for log aggregation
const prodFormat = combine(
  timestamp(),
  json(),
);

export const logger = winston.createLogger({
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  level: isProduction ? 'info' : 'debug',
  format: isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
  ],
});

// Add colors for custom levels
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
});

/**
 * Create a child logger with a requestId attached to every log line.
 *
 *   const log = logger.child({ requestId: crypto.randomUUID() });
 *   log.info('Processing request');  // includes requestId automatically
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}

/**
 * Express middleware that:
 *  1. Assigns a unique requestId to each request (available as req.requestId)
 *  2. Logs method, path, status code, and response time on finish
 */
export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = crypto.randomUUID();
  const start = Date.now();

  // Attach to request so downstream handlers can use it
  (req as Request & { requestId: string }).requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duration,
    });
  });

  next();
}

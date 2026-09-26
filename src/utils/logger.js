'use strict';

const pino = require('pino');
const { config } = require('../config');

const transport =
  config.env === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined;

const logger = pino({
  level: config.logLevel,
  base: { service: 'inteliocr' },
  transport,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers["x-api-key"]',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
    ],
    censor: '[REDACTED]',
  },
});

module.exports = logger;

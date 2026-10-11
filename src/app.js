'use strict';

const path = require('path');
const express = require('express');

const { config } = require('./config');
const {
  requestId,
  uaFilter,
  securityHeaders,
  corsMiddleware,
  noParamPollution,
} = require('./middleware/security');
const { ipLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./utils/errorHandler');
const logger = require('./utils/logger');
const apiRouter = require('./routes/api');

function buildApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(requestId());
  app.use(securityHeaders());
  app.use(corsMiddleware());
  app.use(uaFilter());
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.json({ limit: '32kb' }));
  app.use(noParamPollution());

  app.get(['/favicon.svg', '/favicon.ico'], (req, res) => {
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    res.sendFile(path.join(__dirname, 'public', 'favicon.svg'), { etag: true });
  });

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.debug(
        { method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - start },
        'request'
      );
    });
    next();
  });

  app.use(ipLimiter());
  app.use(apiRouter);

  app.use(
    '/example',
    express.static(path.join(__dirname, '..', 'examples'), { index: 'browser.html' })
  );

  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'inteliocr',
        version: '1.0.0',
        public_url: config.publicUrl || null,
        endpoints: {
          health: 'GET /health',
          ocr: 'POST /ocr',
          basic: 'POST /basic',
          example: 'GET /example',
        },
      },
      meta: { request_id: res.locals.requestId, timestamp: new Date().toISOString() },
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
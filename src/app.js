'use strict';

const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { config, validate } = require('./config');
const {
  requestId,
  uaFilter,
  securityHeaders,
  corsMiddleware,
  noParamPollution,
} = require('./middleware/security');
const { errorHandler, notFound } = require('./utils/errorHandler');
const logger = require('./utils/logger');

const apiRouter = require('./routes/api');
const dashboardRouter = require('./routes/dashboard');

function buildApp() {
  validate();

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  app.use(requestId());
  app.use(securityHeaders());
  app.use(corsMiddleware());
  app.use(uaFilter());
  app.use(express.urlencoded({ extended: false, limit: '32kb' }));
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.use(noParamPollution());

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

  app.use('/v1', apiRouter);
  app.use('/dashboard', dashboardRouter);

  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        service: 'inteliocr',
        version: '1.0.0',
        public_url: config.publicUrl || null,
        endpoints: {
          health: 'GET /v1/health',
          ocr: 'POST /v1/ocr',
          dashboard: 'GET /dashboard',
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

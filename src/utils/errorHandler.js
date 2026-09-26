'use strict';

const logger = require('./logger');

function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
    meta: { request_id: res.locals.requestId, timestamp: new Date().toISOString() },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const requestId = res.locals.requestId;

  if (err && err.status && err.code) {
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details || {} },
      meta: { request_id: requestId, timestamp: new Date().toISOString() },
    });
  }

  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds the size limit' },
      meta: { request_id: requestId, timestamp: new Date().toISOString() },
    });
  }

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file exceeds the size limit' },
      meta: { request_id: requestId, timestamp: new Date().toISOString() },
    });
  }

  logger.error({ err, requestId }, 'Unhandled error');
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    meta: { request_id: requestId, timestamp: new Date().toISOString() },
  });
}

module.exports = { errorHandler, notFound };

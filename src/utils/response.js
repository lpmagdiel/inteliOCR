'use strict';

const { v4: uuidv4 } = require('uuid');

function ok(res, data, meta = {}) {
  return res.json({
    success: true,
    data,
    meta: {
      request_id: res.locals.requestId || uuidv4(),
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
}

function fail(res, status, code, message, details = {}) {
  return res.status(status).json({
    success: false,
    error: { code, message, details },
    meta: {
      request_id: res.locals.requestId || uuidv4(),
      timestamp: new Date().toISOString(),
    },
  });
}

class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { ok, fail, ApiError };

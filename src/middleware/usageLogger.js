'use strict';

const { logRequest } = require('../services/usageService');
const { hashIp } = require('../utils/crypto');

function usageLogger() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const latencyMs = Number(process.hrtime.bigint() - start) / 1e6;
      const length = res.getHeader('content-length');
      const outBytes = length ? parseInt(length, 10) : 0;
      try {
        logRequest({
          apiKeyId: req.apiKey ? req.apiKey.id : null,
          ipHash: hashIp(req.ip),
          endpoint: req.originalUrl.split('?')[0],
          status: res.statusCode,
          latencyMs: Math.round(latencyMs),
          inBytes: req.file ? req.file.size : 0,
          outBytes,
          errorCode: res.locals.errorCode || null,
        });
      } catch (_e) {
        // never let logging break a response
      }
    });
    next();
  };
}

module.exports = usageLogger;

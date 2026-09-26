'use strict';

const { fail } = require('../utils/response');

function quotaGuard() {
  return async (req, res, next) => {
    if (!req.apiKey) return next();
    const { countCurrentMonthUsage } = require('../services/usageService');
    try {
      const used = countCurrentMonthUsage(req.apiKey.id);
      if (used >= req.apiKey.monthly_quota) {
        res.locals.errorCode = 'QUOTA_EXCEEDED';
        return fail(
          res,
          429,
          'QUOTA_EXCEEDED',
          'Monthly quota exceeded for this API key.',
          {
            limit: req.apiKey.monthly_quota,
            used,
            reset_at: nextMonthIso(),
          }
        );
      }
      req.quota = { used, limit: req.apiKey.monthly_quota };
      next();
    } catch (err) {
      next(err);
    }
  };
}

function nextMonthIso() {
  const d = new Date();
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1, 0, 0, 0));
  return next.toISOString();
}

module.exports = quotaGuard;

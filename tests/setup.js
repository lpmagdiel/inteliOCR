'use strict';

// Test environment setup — must run before any app code that reads env
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = require('./helpers/testDb').makeTempDir();
process.env.LOG_LEVEL = 'silent';
process.env.MINIMAX_API_KEY = 'test-key';
process.env.MINIMAX_API_BASE = 'https://minimax.test';
process.env.DASHBOARD_EMAIL = 'lpzcode@yahoo.com';
// Pre-computed bcrypt hash of 'admin123' (cost 4 for speed)
process.env.DASHBOARD_PASSWORD_HASH = '$2b$04$WEha07EVWKMK8SarCCJOiO32qrMRpygRg.j.wmBUORc1i6nUBpfXe';
process.env.JWT_SECRET = 'a'.repeat(48);
process.env.HASH_PEPPER = 'test-pepper';
process.env.RATE_LIMIT_IP_PER_MIN = '5';
process.env.RATE_LIMIT_KEY_PER_MIN = '10';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.TRUST_PROXY = '0';

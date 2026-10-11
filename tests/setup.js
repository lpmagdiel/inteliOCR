'use strict';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.MINIMAX_API_KEY = 'test-key';
process.env.MINIMAX_API_BASE = 'https://minimax.test';
process.env.RATE_LIMIT_IP_PER_MIN = '100';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.TRUST_PROXY = '0';
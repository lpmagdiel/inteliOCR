'use strict';

const { buildApp } = require('./app');
const { config, validate } = require('./config');
const logger = require('./utils/logger');

function start() {
  validate();
  const app = buildApp();

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'inteliOCR listening');
  });

  function shutdown(sig) {
    logger.info({ sig }, 'Shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (e) => logger.error({ err: e }, 'unhandledRejection'));
}

if (require.main === module) start();

module.exports = { start };
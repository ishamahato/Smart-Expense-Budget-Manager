'use strict';

const cron = require('node-cron');

const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/db');
const { processDueRecurringExpenses } = require('./services/recurring.service');

let server;
let recurringJob;

async function start() {
  await connectDB();

  server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port} [${config.env}]`);
    logger.info(
      config.gemini.apiKey
        ? `Gemini enabled (${config.gemini.model})`
        : 'Gemini API key not set — AI endpoints fall back to the local rules engine'
    );
  });

  if (config.recurring.cronEnabled) {
    // Materialise due recurring expenses once a day.
    recurringJob = cron.schedule(config.recurring.cronSchedule, () => {
      processDueRecurringExpenses().catch((err) =>
        logger.error(`Recurring sweep failed: ${err.message}`)
      );
    });
    logger.info(`Recurring expense job scheduled (${config.recurring.cronSchedule})`);

    // Also run once at boot so a restart catches up anything missed downtime.
    processDueRecurringExpenses().catch((err) =>
      logger.error(`Initial recurring sweep failed: ${err.message}`)
    );
  }
}

async function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);
  if (recurringJob) recurringJob.stop();
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
  process.exit(0);
}

['SIGINT', 'SIGTERM'].forEach((sig) => process.on(sig, () => shutdown(sig)));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err);
  process.exit(1);
});

start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

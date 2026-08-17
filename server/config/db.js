'use strict';

const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

async function connectDB(uri = config.mongoUri) {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 20,
    });
    logger.info(`MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    throw err;
  }
}

async function disconnectDB() {
  await mongoose.connection.close();
}

module.exports = { connectDB, disconnectDB };

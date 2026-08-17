'use strict';

/**
 * Tiny leveled logger. Keeps output readable in dev and structured-ish in prod
 * without pulling in a logging framework for a portfolio-sized project.
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const active = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'test' ? 0 : 2);

function stamp() {
  return new Date().toISOString();
}

function emit(level, stream, ...args) {
  if (LEVELS[level] > active) return;
  // eslint-disable-next-line no-console
  console[stream](`${stamp()} [${level.toUpperCase()}]`, ...args);
}

module.exports = {
  error: (...a) => emit('error', 'error', ...a),
  warn: (...a) => emit('warn', 'warn', ...a),
  info: (...a) => emit('info', 'log', ...a),
  debug: (...a) => emit('debug', 'log', ...a),
};

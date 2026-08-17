'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

module.exports = { signToken, verifyToken };

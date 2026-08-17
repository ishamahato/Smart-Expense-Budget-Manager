'use strict';

const ApiError = require('../utils/ApiError');

/**
 * Validates `req[source]` against a Zod schema and REPLACES it with the parsed
 * result, so controllers only ever see coerced, whitelisted values — unknown
 * keys are stripped by the schemas' default object behaviour.
 */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, _res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    if (source === 'query') {
      // req.query is a getter in some Express versions — mutate in place.
      req.validatedQuery = result.data;
    } else {
      req[source] = result.data;
    }
    return next();
  };
}

module.exports = validate;

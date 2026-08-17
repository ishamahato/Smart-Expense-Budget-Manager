'use strict';

const axios = require('axios');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Thin wrapper over the Gemini REST API.
 *
 * The API key lives only in this process — it is read from the environment,
 * sent as a request header (never a query string, so it cannot leak into proxy
 * logs) and is never included in any response returned to the browser.
 */

const client = axios.create({
  baseURL: config.gemini.baseUrl,
  timeout: config.gemini.timeoutMs,
  headers: { 'Content-Type': 'application/json' },
});

class GeminiUnavailableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'GeminiUnavailableError';
    this.cause = cause;
  }
}

function isEnabled() {
  return Boolean(config.gemini.apiKey);
}

function extractText(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate) return '';
  if (candidate.finishReason === 'SAFETY') {
    throw new ApiError(422, 'The response was blocked by the model safety filter.');
  }
  const parts = candidate.content?.parts || [];
  return parts
    .map((p) => p.text || '')
    .join('')
    .trim();
}

/** Models in the 2.5 family think by default; that budget is wasted here. */
function generationConfigFor({ json, temperature, maxOutputTokens, schema }) {
  const cfg = {
    temperature,
    maxOutputTokens,
    topP: 0.95,
  };
  if (json) {
    cfg.responseMimeType = 'application/json';
    if (schema) cfg.responseSchema = schema;
  }
  if (config.gemini.model.includes('2.5')) {
    cfg.thinkingConfig = { thinkingBudget: 0 };
  }
  return cfg;
}

/**
 * @param {object} opts
 * @param {string} opts.prompt        User-turn content.
 * @param {string} [opts.system]      System instruction.
 * @param {Array}  [opts.history]     Prior turns: [{ role: 'user'|'model', text }]
 * @param {boolean}[opts.json]        Ask for a JSON response.
 * @param {object} [opts.schema]      Response schema (OpenAPI subset) when json.
 */
async function generate({
  prompt,
  system,
  history = [],
  json = false,
  schema = null,
  temperature = json ? 0.1 : 0.4,
  maxOutputTokens = 2048,
}) {
  if (!isEnabled()) {
    throw new GeminiUnavailableError('GEMINI_API_KEY is not configured');
  }

  const contents = [
    ...history
      .filter((h) => h && h.text)
      .slice(-10) // cap context growth
      .map((h) => ({
        role: h.role === 'model' || h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(h.text).slice(0, 4000) }],
      })),
    { role: 'user', parts: [{ text: prompt }] },
  ];

  const body = {
    contents,
    generationConfig: generationConfigFor({ json, temperature, maxOutputTokens, schema }),
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  try {
    const { data } = await client.post(
      `/models/${config.gemini.model}:generateContent`,
      body,
      { headers: { 'x-goog-api-key': config.gemini.apiKey } }
    );

    const text = extractText(data);
    if (!text) {
      throw new GeminiUnavailableError('Gemini returned an empty response');
    }
    return {
      text,
      model: config.gemini.model,
      usage: data.usageMetadata || null,
    };
  } catch (err) {
    if (err instanceof ApiError || err instanceof GeminiUnavailableError) throw err;

    const status = err.response?.status;
    const upstream = err.response?.data?.error?.message || err.message;
    // Log server-side only; the client never sees upstream detail or the key.
    logger.warn(`Gemini request failed (${status || 'network'}): ${upstream}`);

    if (status === 400 && /API key/i.test(upstream)) {
      throw new GeminiUnavailableError('Gemini API key was rejected');
    }
    if (status === 429) {
      throw new GeminiUnavailableError('Gemini rate limit reached');
    }
    throw new GeminiUnavailableError('Gemini is temporarily unreachable', err);
  }
}

/** Parses a JSON reply, tolerating markdown fences the model sometimes adds. */
function parseJsonResponse(text) {
  let cleaned = String(text).trim();
  const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) cleaned = fence[1].trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: grab the outermost object or array.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    throw new GeminiUnavailableError('Gemini returned malformed JSON');
  }
}

module.exports = {
  generate,
  parseJsonResponse,
  isEnabled,
  GeminiUnavailableError,
  model: config.gemini.model,
};

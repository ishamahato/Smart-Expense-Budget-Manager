'use strict';

const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/ai.service');
const gemini = require('../services/gemini.service');

/**
 * POST /api/ai/chat
 * The user's question plus a snapshot of THEIR data only. No tool access, no
 * database handle is ever exposed to the model.
 */
const chat = asyncHandler(async (req, res) => {
  const { message, history } = req.body;

  const result = await aiService.chat({ user: req.user, message, history });

  res.json({
    success: true,
    data: {
      reply: result.reply,
      source: result.source,
      model: result.model,
      notice: result.notice || null,
      suggestions: aiService.suggestedPrompts(result.context),
    },
  });
});

/** POST /api/ai/parse-expense — natural language → a draft expense. */
const parseExpense = asyncHandler(async (req, res) => {
  const parsed = await aiService.parseExpenseText({
    user: req.user,
    text: req.body.text,
  });

  res.json({
    success: true,
    message: 'Review the details before saving',
    data: { parsed },
  });
});

/** POST /api/ai/suggest-budget */
const suggestBudget = asyncHandler(async (req, res) => {
  const suggestion = await aiService.suggestBudget({
    user: req.user,
    targetAmount: req.body.targetAmount,
  });

  res.json({ success: true, data: { suggestion } });
});

/** GET /api/ai/status — lets the UI show whether Gemini is wired up. */
const status = asyncHandler(async (req, res) => {
  const context = await aiService.buildFinancialContext(req.user, { months: 3 });
  res.json({
    success: true,
    data: {
      geminiConfigured: gemini.isEnabled(),
      model: gemini.isEnabled() ? gemini.model : null,
      suggestions: aiService.suggestedPrompts(context),
      dataPoints: {
        transactionsThisMonth: context.thisMonth.transactions,
        categoriesTracked: context.availableCategories.length,
        budgetsSet: context.budgets.byCategory.length,
      },
    },
  });
});

module.exports = { chat, parseExpense, suggestBudget, status };

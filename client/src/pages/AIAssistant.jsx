import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bot, Send, Shield, Sparkles, Trash2, User, Zap } from 'lucide-react';
import { aiService } from '../services';
import { useAsync, useAuth, useDocumentTitle, useToast } from '../hooks';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Feedback';
import { initials } from '../utils/format';
import cn from '../utils/cn';

/**
 * Very small markdown renderer for the assistant's replies: bold, inline code,
 * bullet lists and paragraphs. Everything is escaped first, so model output can
 * never inject markup into the page.
 */
function renderMarkdown(text) {
  const escape = (s) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const inline = (s) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-ink">$1</strong>')
      .replace(/`(.+?)`/g, '<code class="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">$1</code>');

  const blocks = [];
  let list = null;

  for (const line of String(text).split('\n')) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      list = list || [];
      list.push(`<li class="leading-relaxed">${inline(bullet[1])}</li>`);
      continue;
    }
    if (list) {
      blocks.push(`<ul class="my-2 ml-4 list-disc space-y-1.5 text-sm leading-relaxed">${list.join('')}</ul>`);
      list = null;
    }
    if (line.trim()) blocks.push(`<p class="leading-relaxed">${inline(line)}</p>`);
  }
  if (list) blocks.push(`<ul class="my-2 ml-4 list-disc space-y-1.5 text-sm leading-relaxed">${list.join('')}</ul>`);

  return blocks.join('');
}

function Message({ role, text, notice }) {
  const isUser = role === 'user';
  const { user } = useAuth();

  return (
    <div className={cn('flex gap-3.5 animate-fade-in', isUser && 'flex-row-reverse')}>
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-xs font-bold shadow-sm ring-1 ring-white/10',
          isUser
            ? 'bg-canvas text-muted border border-line'
            : 'bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-brand-500/20'
        )}
      >
        {isUser ? initials(user?.name || 'You') : <Sparkles className="h-4.5 w-4.5" />}
      </span>

      <div className={cn('min-w-0 max-w-[85%]', isUser && 'text-right')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4.5 py-3 text-left text-sm leading-relaxed shadow-xs',
            isUser
              ? 'rounded-tr-xs bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-brand-500/10'
              : 'rounded-tl-xs border border-line/80 bg-surface text-ink'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <div
              className="space-y-2 text-ink/90 dark:text-gray-100"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
            />
          )}
        </div>

        {notice && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}

export default function AIAssistant() {
  useDocumentTitle('AI Assistant');
  const toast = useToast();
  const scrollRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const { data: status } = useAsync(() => aiService.status(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function send(question) {
    const text = (question ?? input).trim();
    if (!text || sending) return;

    const history = messages.slice(-8).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.text,
    }));

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      const result = await aiService.chat({ message: text, history });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: result.reply,
          notice: result.notice,
        },
      ]);
    } catch (err) {
      toast.error(err.message);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: `I couldn't answer that just now. ${err.message}`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const suggestions = status?.suggestions || [
    'Summarize my spending this month',
    'Where did I overspend this month?',
    'Compare this month to last month',
    'What are my highest recurring expenses?',
  ];

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] max-w-4xl flex-col animate-fade-in">
      <PageHeader
        title="AI Financial Copilot"
        subtitle="Insights derived strictly from your own expenses and budgets."
        className="mb-4"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={status?.geminiConfigured ? 'success' : 'warning'} dot>
              {status?.geminiConfigured ? `Gemini · ${status.model}` : 'Local rules engine'}
            </Badge>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setMessages([])}>
                Clear
              </Button>
            )}
          </div>
        }
      />

      <Card padded={false} className="flex min-h-0 flex-1 flex-col overflow-hidden shadow-card border-line">
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6 sm:p-8">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-lift shadow-brand-500/25 ring-2 ring-white/20">
                <Sparkles className="h-8 w-8" />
              </span>
              <h3 className="text-xl font-bold tracking-tight text-ink">Ask about your financial habits</h3>
              <p className="mt-2 max-w-md text-sm text-muted leading-relaxed">
                {status?.dataPoints?.transactionsThisMonth
                  ? `Analyzing ${status.dataPoints.transactionsThisMonth} transactions recorded this month across ${status.dataPoints.categoriesTracked} active categories.`
                  : 'Record a few expenses and I can start spotting trends and budget overruns for you.'}
              </p>

              <div className="mt-8 grid w-full max-w-lg gap-2.5 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-xl border border-line bg-surface p-3.5 text-left text-xs font-semibold text-muted transition hover:border-brand-400 hover:text-brand-600 hover:shadow-sm dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                  >
                    <span className="flex items-center gap-1.5 mb-1 text-brand-600 dark:text-brand-400">
                      <Zap className="h-3 w-3" /> Quick Query
                    </span>
                    {s}
                  </button>
                ))}
              </div>

              {!status?.geminiConfigured && (
                <p className="mt-6 max-w-md rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 leading-relaxed">
                  No Gemini API key is configured, so answers come from the built-in local rules engine. Add <code className="font-mono font-semibold">GEMINI_API_KEY</code> to{' '}
                  <code className="font-mono font-semibold">server/.env</code> for full generative reasoning.
                </p>
              )}
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <Message key={m.id} role={m.role} text={m.text} notice={m.notice} />
              ))}

              {sending && (
                <div className="flex gap-3.5 animate-fade-in">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white shadow-sm">
                    <Bot className="h-4.5 w-4.5" />
                  </span>
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-line bg-surface px-4 py-3 shadow-xs">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 animate-bounce rounded-full bg-brand-500"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-line bg-surface/90 p-4 backdrop-blur-sm">
          {messages.length > 0 && !sending && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-medium text-muted transition hover:border-brand-400 hover:text-brand-600 dark:hover:border-brand-500/40 dark:hover:text-brand-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about your spending, budget forecasts or category insights…"
              className="input-base flex-1 rounded-xl"
              disabled={sending}
              aria-label="Message the assistant"
              maxLength={1000}
            />
            <Button type="submit" icon={Send} loading={sending} disabled={!input.trim()} className="rounded-xl">
              <span className="hidden sm:inline">Ask AI</span>
            </Button>
          </form>

          <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            Your transactions are analyzed safely and never used to train third-party public models.
          </p>
        </div>
      </Card>
    </div>
  );
}

import { useRef, useState, type FormEvent } from 'react';
import type { Translations } from '../i18n/translations';
import { streamAssistantChat } from '../services/apiClient';
import type { AirQualitySnapshot } from '../shared/schemas/aqi.schema';
import type { ChatMessage } from '../shared/schemas/chat.schema';
import type { HouseholdProfile } from '../shared/schemas/profile.schema';
import { getLocalizedAqiText } from '../shared/utils/aqiCategories';

interface ChatAssistantProps {
  profile: HouseholdProfile;
  aqi: AirQualitySnapshot | null;
  t: Translations;
}

const STARTER_PROMPTS_EN = [
  'Is it safe for kids to play outside today?',
  'Best time to open windows today?',
  'How do I build a safe DIY box-fan filter?',
];

const STARTER_PROMPTS_HI = [
  'क्या आज बच्चों का बाहर खेलना सुरक्षित है?',
  'आज खिड़कियाँ खोलने का सबसे अच्छा समय क्या है?',
  'कम खर्च में DIY बॉक्स-फैन एयर फ़िल्टर कैसे बनाएं?',
];

/**
 * Stitch Ask CleanBreath streaming assistant grounded in household profile and live AQI.
 */
export function ChatAssistant({ profile, aqi, t }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const starters = profile.language === 'hi' ? STARTER_PROMPTS_HI : STARTER_PROMPTS_EN;
  const localized = aqi ? getLocalizedAqiText(aqi.category, profile.language) : null;

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || !aqi || streaming) return;

    const userMsg: ChatMessage = { role: 'user', text: trimmed.slice(0, 600) };
    const nextHistory = [...messages, userMsg].slice(-12);

    setMessages([...nextHistory, { role: 'model', text: '' }]);
    setInput('');
    setChatError(null);
    setStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAssistantChat(
        { profile, aqi, messages: nextHistory },
        (chunk) => {
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === 'model') {
              copy[copy.length - 1] = { role: 'model', text: last.text + chunk };
            }
            return copy;
          });
        },
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setChatError(err instanceof Error ? err.message : 'Unable to stream response.');
      }
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return (
    <>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 px-page-margin py-gutter-lg pb-52 flex flex-col gap-gutter-lg focus:outline-none"
      >
        <div className="flex flex-col gap-gutter-xs">
          <h1 className="font-headline text-headline-lg-mobile md:text-headline-lg">
            {t.askTitle}
          </h1>
          <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Calm, family-specific answers grounded in {profile.location.locality}
            {aqi && localized ? ` (AQI ${aqi.aqi} · ${localized.label})` : ''}.
          </p>
        </div>

        {/* Suggested Question Chips */}
        <section aria-labelledby="suggested-heading" className="flex flex-col gap-gutter-sm">
          <h2
            id="suggested-heading"
            className="font-label text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant"
          >
            Suggested questions
          </h2>
          <div className="flex flex-wrap gap-gutter-sm">
            {starters.map((prompt, index) => (
              <button
                key={prompt}
                type="button"
                disabled={!aqi || streaming}
                onClick={() => void sendQuestion(prompt)}
                className={`min-h-12 px-gutter-lg py-gutter-sm rounded-full font-label text-label-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:opacity-50 ${
                  index === 0
                    ? 'bg-light-secondary-container dark:bg-dark-secondary-container text-light-on-secondary-container dark:text-dark-on-secondary-container'
                    : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        {/* Streaming Reply Thread */}
        <section
          aria-live="polite"
          aria-relevant="additions text"
          aria-label="Assistant conversation"
          className="flex flex-col gap-gutter-md"
        >
          {messages.length === 0 ? (
            <article className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-sm">
              <div className="flex items-center gap-gutter-sm">
                <span
                  className="material-symbols-outlined text-light-primary dark:text-dark-primary"
                  aria-hidden="true"
                >
                  smart_toy
                </span>
                <span className="font-label text-label-md text-light-primary dark:text-dark-primary">
                  CleanBreath Assistant
                </span>
              </div>
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
                Ask about masks, window opening times, indoor filters, or safe outdoor windows for
                your household. Every answer explains why and its confidence level.
              </p>
            </article>
          ) : (
            messages.map((msg, idx) =>
              msg.role === 'user' ? (
                <div
                  key={`u-${idx}`}
                  className="self-end max-w-[85%] p-gutter-lg rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary"
                >
                  <p className="font-body text-body-md whitespace-pre-wrap">{msg.text}</p>
                </div>
              ) : (
                <article
                  key={`m-${idx}`}
                  className="p-gutter-xl rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-gutter-sm"
                >
                  <div className="flex items-center gap-gutter-sm">
                    <span
                      className="material-symbols-outlined text-light-primary dark:text-dark-primary"
                      aria-hidden="true"
                    >
                      smart_toy
                    </span>
                    <span className="font-label text-label-md text-light-primary dark:text-dark-primary">
                      CleanBreath Assistant
                    </span>
                  </div>
                  <p className="font-body text-body-md text-pretty whitespace-pre-wrap">
                    {msg.text || (streaming && idx === messages.length - 1 ? 'Thinking…' : '')}
                  </p>
                </article>
              ),
            )
          )}
        </section>

        {chatError && (
          <p
            role="alert"
            className="p-gutter-md rounded-md bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container font-label text-label-md"
          >
            {chatError}
          </p>
        )}
      </main>

      {/* Fixed Composer Bar docked cleanly above Bottom Disclaimer + Nav */}
      <div className="fixed bottom-[89px] inset-x-0 z-20 bg-light-surface dark:bg-dark-surface border-t border-light-outline-variant dark:border-dark-outline-variant">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="px-page-margin py-gutter-sm flex items-center gap-gutter-sm"
          >
            <label htmlFor="chat-input" className="sr-only">
              {t.askPlaceholder}
            </label>
            <input
              id="chat-input"
              type="text"
              maxLength={600}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.askPlaceholder}
              disabled={!aqi}
              className="flex-1 min-h-12 px-gutter-lg rounded-full bg-light-surface-container-lowest dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface border border-light-outline dark:border-dark-outline font-body text-body-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary"
            />
            {streaming ? (
              <button
                type="button"
                onClick={handleStop}
                aria-label="Stop response"
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-light-error-container dark:bg-dark-error-container text-light-on-error-container dark:text-dark-on-error-container shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-error dark:focus-visible:ring-dark-error"
              >
                <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
                  stop
                </span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!aqi || !input.trim()}
                aria-label="Send question"
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light-primary dark:focus-visible:ring-dark-primary disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-title-lg" aria-hidden="true">
                  send
                </span>
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}

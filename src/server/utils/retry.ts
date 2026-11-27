export interface RetryOptions {
  timeoutMs?: number;
  retries?: number;
  baseDelayMs?: number;
}

/**
 * Executes an async operation with a per-attempt AbortSignal timeout and exponential backoff.
 * @param fn Operation receiving an AbortSignal.
 * @param options Timeout and retry parameters.
 */
export async function withTimeoutAndRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const retries = options.retries ?? 2;
  const baseDelayMs = options.baseDelayMs ?? 250;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const timeoutErr = new Error('Request timed out');
          controller.abort(timeoutErr);
          reject(timeoutErr);
        }, timeoutMs);
      });

      const result = await Promise.race([fn(controller.signal), timeoutPromise]);
      if (timer) clearTimeout(timer);
      return result;
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastError = err;

      if (attempt < retries) {
        const jitter = Math.floor(Math.random() * 80);
        const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

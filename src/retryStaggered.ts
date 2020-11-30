import { BaseQueryEnhancer } from './apiTypes';

async function waitStaggered(attempt: number = 0, maxRetries: number = 5, delay: number = 300) {
  const attempts = Math.min(attempt, maxRetries);
  /**
   * Exponential backoff that would give a baseline like:
   * 1 - 600ms + rand
   * 2 - 1200ms + rand
   * 3 - 2400ms + rand
   * 4 - 4800ms + rand
   * 5 - 9600ms + rand
   *
   */
  const timeout = ~~((Math.random() + 0.4) * (delay << attempts)); // Force a positive int in the case we make this an option
  await new Promise((resolve) => setTimeout((res) => resolve(res), timeout));
}

interface StaggerOptions {
  /**
   * how many times the query will be retried (default: 5)
   */
  maxRetries?: number;
}

export function withoutStaggering(e: any) {
  return Object.assign(e, { throwImmediately: true });
}

export const retryStaggered: BaseQueryEnhancer<unknown, StaggerOptions, StaggerOptions | void> = (
  baseQuery,
  defaultOptions
) => async (args, api, extraOptions) => {
  const options = { maxRetries: 5, ...defaultOptions, ...extraOptions };
  let retry = 0;

  while (true) {
    try {
      const result = await baseQuery(args, api, extraOptions);
      // baseQueries _should_ return an error property, so we should check for that and throw it to continue retrying
      if (result.error && 'status' in (result.error as any) && 'data' in (result.error as any)) {
        throw result;
      }
      return result;
    } catch (e) {
      retry++;
      if (e.throwImmediately || retry > options.maxRetries) {
        throw e;
      }
      await waitStaggered(retry, options.maxRetries);
    }
  }
};

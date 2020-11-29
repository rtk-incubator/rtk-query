import { BaseQueryEnhancer } from './apiTypes';

// TODO
async function waitStaggered(...args: any[]) {}

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
      // TODO: handling for `{error: ...}` return value from baseQuery - maybe also make that
      // configurable as "graceful exit" so we don't need `throw withoutStaggering(error)`?
      return await baseQuery(args, api, extraOptions);
    } catch (e) {
      retry++;
      if (e.throwImmediately || retry > options.maxRetries) {
        throw e;
      }
      await waitStaggered(retry); // whatever
    }
  }
};

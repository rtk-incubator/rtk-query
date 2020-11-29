import { BaseQueryFn, createApi, retryStaggered } from '@rtk-incubator/rtk-query';
import { setupApiStore, waitMs } from './helpers';

describe('configuration', () => {
  test('staggering without any config', async () => {
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockRejectedValue(new Error('rejected'));

    const baseQuery = retryStaggered(baseBaseQuery);
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        q1: build.query({
          query: () => {},
        }),
      }),
    });

    const storeRef = setupApiStore(api);
    storeRef.store.dispatch(api.endpoints.q1.initiate({}));

    await waitMs(3);

    expect(baseBaseQuery).toHaveBeenCalledTimes(6);
  });

  test('staggering with global config overrides defaults', async () => {
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockRejectedValue(new Error('rejected'));

    const baseQuery = retryStaggered(baseBaseQuery, { maxRetries: 3 });
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        q1: build.query({
          query: () => {},
        }),
      }),
    });

    const storeRef = setupApiStore(api);
    storeRef.store.dispatch(api.endpoints.q1.initiate({}));

    await waitMs(3);

    expect(baseBaseQuery).toHaveBeenCalledTimes(4);
  });

  test('staggering with endpoint config overrides global config', async () => {
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockRejectedValue(new Error('rejected'));

    const baseQuery = retryStaggered(baseBaseQuery, { maxRetries: 3 });
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        q1: build.query({
          query: () => {},
        }),
        q2: build.query({
          query: () => {},
          extraOptions: { maxRetries: 8 },
        }),
      }),
    });

    const storeRef = setupApiStore(api);

    storeRef.store.dispatch(api.endpoints.q1.initiate({}));
    await waitMs(3);
    expect(baseBaseQuery).toHaveBeenCalledTimes(4);

    baseBaseQuery.mockClear();

    storeRef.store.dispatch(api.endpoints.q2.initiate({}));
    await waitMs(3);
    expect(baseBaseQuery).toHaveBeenCalledTimes(9);
  });

  test.todo('same with mutations');
  test.todo('non-error-cases should **not** retry');
  test.todo('throwing `withoutStaggering(error)` will skip staggering and expose the error directly');

  test.todo('wrapping retryStaggered(retryStaggered(..., { maxRetries: 3 }), { maxRetries: 3 }) should retry 9 times');
});

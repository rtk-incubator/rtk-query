import { BaseQueryFn, createApi, retryStaggered, withoutStaggering } from '@rtk-incubator/rtk-query';
import { setupApiStore, waitMs } from './helpers';

beforeEach(() => {
  jest.useFakeTimers();
});

const loopTimers = async (max: number = 12) => {
  let count = 0;
  while (count < max) {
    await waitMs(1);
    jest.advanceTimersByTime(120000);
    count++;
  }
};

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

    await loopTimers(7);

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

    await loopTimers(5);

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
    await loopTimers(5);

    expect(baseBaseQuery).toHaveBeenCalledTimes(4);

    baseBaseQuery.mockClear();

    storeRef.store.dispatch(api.endpoints.q2.initiate({}));

    await loopTimers(10);

    expect(baseBaseQuery).toHaveBeenCalledTimes(9);
  });

  test('staggered retries also work with mutations', async () => {
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockRejectedValue(new Error('rejected'));

    const baseQuery = retryStaggered(baseBaseQuery, { maxRetries: 3 });
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        m1: build.mutation({
          query: () => ({ method: 'PUT' }),
        }),
      }),
    });

    const storeRef = setupApiStore(api);

    storeRef.store.dispatch(api.endpoints.m1.initiate({}));

    await loopTimers(5);

    expect(baseBaseQuery).toHaveBeenCalledTimes(4);
  });
  test('non-error-cases should **not** retry', async () => {
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockResolvedValue({ data: { success: true } });

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

    await loopTimers(2);

    expect(baseBaseQuery).toHaveBeenCalledTimes(1);
  });
  test('throwing withoutStaggering(error) will skip staggering and expose the error directly', async () => {
    const error = { message: 'banana' };

    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockRejectedValue(error);

    const baseQuery = withoutStaggering(baseBaseQuery);
    const api = createApi({
      baseQuery,
      endpoints: (build) => ({
        q1: build.query({
          query: () => {},
        }),
      }),
    });

    const storeRef = setupApiStore(api);

    const result = await storeRef.store.dispatch(api.endpoints.q1.initiate({}));

    await loopTimers(2);

    expect(baseBaseQuery).toHaveBeenCalledTimes(1);
    expect(result.error).toEqual(error);
    expect(result).toEqual({
      endpoint: 'q1',
      error,
      internalQueryArgs: undefined,
      isError: true,
      isLoading: false,
      isSuccess: false,
      isUninitialized: false,
      originalArgs: expect.any(Object),
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: 'rejected',
    });
  });

  test('wrapping retryStaggered(retryStaggered(..., { maxRetries: 3 }), { maxRetries: 3 }) should retry 16 times', async () => {
    /**
     * Note:
     * This will retry 16 total times because we try the initial + 3 retries (sum: 4), then retry that process 3 times (starting at 0 for a total of 4)... 4x4=16 (allegedly)
     */
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery.mockRejectedValue(new Error('rejected'));

    const baseQuery = retryStaggered(retryStaggered(baseBaseQuery, { maxRetries: 3 }), { maxRetries: 3 });
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

    await loopTimers(18);

    expect(baseBaseQuery).toHaveBeenCalledTimes(16);
  });

  test('stops retrying after a success', async () => {
    const baseBaseQuery = jest.fn<ReturnType<BaseQueryFn>, Parameters<BaseQueryFn>>();
    baseBaseQuery
      .mockRejectedValueOnce(new Error('rejected'))
      .mockRejectedValueOnce(new Error('rejected'))
      .mockResolvedValue({ data: { success: true } });

    const baseQuery = retryStaggered(baseBaseQuery, { maxRetries: 10 });
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

    await loopTimers(4);

    expect(baseBaseQuery).toHaveBeenCalledTimes(3);
  });
});

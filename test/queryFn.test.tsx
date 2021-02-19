import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '@rtk-incubator/rtk-query';

const baseQuery = jest.fn((arg: string) => ({ data: arg }));

const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    withQuery: build.query({
      query(arg: string) {
        return `resultFrom(${arg})`;
      },
    }),
    withQueryFn: build.query({
      queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    withErrorQueryFn: build.query({
      queryFn(arg: string) {
        return { error: new Error(`resultFrom(${arg})`) };
      },
    }),
    withThrowingQueryFn: build.query({
      queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    withAsyncQueryFn: build.query({
      async queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    withAsyncErrorQueryFn: build.query({
      async queryFn(arg: string) {
        return { error: new Error(`resultFrom(${arg})`) };
      },
    }),
    withAsyncThrowingQueryFn: build.query({
      async queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    mutationWithQueryFn: build.mutation({
      queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    mutationWithErrorQueryFn: build.mutation({
      queryFn(arg: string) {
        return { error: new Error(`resultFrom(${arg})`) };
      },
    }),
    mutationWithThrowingQueryFn: build.mutation({
      queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    mutationWithAsyncQueryFn: build.mutation({
      async queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    mutationWithAsyncErrorQueryFn: build.mutation({
      async queryFn(arg: string) {
        return { error: new Error(`resultFrom(${arg})`) };
      },
    }),
    mutationWithAsyncThrowingQueryFn: build.mutation({
      async queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    // @ts-expect-error
    withNeither: build.query({}),
    // @ts-expect-error
    mutationWithNeither: build.mutation({}),
  }),
});

const {
  withQuery,
  withQueryFn,
  withErrorQueryFn,
  withThrowingQueryFn,
  withAsyncQueryFn,
  withAsyncErrorQueryFn,
  withAsyncThrowingQueryFn,
  mutationWithQueryFn,
  mutationWithErrorQueryFn,
  mutationWithThrowingQueryFn,
  mutationWithAsyncQueryFn,
  mutationWithAsyncErrorQueryFn,
  mutationWithAsyncThrowingQueryFn,
  withNeither,
  mutationWithNeither,
} = api.endpoints;

const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (gDM) =>
    gDM({
      // still a TODO: returned error needs to be serialized - for now this will warn
      serializableCheck: true,
    }).concat(api.middleware),
});

test.each([
  ['withQuery', withQuery, 'data'],
  ['withQueryFn', withQueryFn, 'data'],
  ['withErrorQueryFn', withErrorQueryFn, 'error'],
  ['withThrowingQueryFn', withThrowingQueryFn, 'error'],
  ['withAsyncQueryFn', withAsyncQueryFn, 'data'],
  ['withAsyncErrorQueryFn', withAsyncErrorQueryFn, 'error'],
  ['withAsyncThrowingQueryFn', withAsyncThrowingQueryFn, 'error'],
])('%s1', async (endpointName, endpoint, expectedResult) => {
  const thunk = endpoint.initiate(endpointName);
  const result = await store.dispatch(thunk);
  if (expectedResult === 'data') {
    expect(result).toEqual(
      expect.objectContaining({
        data: `resultFrom(${endpointName})`,
      })
    );
  } else {
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ message: `resultFrom(${endpointName})` }),
      })
    );
  }
});

test.each([
  ['mutationWithQueryFn', mutationWithQueryFn, 'data'],
  ['mutationWithErrorQueryFn', mutationWithErrorQueryFn, 'error'],
  ['mutationWithThrowingQueryFn', mutationWithThrowingQueryFn, 'error'],
  ['mutationWithAsyncQueryFn', mutationWithAsyncQueryFn, 'data'],
  ['mutationWithAsyncErrorQueryFn', mutationWithAsyncErrorQueryFn, 'error'],
  ['mutationWithAsyncThrowingQueryFn', mutationWithAsyncThrowingQueryFn, 'error'],
])('%s', async (endpointName, endpoint, expectedResult) => {
  const thunk = endpoint.initiate(endpointName);
  const result = await store.dispatch(thunk);
  if (expectedResult === 'data') {
    expect(result).toEqual(
      expect.objectContaining({
        data: `resultFrom(${endpointName})`,
      })
    );
  } else {
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({ message: `resultFrom(${endpointName})` }),
      })
    );
  }
});

test('neither provided', async () => {
  {
    const thunk = withNeither.initiate('withNeither');
    const result = await store.dispatch(thunk);
    expect(result.error).toEqual(expect.objectContaining({ message: 'endpointDefinition.queryFn is not a function' }));
  }
  {
    const thunk = mutationWithNeither.initiate('mutationWithNeither');
    const result = await store.dispatch(thunk);
    expect(result.error).toEqual(expect.objectContaining({ message: 'endpointDefinition.queryFn is not a function' }));
  }
});

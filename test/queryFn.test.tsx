import { configureStore } from '@reduxjs/toolkit';
import { BaseQueryFn, createApi } from '@rtk-incubator/rtk-query';

const baseQuery: BaseQueryFn<string, { wrappedByBaseQuery: string }, string> = jest.fn((arg: string) => ({
  data: { wrappedByBaseQuery: arg },
}));

const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    withQuery: build.query<string, string>({
      query(arg: string) {
        return `resultFrom(${arg})`;
      },
      transformResponse(response) {
        return response.wrappedByBaseQuery;
      },
    }),
    withQueryFn: build.query<string, string>({
      queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    withInvalidDataQueryFn: build.query<string, string>({
      // @ts-expect-error
      queryFn(arg: string) {
        return { data: 5 };
      },
    }),
    withErrorQueryFn: build.query<string, string>({
      queryFn(arg: string) {
        return { error: `resultFrom(${arg})` };
      },
    }),
    withInvalidErrorQueryFn: build.query<string, string>({
      // @ts-expect-error
      queryFn(arg: string) {
        return { error: 5 };
      },
    }),
    withThrowingQueryFn: build.query<string, string>({
      queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    withAsyncQueryFn: build.query<string, string>({
      async queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    withInvalidDataAsyncQueryFn: build.query<string, string>({
      // @ts-expect-error
      async queryFn(arg: string) {
        return { data: 5 };
      },
    }),
    withAsyncErrorQueryFn: build.query<string, string>({
      async queryFn(arg: string) {
        return { error: `resultFrom(${arg})` };
      },
    }),
    withInvalidAsyncErrorQueryFn: build.query<string, string>({
      // @ts-expect-error
      async queryFn(arg: string) {
        return { error: 5 };
      },
    }),
    withAsyncThrowingQueryFn: build.query<string, string>({
      async queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    mutationWithQueryFn: build.mutation<string, string>({
      queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    mutationWithInvalidDataQueryFn: build.mutation<string, string>({
      // @ts-expect-error
      queryFn(arg: string) {
        return { data: 5 };
      },
    }),
    mutationWithErrorQueryFn: build.mutation<string, string>({
      queryFn(arg: string) {
        return { error: `resultFrom(${arg})` };
      },
    }),
    mutationWithInvalidErrorQueryFn: build.mutation<string, string>({
      // @ts-expect-error
      queryFn(arg: string) {
        return { error: 5 };
      },
    }),
    mutationWithThrowingQueryFn: build.mutation<string, string>({
      queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    mutationWithAsyncQueryFn: build.mutation<string, string>({
      async queryFn(arg: string) {
        return { data: `resultFrom(${arg})` };
      },
    }),
    mutationWithInvalidAsyncQueryFn: build.mutation<string, string>({
      // @ts-expect-error
      async queryFn(arg: string) {
        return { data: 5 };
      },
    }),
    mutationWithAsyncErrorQueryFn: build.mutation<string, string>({
      async queryFn(arg: string) {
        return { error: `resultFrom(${arg})` };
      },
    }),
    mutationWithInvalidAsyncErrorQueryFn: build.mutation<string, string>({
      // @ts-expect-error
      async queryFn(arg: string) {
        return { error: 5 };
      },
    }),
    mutationWithAsyncThrowingQueryFn: build.mutation<string, string>({
      async queryFn(arg: string) {
        throw new Error(`resultFrom(${arg})`);
      },
    }),
    // @ts-expect-error
    withNeither: build.query<string, string>({}),
    // @ts-expect-error
    mutationWithNeither: build.mutation<string, string>({}),
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
  middleware: (gDM) => gDM({}).concat(api.middleware),
});

test.each([
  ['withQuery', withQuery, 'data'],
  ['withQueryFn', withQueryFn, 'data'],
  ['withErrorQueryFn', withErrorQueryFn, 'error'],
  ['withThrowingQueryFn', withThrowingQueryFn, 'throw'],
  ['withAsyncQueryFn', withAsyncQueryFn, 'data'],
  ['withAsyncErrorQueryFn', withAsyncErrorQueryFn, 'error'],
  ['withAsyncThrowingQueryFn', withAsyncThrowingQueryFn, 'throw'],
])('%s1', async (endpointName, endpoint, expectedResult) => {
  const thunk = endpoint.initiate(endpointName);
  const result = await store.dispatch(thunk);
  if (expectedResult === 'data') {
    expect(result).toEqual(
      expect.objectContaining({
        data: `resultFrom(${endpointName})`,
      })
    );
  } else if (expectedResult === 'error') {
    expect(result).toEqual(
      expect.objectContaining({
        error: `resultFrom(${endpointName})`,
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
  ['mutationWithThrowingQueryFn', mutationWithThrowingQueryFn, 'throw'],
  ['mutationWithAsyncQueryFn', mutationWithAsyncQueryFn, 'data'],
  ['mutationWithAsyncErrorQueryFn', mutationWithAsyncErrorQueryFn, 'error'],
  ['mutationWithAsyncThrowingQueryFn', mutationWithAsyncThrowingQueryFn, 'throw'],
])('%s', async (endpointName, endpoint, expectedResult) => {
  const thunk = endpoint.initiate(endpointName);
  const result = await store.dispatch(thunk);
  if (expectedResult === 'data') {
    expect(result).toEqual(
      expect.objectContaining({
        data: `resultFrom(${endpointName})`,
      })
    );
  } else if (expectedResult === 'error') {
    expect(result).toEqual(
      expect.objectContaining({
        error: `resultFrom(${endpointName})`,
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

import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { setupApiStore } from './helpers';

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://example.com',
  prepareHeaders: (headers, { getState }) => {
    headers.set('fake', 'header');
    return headers;
  },
});

const api = createApi({
  baseQuery,
  endpoints(build) {
    return {
      query: build.query({ query: () => ({ url: '/query', headers: {} }) }),
      mutation: build.mutation({ query: () => ({ url: '/mutation', method: 'POST', credentials: 'omit' }) }),
    };
  },
});

const storeRef = setupApiStore(api);

describe('fetchBaseQuery', () => {
  test('uses the default headers set in prepareHeaders', async () => {
    const spy = jest.spyOn(global, 'fetch');

    await baseQuery('/success', {
      signal: undefined,
      dispatch: storeRef.store.dispatch,
      getState: storeRef.store.getState,
    });

    const [, options] = spy.mock.calls[0];
    if (!options?.headers) {
      throw Error('Missing headers');
    }
    const headersObj: Record<string, string> = {};
    new Headers(options.headers).forEach((value, key) => {
      headersObj[key] = value;
    });
    expect(headersObj).toEqual({
      'content-type': 'application/json',
      fake: 'header',
    });
  });

  test('adds endpoint-level headers to the defaults', async () => {
    const spy = jest.spyOn(global, 'fetch');

    await baseQuery(
      { url: '/success', headers: { authorization: 'Bearer banana' } },
      {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      }
    );
    const [, options] = spy.mock.calls[0];
    if (!options?.headers) {
      throw Error('Missing headers');
    }
    const headersObj: Record<string, string> = {};
    new Headers(options.headers).forEach((value, key) => {
      headersObj[key] = value;
    });

    expect(headersObj).toEqual({
      authorization: 'Bearer banana',
      'content-type': 'application/json',
      fake: 'header',
    });
  });

  test('it does not set application/json when content-type is set', async () => {
    const spy = jest.spyOn(global, 'fetch');

    await baseQuery(
      { url: '/success', headers: { authorization: 'Bearer banana', 'content-type': 'custom-content-type' } },
      {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      }
    );
    const [, options] = spy.mock.calls[0];
    if (!options?.headers) {
      throw Error('Missing headers');
    }
    const headersObj: Record<string, string> = {};
    new Headers(options.headers).forEach((value, key) => {
      headersObj[key] = value;
    });

    expect(headersObj).toEqual({
      authorization: 'Bearer banana',
      'content-type': 'custom-content-type',
      fake: 'header',
    });
  });
});

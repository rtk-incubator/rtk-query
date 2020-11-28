import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { setupApiStore } from './helpers';

const defaultHeaders: Record<string, string> = {
  fake: 'header',
  delete: 'true',
  delete2: '1',
};

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://example.com',
  prepareHeaders: (headers, { getState }) => {
    // A user could customize their behavior here, so we'll just test that custom scenarios would work.
    const potentiallyConflictingKeys = Object.keys(defaultHeaders);
    potentiallyConflictingKeys.forEach((key) => {
      // Check for presence of a default key, if the incoming endpoint headers don't specify it as '', then set it
      const existingValue = headers.get(key);
      if (!existingValue && existingValue !== '') {
        headers.set(key, String(defaultHeaders[key]));
        // If an endpoint sets a header with a value of '', just delete the header.
      } else if (headers.get(key) === '') {
        headers.delete(key);
      }
    });

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

    expect(headersObj).toHaveProperty('content-type', 'application/json');
    expect(headersObj).toHaveProperty('fake', 'header');
    expect(headersObj).toHaveProperty('delete', 'true');
    expect(headersObj).toHaveProperty('delete2', '1');

    spy.mockClear();
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

    expect(headersObj).toHaveProperty('authorization', 'Bearer banana');
    expect(headersObj).toHaveProperty('content-type', 'application/json');
    expect(headersObj).toHaveProperty('fake', defaultHeaders['fake']);
    expect(headersObj).toHaveProperty('delete', defaultHeaders['delete']);
    expect(headersObj).toHaveProperty('delete2', defaultHeaders['delete2']);

    spy.mockClear();
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
      ...defaultHeaders,
    });

    spy.mockClear();
  });

  test('respects the headers from an endpoint over the base headers', async () => {
    const spy = jest.spyOn(global, 'fetch');

    const fake = 'fake endpoint value';

    await baseQuery(
      { url: '/success', headers: { fake, delete: '', delete2: '' } },
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

    expect(headersObj).toHaveProperty('fake', fake);
    expect(headersObj).not.toHaveProperty('delete');
    expect(headersObj).not.toHaveProperty('delete2');

    spy.mockClear();
  });
});

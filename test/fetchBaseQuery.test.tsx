import { createSlice } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';
import { setupApiStore } from './helpers';

const defaultHeaders: Record<string, string> = {
  fake: 'header',
  delete: 'true',
  delete2: '1',
};

let fetchSpy: jest.SpyInstance<any, any>;

beforeAll(() => {
  fetchSpy = jest.spyOn(global, 'fetch');
});

afterEach(() => {
  fetchSpy.mockClear();
});

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://example.com',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;

    // If we have a token set in state, let's assume that we should be passing it.
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
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

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: '',
  },
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
    },
  },
});

const storeRef = setupApiStore(api, { auth: authSlice.reducer });
type RootState = ReturnType<typeof storeRef.store.getState>;

describe('fetchBaseQuery', () => {
  test('uses the default headers set in prepareHeaders', async () => {
    await baseQuery('/success', {
      signal: undefined,
      dispatch: storeRef.store.dispatch,
      getState: storeRef.store.getState,
    });

    const [, options] = fetchSpy.mock.calls[0];

    expect(options!.headers.get('content-type')).toBe('application/json');
    expect(options!.headers.get('fake')).toBe(defaultHeaders['fake']);
    expect(options!.headers.get('delete')).toBe(defaultHeaders['delete']);
    expect(options!.headers.get('delete2')).toBe(defaultHeaders['delete2']);
  });

  test('adds endpoint-level headers to the defaults', async () => {
    await baseQuery(
      { url: '/success', headers: { authorization: 'Bearer banana' } },
      {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      }
    );
    const [, options] = fetchSpy.mock.calls[0];

    expect(options!.headers.get('authorization')).toBe('Bearer banana');
    expect(options!.headers.get('content-type')).toBe('application/json');
    expect(options!.headers.get('fake')).toBe(defaultHeaders['fake']);
    expect(options!.headers.get('delete')).toBe(defaultHeaders['delete']);
    expect(options!.headers.get('delete2')).toBe(defaultHeaders['delete2']);
  });

  test('it does not set application/json when content-type is set', async () => {
    await baseQuery(
      { url: '/success', headers: { authorization: 'Bearer banana', 'content-type': 'custom-content-type' } },
      {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      }
    );
    const [, options] = fetchSpy.mock.calls[0];

    const headersObj: Record<string, string> = {};
    new Headers(options!.headers).forEach((value, key) => {
      headersObj[key] = value;
    });

    expect(options!.headers.get('authorization')).toBe('Bearer banana');
    expect(options!.headers.get('content-type')).toBe('custom-content-type');
    expect(options!.headers.get('fake')).toBe(defaultHeaders['fake']);
    expect(options!.headers.get('delete')).toBe(defaultHeaders['delete']);
    expect(options!.headers.get('delete2')).toBe(defaultHeaders['delete2']);
  });

  test('respects the headers from an endpoint over the base headers', async () => {
    const fake = 'fake endpoint value';

    await baseQuery(
      { url: '/success', headers: { fake, delete: '', delete2: '' } },
      {
        signal: undefined,
        dispatch: storeRef.store.dispatch,
        getState: storeRef.store.getState,
      }
    );
    const [, options] = fetchSpy.mock.calls[0];

    const headersObj: Record<string, string> = {};
    new Headers(options!.headers).forEach((value, key) => {
      headersObj[key] = value;
    });

    expect(options!.headers.get('fake')).toBe(fake);
    expect(options!.headers.get('delete')).toBeNull();
    expect(options!.headers.get('delete2')).toBeNull();
  });

  test('prepareHeaders is able to select from a state', async () => {
    const doRequest = async () =>
      await baseQuery(
        { url: '/success' },
        {
          signal: undefined,
          dispatch: storeRef.store.dispatch,
          getState: storeRef.store.getState,
        }
      );

    doRequest();

    let [, options] = fetchSpy.mock.calls[0];

    expect(options!.headers.get('authorization')).toBeNull();

    // set a token and the follow up request should have the header injected by prepareHeaders
    const token = 'fakeToken!';
    storeRef.store.dispatch(authSlice.actions.setToken(token));
    doRequest();

    [, options] = fetchSpy.mock.calls[1];
    if (!options?.headers) {
      throw Error('Missing headers');
    }

    expect(options.headers.get('authorization')).toBe(`Bearer ${token}`);
  });
});

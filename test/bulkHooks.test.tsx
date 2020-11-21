import * as React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '@rtk-incubator/rtk-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitMs, withProvider } from './helpers';

describe('hooks tests', () => {
  // TODO: replace with store helper
  const api = createApi({
    baseQuery: () => waitMs(),
    endpoints: (build) => ({
      getUser: build.query<any, number>({
        query: (obj) => obj,
      }),
    }),
  });
  const store = configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gDM) => gDM().concat(api.middleware),
  });

  test('useQuery hook sets isFetching=true whenever a request is in flight', async () => {
    function User() {
      const [value, setValue] = React.useState(0);

      const { isFetching } = api.hooks.getUser.useQuery(1, { skip: value < 1 });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: withProvider(store) });

    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    // Being that nothing has changed in the args, this should never fire.
    expect(getByTestId('isFetching').textContent).toBe('false');
  });

  test('useQuery hook sets isLoading=true only on initial request', async () => {
    let refetchMe: () => void = () => {};
    function User() {
      const [value, setValue] = React.useState(0);

      const { isLoading, refetch } = api.hooks.getUser.useQuery(2, { skip: value < 1 });
      refetchMe = refetch;
      return (
        <div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: withProvider(store) });

    // Being that we skipped the initial request on mount, this should be false
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    // Condition is met, should load
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false')); // Make sure the original loading has completed.
    fireEvent.click(getByText('Increment value'));
    // Being that we already have data, isLoading should be false
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    // We call a refetch, should set to true
    act(() => refetchMe());
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
  });

  test('useQuery hook sets isLoading and isFetching to the correct states', async () => {
    let refetchMe: () => void = () => {};
    function User() {
      const [value, setValue] = React.useState(0);

      const { isLoading, isFetching, refetch } = api.hooks.getUser.useQuery(22, { skip: value < 1 });
      refetchMe = refetch;
      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
        </div>
      );
    }

    const { getByText, getByTestId } = render(<User />, { wrapper: withProvider(store) });

    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    fireEvent.click(getByText('Increment value'));
    // Condition is met, should load
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('true');
      expect(getByTestId('isFetching').textContent).toBe('true');
    });
    // Make sure the request is done for sure.
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    fireEvent.click(getByText('Increment value'));
    // Being that we already have data, isLoading should be false
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    // Make sure the request is done for sure.
    await waitFor(() => {
      expect(getByTestId('isLoading').textContent).toBe('false');
      expect(getByTestId('isFetching').textContent).toBe('false');
    });
    // We call a refetch, should set bothto true
    act(() => refetchMe());
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
  });

  test('usePrefetch respects `force` arg', async () => {
    const { usePrefetch } = api;
    function User() {
      const prefetchUser = usePrefetch('getUser', { force: true });

      return (
        <div>
          <button onMouseEnter={() => prefetchUser(4, { ifOlderThan: 35 })} data-testid="lowPriority">
            Low priority user action intent
          </button>
          <button onMouseEnter={() => prefetchUser(4, { force: true })} data-testid="highPriority">
            High priority action intent - Prefetch User 2
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: withProvider(store) });

    userEvent.hover(getByTestId('highPriority'));

    expect(api.selectors.getUser(4)(store.getState())).toEqual({
      endpoint: 'getUser',
      internalQueryArgs: 4,
      isError: false,
      isLoading: true,
      isSuccess: false,
      isUninitialized: false,
      originalArgs: 4,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: 'pending',
    });

    await waitMs();

    expect(api.selectors.getUser(4)(store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: 4,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: 4,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: 'fulfilled',
    });
  });

  test('usePrefetch does not make an additional request if already in the cache and force=false', async () => {
    const { usePrefetch } = api;
    function User() {
      // Load the initial query
      api.hooks.getUser.useQuery(2);
      const prefetchUser = usePrefetch('getUser', { force: false });

      return (
        <div>
          <button onMouseEnter={() => prefetchUser(2)} data-testid="lowPriority">
            Low priority user action intent
          </button>
        </div>
      );
    }

    const { getByTestId } = render(<User />, { wrapper: withProvider(store) });

    // Try to prefetch what we just loaded
    userEvent.hover(getByTestId('lowPriority'));

    expect(api.selectors.getUser(4)(store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: 4,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: 4,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: 'fulfilled',
    });

    await waitMs();

    expect(api.selectors.getUser(4)(store.getState())).toEqual({
      data: undefined,
      endpoint: 'getUser',
      fulfilledTimeStamp: expect.any(Number),
      internalQueryArgs: 4,
      isError: false,
      isLoading: false,
      isSuccess: true,
      isUninitialized: false,
      originalArgs: 4,
      requestId: expect.any(String),
      startedTimeStamp: expect.any(Number),
      status: 'fulfilled',
    });
  });
});

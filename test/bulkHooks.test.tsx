import * as React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { createApi } from '../src';
import { fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitMs, withProvider } from './helpers';

describe('loading and fetching boolean calculations', () => {
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

  const { usePrefetch } = api;

  test('useQuery hook sets isLoading and isFetching flags', async () => {
    function User() {
      const [value, setValue] = React.useState(0);

      const { isLoading, isFetching } = api.hooks.getUser.useQuery(1, { skip: value < 1 });

      // if older than > a number of ms
      // user intent can supercede the default config
      // ifOlderThan = number|false (default: false) - if false, we don't fetch if it is already in the cache
      // by default, it prefetches nothing if it exists in the cache?
      // if another component is already mounted with a query with this,

      // if you specify force: true, it will override `ifOlderThan`
      const prefetchUser = usePrefetch('getUser', { force: false, ifOlderThan: false });

      return (
        <div>
          <div data-testid="isFetching">{String(isFetching)}</div>
          <div data-testid="isLoading">{String(isLoading)}</div>
          <button onClick={() => setValue((val) => val + 1)}>Increment value</button>
          {/* force defaults to false */}
          <button onMouseEnter={() => prefetchUser(2, { ifOlderThan: 35 })}>Low priority user action intent</button>
          <button onMouseEnter={() => prefetchUser(2, { force: true })} data-testid="hover">
            High priority action intent - Prefetch User 2
          </button>
        </div>
      );
    }

    // The intention of prefetch is to make data 'fresh' before the user navigates to the new content
    /**
     * Prefetch in these scenarios:
     * 1. Hovering over a navigation element
     * 2. Hovering over a list element that is a link
     * 3. During pagination
     * 4. Could possibly handled automatically due to presence, after the page has rendered -
     *
     * Scenario:
     * We prefetch something that changes rapidly
     * When the user mounts the next component with the intent of having fresh data, it could be stale
     * We would need a `refetchOnMount` for this to be fully fleshed out
     *
     */

    const { getByText, getByTestId, debug } = render(<User />, { wrapper: withProvider(store) });

    debug();

    userEvent.hover(getByTestId('hover'));

    // Being that we skipped the initial request on mount, both values should be false
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    fireEvent.click(getByText('Increment value'));
    // Condition is met, both should be loading
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    fireEvent.click(getByText('Increment value'));
    // Being that we already have data, isLoading should be false
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('true'));
    await waitFor(() => expect(getByTestId('isLoading').textContent).toBe('false'));
    await waitFor(() => expect(getByTestId('isFetching').textContent).toBe('false'));
  });
});

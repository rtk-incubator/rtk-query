import { AnyAction } from '@reduxjs/toolkit';
import { createApi } from '@rtk-incubator/rtk-query';
import { renderHook, act } from '@testing-library/react-hooks';
import { setupApiStore, waitMs } from './helpers';
import { Patch } from 'immer';

interface Post {
  id: string;
  title: string;
  contents: string;
}

const baseQuery = jest.fn();
beforeEach(() => baseQuery.mockReset());

const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    post: build.query<Post, string>({ query: (id) => `post/${id}` }),
    updatePost: build.mutation<void, Post, { undoPost: Patch[] }>({
      query: ({ id, ...patch }) => ({ url: `post/${id}`, method: 'PATCH', body: patch }),
      onStart({ id, ...patch }, { dispatch, context }) {
        context.undoPost = dispatch(
          api.util.updateQueryResult('post', id, (draft) => {
            Object.assign(draft, patch);
          })
        ).inversePatches;
      },
      onError({ id }, { dispatch, context }) {
        dispatch(api.util.patchQueryResult('post', id, context.undoPost));
      },
    }),
  }),
});

const storeRef = setupApiStore(api, {
  actions(state: AnyAction[] = [], action: AnyAction) {
    return [...state, action];
  },
});

describe('basic lifecycle', () => {
  let onStart = jest.fn(),
    onError = jest.fn(),
    onSuccess = jest.fn();

  const extendedApi = api.injectEndpoints({
    endpoints: (build) => ({
      test: build.mutation({
        query: (x) => x,
        onStart,
        onError,
        onSuccess,
      }),
    }),
    overrideExisting: true,
  });

  beforeEach(() => {
    onStart.mockReset();
    onError.mockReset();
    onSuccess.mockReset();
  });

  test('success', async () => {
    const { result } = renderHook(() => extendedApi.hooks.useTestMutation(), {
      wrapper: storeRef.wrapper,
    });

    baseQuery.mockResolvedValue('success');

    expect(onStart).not.toHaveBeenCalled();
    expect(baseQuery).not.toHaveBeenCalled();
    act(() => void result.current[0]('arg'));
    expect(onStart).toHaveBeenCalledWith('arg', expect.any(Object));
    expect(baseQuery).toHaveBeenCalledWith('arg', expect.any(Object));

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    await act(() => waitMs(5));
    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith('arg', expect.any(Object), 'success');
  });

  test('error', async () => {
    const { result } = renderHook(() => extendedApi.hooks.useTestMutation(), {
      wrapper: storeRef.wrapper,
    });

    baseQuery.mockRejectedValue('error');

    expect(onStart).not.toHaveBeenCalled();
    expect(baseQuery).not.toHaveBeenCalled();
    act(() => void result.current[0]('arg'));
    expect(onStart).toHaveBeenCalledWith('arg', expect.any(Object));
    expect(baseQuery).toHaveBeenCalledWith('arg', expect.any(Object));

    expect(onError).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    await act(() => waitMs(5));
    expect(onError).toHaveBeenCalledWith('arg', expect.any(Object), 'error');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

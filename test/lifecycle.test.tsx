import { createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

type UnsubscribeFn = () => void;
declare const ws: { listen(cb: (received: Post[]) => void): () => UnsubscribeFn };
interface Post {
  id: number;
  title: string;
}
type Posts = Post[];
interface Filter {}

// example usage: multiple lifecycle events with context
const api1 = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: (build) => ({
    getPosts: build.query<Posts, Filter>({
      query: (arg) => ({ url: `posts` }),
      cacheEntryAdded1(arg, { dispatch }, ctx) {
        ctx.stopListening = ws.listen((received: Post[]) => {
          dispatch(
            api1.util.updateQueryResult('getPosts', arg, (draft) => {
              draft.push(...received);
            })
          );
        });
      },
      cacheEntryCleared1(arg, { dispatch }, ctx) {
        ctx.stopListening();
      },
    }),
  }),
});

// example usage: callback-based
const api2 = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: (build) => ({
    getPosts: build.query<Posts, Filter>({
      query: (arg) => ({ url: `posts` }),
      cacheEntryAdded2(arg, { dispatch }) {
        const stopListening = ws.listen((received: Post[]) => {
          dispatch(
            api2.util.updateQueryResult('getPosts', arg, (draft) => {
              draft.push(...received);
            })
          );
        });
        return stopListening;
      },
    }),
  }),
});

// example usage: promise-based
const api3 = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: (build) => ({
    getPosts: build.query<Posts, Filter>({
      query: (arg) => ({ url: `posts` }),
      async cacheEntryAdded(arg, { dispatch }, { cleanup }) {
        const stopListening = ws.listen((received: Post[]) => {
          dispatch(
            api3.util.updateQueryResult('getPosts', arg, (draft) => {
              draft.push(...received);
            })
          );
        });
        await cleanup;
        stopListening();
      },
    }),
  }),
});

// example usage: add additional firstValueResolved promise
const api3Extended = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: (build) => ({
    getPosts: build.query<Posts, Filter>({
      query: (arg) => ({ url: `posts` }),
      async cacheEntryAdded(arg, { dispatch }, { firstValueResolved, cleanup }) {
        try {
          await firstValueResolved;

          const stopListening = ws.listen((received: Post[]) => {
            dispatch(
              api3Extended.util.updateQueryResult('getPosts', arg, (draft) => {
                draft.push(...received);
              })
            );
          });
          await cleanup;
          stopListening();
        } catch {}
      },
    }),
  }),
});

// example usage: use entityAdapter for shape
const postsAdapter = createEntityAdapter<Post>();
const apiWithEntityAdapter = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com' }),
  endpoints: (build) => ({
    getPosts: build.query<EntityState<Post>, Filter>({
      query: (arg) => ({ url: `posts` }),
      transformResponse(response: Post[]) {
        return postsAdapter.addMany(postsAdapter.getInitialState(), response);
      },
      cacheEntryAdded2(arg, { dispatch }) {
        const stopListening = ws.listen((received: Post[]) => {
          dispatch(
            apiWithEntityAdapter.util.updateQueryResult('getPosts', arg, (draft) => {
              postsAdapter.upsertMany(draft, received);
            })
          );
        });
        return stopListening;
      },
    }),
  }),
});

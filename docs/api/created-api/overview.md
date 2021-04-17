---
id: overview
title: Overview
sidebar_label: Overview
hide_title: true
---

# Generated API Structures

When you call [`createApi`](../createApi.md), it automatically generates and returns a structure containing Redux logic you can use to interact with the endpoints you defined. This structure includes a reducer to manage cached data, a middleware to manage cache lifetimes and subscriptions, and selectors and thunks for each endpoint. If you imported `createApi` from the React-specific entry point, it also includes auto-generated React hooks for use in your components.

This section documents the contents of that API structure.

- [`reducerPath`](./redux-integration#reducerpath)
- [`reducer`](./redux-integration#reducer)
- [`middleware`](./redux-integration#middleware)
- [`endpoints`](./endpoints/overview)
  - **[endpointName]**
    - [`initiate`](./endpoints/initiate)
    - [`select`](./endpoints/select)
    - [`react hooks`](#hooks)
- [`internalActions`](#internalactions)
- [`util`](#util)
- [`injectEndpoints`](#injectendpoints)
- [`enhanceEndpoints`](#enhanceendpoints)
- [`usePrefetch`](../concepts/prefetching#prefetching-with-react-hooks)
- [`Auto-generated hooks`](#auto-generated-hooks)

```ts title="All returned properties"
const api = createApi({
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...
  }),
});

export const {
  reducerPath,
  reducer,
  middleware,
  endpoints,
  internalActions,
  util,
  injectEndpoints,
  usePrefetch,
  ...generatedHooks
} = api;
```

## Hooks

Hooks are specifically for React Hooks users. Under each `api.endpoint.[endpointName]`, you will have `useQuery` or `useMutation` depending on the type. For example, if you had `getPosts` and `updatePost`, these options would be available:

```ts title="Hooks usage"
const { data } = api.endpoints.getPosts.useQuery();
const { data } = api.endpoints.updatePost.useMutation();

const { data } = api.useGetPostsQuery();
const [updatePost] = api.useUpdatePostMutation();
```

---
id: overview
title: Overview
sidebar_label: Overview
hide_title: true
---

# Generated API Slices

## API Slice Overview

When you call [`createApi`](../createApi.md), it automatically generates and returns an API service "slice" object structure containing Redux logic you can use to interact with the endpoints you defined. This slice object includes a reducer to manage cached data, a middleware to manage cache lifetimes and subscriptions, and selectors and thunks for each endpoint. If you imported `createApi` from the React-specific entry point, it also includes auto-generated React hooks for use in your components.

This section documents the contents of that API structure, with the individual field descriptions grouped by purpose.

:::tip

Typically, you should only have one API slice per base URL that your application needs to communicate with. For example, if your site fetches data from both `/api/posts` and `/api/users`, you would have a single API slice with `/api/` as the base URL, and separate endpoint definitions for `posts` and `users`.

:::

```ts title="API Slice Contents"
const api = createApi({
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...
  }),
});

type Api = {
  reducerPath: string;
  reducer: Reducer;
  middleware: Middleware;
  endpoints: Record<string, EndpointDefinition>;
  injectEndpoints: (options: InjectEndpointsOptions) => UpdatedApi;
  enhanceEndpoints: (options: EnhanceEndpointsOptions) => UpdatedApi;
  utils: {
    updateQueryResult: UpdateQueryResultThunk;
    patchQueryResult: PatchQueryResultThunk;
    prefetch: PrefetchThunk;
  };
  internalActions: InternalActions;
  [key in GeneratedReactHooks]: GeneratedReactHooks[key];
};
```

## Redux Integration

Internally, `createApi` will call [the Redux Toolkit `createSlice` API](https://redux-toolkit.js.org/api/createSlice) to generate a slice reducer and corresponding action creators with the appropriate logic for caching fetched data. It also automatically generates a custom Redux middleware that manages subscription counts and cache lifetimes.

The generated slice reducer and the middleware both need to be adding to your Redux store setup in `configureStore` in order to work correctly.

```ts title="src/store.ts"
import { configureStore, setupListeners } from '@reduxjs/toolkit';
import { pokemonApi } from './services/pokemon';

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [pokemonApi.reducerPath]: pokemonApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(pokemonApi.middleware),
});
```

### `reducerPath`

A string containing the `reducerPath` option provided to `createApi`. Use this as the root state key when adding the `reducer` function to the store so that the rest of the generated API logic can find the state correctly.

### `reducer`

A standard Redux slice reducer function containing the logic for updating the cached data. Add this to the Redux store using the `reducerPath` you provided as the root state key.

### `middleware`

A custom Redux middleware that contains logic for managing caching, invalidation, subscriptions, polling, and more. Add this to the store setup after other middleware.

## Endpoints

The API slice object will have an `endpoints` field inside. This section maps the endpoint names you provided to `createApi` to the core Redux logic (thunks and selectors) used to trigger data fetches and read cached data for that endpoint. If you're using the React-specific version of `createApi`, each endpoint definition will also contain the auto-generated React hooks for that endpoint.

Each endpoint structure contains the following fields:

### `initiate`

A Redux thunk action creator that you can dispatch to trigger data fetch queries or mutations.

React Hooks users will most likely never need to use these directly, as the hooks automatically dispatch these actions as needed.

:::note Usage of actions outside of React Hooks
When dispatching an action creator, you're responsible for storing a reference to the promise it returns in the event that you want to update that specific subscription. Also, you have to manually unsubscribe once your component unmounts. To get an idea of what that entails, see the [Svelte Example](../../../examples/svelte) or the [React Class Components Example](../../../examples/react-class-components)
:::

### Matchers

A set of utilities that match the `pending`, `fulfilled`, and `rejected` actions that will be dispatched by this thunk. These allow you to match on Redux actions for that endpoint, such as in `createSlice.extraReducers` or a custom middleware. Those are implemented as follows:

```ts
 matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpoint)),
 matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpoint)),
 matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpoint)),
```

### `select`

A function that accepts a cache key argument, and generates a new memoized selector for reading cached data for this endpoint using the given cache key. The generated selector is memoized using [Reselect's `createSelector`](https://redux-toolkit.js.org/api/createSelector).

React Hooks users will most likely never need to use these directly, as the hooks automatically use these selectors as needed.

:::caution

Each call to `.select(someCacheKey)` returns a _new_ selector function instance. In order for memoization to work correctly, you should create a given selector function once per cache key and reuse that selector function instance, rather than creating a new selector instance each time.

:::

## Code Splitting and Generation

Each API slice allows [additional endpoint definitions to be injected at runtime](../../concepts/code-splitting.md) after the initial API slice has been defined. This can be beneficial for apps that may have _many_ endpoints.

The individual API slice endpoint definitions can also be split across multiple files. This is primarily useful for working with API slices that were [code-generated from an API schema file](../../concepts/code-generation.md), allowing you to add additional custom behavior and configuration to a set of automatically-generated endpoint definitions.

Each API slice object has `injectEndpoints` and `enhanceEndpoints` functions to support these use cases.

### `injectEndpoints`

#### Signature

```ts
interface InjectedEndpointOptions {
    endpoints: (build: EndpointBuilder) => NewEndpointDefinitions;
    overrideExisting?: boolean;
}

const injectEndpoints = (endpointOptions: InjectedEndpointOptions) => void;
```

#### Description

Accepts an options object containing the same `endpoints` builder callback you would pass to [`createApi.endpoints`](../createApi.md#endpoints). Any endpoint definitions defined using that builder will be merged into the existing endpoint definitions for this API slice using a shallow merge, so any new endpoint definitions will override existing endpoints with the same name.

The `overrideExisting` flag controls a development-only warning that notifies you if there is a name clash between endpoint definitions. When set to `true`, the warning will not be printed.

This method is primarily useful for code splitting and hot reloading.

### `enhanceEndpoints`

#### Signature

```ts
interface EnhanceEndpointsOptions {
  addEntityTypes?: readonly string[];
  endpoints?: Record<string, Partial<EndpointDefinition>>;
}

const enhanceEndpoints = (endpointOptions: EnhanceEndpointsOptions) => EnhancedApiSlice;
```

#### Description

Any provided entity types or endpoint definitions will be merged into the existing endpoint definitions for this API slice. Unlike `injectEndpoints`, the partial endpoint definitions will not _replace_ existing definitions, but are rather merged together on a per-definition basis (ie, `Object.assign(existingEndpoint, newPartialEndpoint)`).

This is primarily useful for taking an API slice object that was code-generated from an API schema file like OpenAPI, and adding additional specific hand-written configuration for cache invalidation management on top of the generated endpoint definitions.

## Cache Management Utilities

The API slice object includes cache management utilities that are used for implementing [optimistic updates](../../concepts/optimistic-updates.md). These are included in a `util` field inside the slice object.

### `updateQueryResult`

#### Signature

```ts
const updateQueryResult = (
  endpointName: string,
  args: any,
  updateRecipe: (draft: Draft<CachedState>) => void
) => ThunkAction<PatchCollection, PartialState, any, AnyAction>;
```

#### Description

A Redux thunk that creates and applies a set of JSON diff/patch objects to the current state. This immediately updates the Redux state with those changes.

The thunk accepts three arguments: the name of the query we are updating (such as `'getPost'`), any relevant query arguments, and a callback function. The callback receives an Immer-wrapped `draft` of the current state, and may modify the draft to match the expected results after the mutation completes successfully.

The thunk returns an object containing `{patches: Patch[], inversePatches: Patch[]}`, generated using Immer's [`produceWithPatches` method](https://immerjs.github.io/immer/patches).

This is typically used as the first step in implementing optimistic updates. The generated `inversePatches` can be passed between the `onStart` and `onError` callbacks in a mutation definition by assigning the `inversePatches` array to the provided `context` object, and then the updates can be reverted by calling `patchQueryResult(endpointName, args, inversePatches)`.

### `patchQueryResult`

#### Signature

```ts
const patchQueryResult = (
  endpointName: string,
  args: any
  patches: Patch[]
) => ThunkAction<void, PartialState, any, AnyAction>;
```

####

A Redux thunk that applies a JSON diff/patch array to the cached data for a given query result. This immediately updates the Redux state with those changes.

The thunk accepts three arguments: the name of the query we are updating (such as `'getPost'`), any relevant query arguments, and a JSON diff/patch array as produced by Immer's `produceWithPatches`.

This is typically used as the second step in implementing optimistic updates. If a request fails, the optimistically-applied changes can be reverted by dispatching `patchQueryResult` with the `inversePatches` that were generated by `updateQueryResult` earlier.

### `prefetch`

#### Signature

```ts
type PrefetchOptions = { ifOlderThan?: false | number } | { force?: boolean };

const prefetch = (
  endpointName: string,
  arg: any,
  options: PrefetchOptions
) => ThunkAction<void, any, any, AnyAction>;
```

#### Description

A Redux thunk that can be used to manually trigger pre-fetching of data.

The thunk accepts three arguments: the name of the query we are updating (such as `'getPost'`), any relevant query arguments, and a set of options used to determine if the data actually should be re-fetched based on cache staleness.

React Hooks users will most likely never need to use this directly, as the `usePrefetch` hook will dispatch this thunk internally as needed when you call the prefetching function supplied by the hook.

## Internal Actions

The `internalActions` field contains a set of additional thunks that are used for internal behavior, such as managing updates based on focus.

- [`internalActions`](#internalactions)
- [`util`](#util)
- [`usePrefetch`](../../concepts/prefetching#prefetching-with-react-hooks)
- [`Auto-generated hooks`](#auto-generated-hooks)

## React Hooks

The core RTK Query `createApi` method is UI-agnostic, in the same way that the Redux core library and Redux Toolkit are UI-agnostic. They are all plain JS logic that can be used anywhere.

However, RTK Query also provides the ability to auto-generate React hooks for each of your endpoints. Since this specifically depends on React itself, RTK Query provides an alternate entry point that exposes a customized version of `createApi` that includes that functionality:

```js
import { createApi } from '@rtk-incubator/rtk-query/react';
```

If you have used the React-specific version of `createApi`, the generated `Api` slice structure will also contain a set of React hooks. These endpoint hooks are available as `api.endpoints[endpointName].useQuery` or `api.endpoints[endpointName].useMutation`, matching how you defined that endpoint.

The same hooks are also added to the `Api` object itself, and given auto-generated names based on the endpoint name and query/mutation type.

For example, if you had endpoints for `getPosts` and `updatePost`, these options would be available:

```ts title="Generated React Hook names"
// Hooks attached to the endpoint definition
const { data } = api.endpoints.getPosts.useQuery();
const { data } = api.endpoints.updatePost.useMutation();

// Same hooks, but given unique names and attached to the API slice object
const { data } = api.useGetPostsQuery();
const [updatePost] = api.useUpdatePostMutation();
```

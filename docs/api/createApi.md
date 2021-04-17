---
id: createApi
title: createApi
sidebar_label: createApi
hide_title: true
---

# `createApi`

The main point where you will define a service to use in your application.

## Parameters

`createApi` accepts a single configuration object parameter with the following options:

```ts no-transpile
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  endpoints(build: EndpointBuilder<InternalQueryArgs, EntityTypes>): Definitions;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<InternalQueryArgs>;
  keepUnusedDataFor?: number; // value is in seconds
  refetchOnMountOrArgChange?: boolean | number; // value is in seconds
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
```

### `baseQuery`

[summary](docblock://createApi.ts?token=CreateApiOptions.baseQuery)

[examples](docblock://createApi.ts?token=CreateApiOptions.baseQuery)

### `entityTypes`

[summary](docblock://createApi.ts?token=CreateApiOptions.entityTypes)

### `reducerPath`

[summary](docblock://createApi.ts?token=CreateApiOptions.reducerPath)

[examples](docblock://createApi.ts?token=CreateApiOptions.reducerPath)

### `serializeQueryArgs`

[summary](docblock://createApi.ts?token=CreateApiOptions.serializeQueryArgs)

Defaults to:

```ts no-compile
export const defaultSerializeQueryArgs: SerializeQueryArgs<any> = ({ endpoint, queryArgs }) => {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than useQuery({ b: 2, a: 1 })
  return `${endpoint}(${JSON.stringify(queryArgs, Object.keys(queryArgs || {}).sort())})`;
};
```

### `endpoints`

[summary](docblock://createApi.ts?token=CreateApiOptions.endpoints)

#### Anatomy of an endpoint

- `query` _(required)_
  - [summary](docblock://endpointDefinitions.ts?token=EndpointDefinitionWithQuery.query)
- `transformResponse` _(optional)_

  - [summary](docblock://endpointDefinitions.ts?token=EndpointDefinitionWithQuery.transformResponse)
  - ```js title="Unpack a deeply nested collection"
    transformResponse: (response) => response.some.nested.collection;
    ```
  - ```js title="Normalize the response data"
    transformResponse: (response) =>
      response.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {});
    ```

- `provides` _(optional)_

  [summary](docblock://endpointDefinitions.ts?token=QueryExtraOptions.provides)

- `invalidates` _(optional)_

  [summary](docblock://endpointDefinitions.ts?token=MutationExtraOptions.invalidates)

- `onStart`, `onError` and `onSuccess` _(optional)_ - Available to both [queries](../concepts/queries) and [mutations](../concepts/mutations)
  - Can be used in `mutations` for [optimistic updates](../concepts/optimistic-updates).
  - ```ts title="Mutation lifecycle signatures"
    function onStart(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>): void;
    function onError(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, error: unknown): void;
    function onSuccess(arg: QueryArg, mutationApi: MutationApi<ReducerPath, Context>, result: ResultType): void;
    ```
  - ```ts title="Query lifecycle signatures"
    function onStart(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>): void;
    function onError(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>, error: unknown): void;
    function onSuccess(arg: QueryArg, queryApi: QueryApi<ReducerPath, Context>, result: ResultType): void;
    ```

#### How endpoints get used

When defining a key like `getPosts` as shown below, it's important to know that this name will become exportable from `api` and be able to referenced under `api.endpoints.getPosts.useQuery()`, `api.endpoints.getPosts.initiate()` and `api.endpoints.getPosts.select()`. The same thing applies to `mutation`s but they reference `useMutation` instead of `useQuery`.

```ts
const api = createApi({
  baseQuery: fetchBaseQuery('/'),
  endpoints: (build) => ({
    getPosts: build.query<PostsResponse, void>({
      query: () => 'posts',
      provides: (result) => result ? result.map(({ id }) => ({ type: 'Posts', id })) : [],
    }),
    addPost: build.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
      invalidates: ['Posts'],
    }),
  }),
});

// Auto-generated hooks
export { useGetPostsQuery, useAddPostMutation } = api;

// Possible exports
export const { endpoints, reducerPath, reducer, middleware } = api;
// reducerPath, reducer, middleware are only used in store configuration
// endpoints will have:
// endpoints.getPosts.initiate(), endpoints.getPosts.select(), endpoints.getPosts.useQuery()
// endpoints.addPost.initiate(), endpoints.addPost.select(), endpoints.addPost.useMutation()
// see `createApi` overview for _all exports_
```

#### Transforming the data returned by an endpoint before caching

In some cases, you may want to manipulate the data returned from a query before you put it in the cache. In this instance, you can take advantage of `transformResponse`.

By default, the payload from the server is returned directly.

```ts
function defaultTransformResponse(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue;
}
```

To change it, provide a function that looks like:

```ts
transformResponse: (response) => response.some.deeply.nested.property;
```

```ts title="GraphQL transformation example"
export const api = createApi({
  baseQuery: graphqlBaseQuery({
    baseUrl: '/graphql',
  }),
  endpoints: (builder) => ({
    getPosts: builder.query({
      query: () => ({
        body: gql`
          query {
            posts {
              data {
                id
                title
              }
            }
          }
        `,
      }),
      transformResponse: (response) => response.posts.data,
    }),
  }),
});
```

### `keepUnusedDataFor`

[summary](docblock://createApi.ts?token=CreateApiOptions.keepUnusedDataFor)

### `refetchOnMountOrArgChange`

[summary](docblock://createApi.ts?token=CreateApiOptions.refetchOnMountOrArgChange)

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnMountOrArgChange` to each individual hook call or when dispatching the [`initiate`](#initiate) action.
:::

### `refetchOnFocus`

[summary](docblock://createApi.ts?token=CreateApiOptions.refetchOnFocus)

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnFocus` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

### `refetchOnReconnect`

[summary](docblock://createApi.ts?token=CreateApiOptions.refetchOnReconnect)

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnReconnect` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

## Return value

- [`reducerPath`](#reducerpath)
- [`reducer`](#reducer)
- [`middleware`](#middleware)
- [`endpoints`](#endpoints-returned-by-createapi)
  - **[endpointName]**
    - [`initiate`](#initiate)
    - [`select`](#select)
    - [`useQuery or useMutation`](#hooks)
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
  enhanceEndpoints,
  usePrefetch,
  ...generatedHooks
} = api;
```

#### middleware

This is a standard redux middleware and is responsible for things like [polling](../concepts/polling), [garbage collection](#keepunuseddatafor) and a handful of other things. Make sure it's [included in your store](../introduction/getting-started#add-the-service-to-your-store).

#### reducer

A standard redux reducer that enables core functionality. Make sure it's [included in your store](../introduction/getting-started#add-the-service-to-your-store).

### `endpoints` returned by `createApi`

#### initiate

React Hooks users will most likely never need to use these in most cases. These are redux action creators that you can `dispatch` with `useDispatch` or `store.dispatch()`.

:::note Usage of actions outside of React Hooks
When dispatching an action creator, you're responsible for storing a reference to the promise it returns in the event that you want to update that specific subscription. Also, you have to manually unsubscribe once your component unmounts. To get an idea of what that entails, see the [Svelte Example](../examples/svelte) or the [React Class Components Example](../examples/react-class-components)
:::

#### select

`select` is how you access your `query` or `mutation` data from the cache. If you're using Hooks, you don't have to worry about this in most cases. There are several ways to use them:

```js title="React Hooks"
const { data, status } = useSelector(api.getPosts.select());
```

```js title="Using connect from react-redux"
const mapStateToProps = (state) => ({
  data: api.getPosts.select()(state),
});
connect(null, mapStateToProps);
```

```js title="Svelte"
$: ({ data, status } = api.getPosts.select()($store));
```

#### hooks

Hooks are specifically for React Hooks users. Under each `api.endpoint.[endpointName]`, you will have `useQuery` or `useMutation` depending on the type. For example, if you had `getPosts` and `updatePost`, these options would be available:

```ts title="Hooks usage"
const { data } = api.endpoints.getPosts.useQuery();
const { data } = api.endpoints.updatePost.useMutation();

const { data } = api.useGetPostsQuery();
const [updatePost] = api.useUpdatePostMutation();
```

#### action matchers

These are action matchers for each endpoint to allow you matching on redux actions for that endpoint - for example in slice `extraReducers` or a custom middleware. Those are implemented as follows:

```ts
 matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpoint)),
 matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpoint)),
 matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpoint)),
```

### Auto-generated Hooks

React users are able to take advantage of auto-generated hooks. By default, `createApi` will automatically generate type-safe hooks (TS 4.1+ only) for you based on the name of your endpoints. The general format is `use(Endpointname)(Query|Mutation)` - `use` is prefixed, the first letter of your endpoint name is capitalized, then `Query` or `Mutation` is appended depending on the type.

```js title="Auto-generated hooks example"
const api = createApi({
  baseQuery,
  endpoints: (build) => ({
    getPosts: build.query({
      query: () => 'posts',
    }),
    addPost: build.mutation({
      query: (body) => ({
        url: `posts`,
        method: 'POST',
        body,
      }),
    }),
  }),
});

// Automatically generated from the endpoint names
export { useGetPostsQuery, useAddPostMutation } = api;
```

### `internalActions`

:::danger
These may change at any given time and are not part of the public API for now
:::

- `updateSubscriptionOptions: ActionCreatorWithPayload<{ endpoint: string; requestId: string; options: SubscriptionOptions; queryCacheKey: QueryCacheKey }, string>;`
- `queryResultPatched: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey, patches: Patch[]; }, string>`
- `removeQueryResult: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey }, string>`
- `unsubscribeQueryResult: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey, requestId: string }, string>`,
- `unsubscribeMutationResult: ActionCreatorWithPayload<MutationSubstateIdentifier, string>`,

### `util`

- **prefetchThunk** - used for [prefetching](../concepts/prefetching).
- **patchQueryResult** - used for [optimistic updates](../concepts/optimistic-updates).
- **updateQueryResult** - used for [optimistic updates](../concepts/optimistic-updates).

### `injectEndpoints`

See [Code Splitting](../concepts/code-splitting)

### `enhanceEndpoints`

See [Code Generation](../concepts/code-generation)

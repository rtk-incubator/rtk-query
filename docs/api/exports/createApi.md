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

```ts title="Simulating axios-like interceptors with a custom base query"
const baseQuery = fetchBaseQuery({ baseUrl: '/' });

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === '401') {
    // try to get a new token
    const refreshResult = await baseQuery('/refreshToken', api, extraOptions);
    if (refreshResult.data) {
      // store the new token
      api.dispatch(setToken(refreshResult.data));
      // retry the initial query
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(loggedOut());
    }
  }
  return result;
};
```

### `entityTypes`

[summary](docblock://createApi.ts?token=CreateApiOptions.entityTypes)

### `reducerPath`

[summary](docblock://createApi.ts?token=CreateApiOptions.reducerPath)

```js title="apis.js"
import { createApi, fetchBaseQuery } from '@rtk-incubator/rtk-query';

const apiOne = createApi({
  reducerPath: 'apiOne',
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...endpoints
  }),
});

const apiTwo = createApi({
  reducerPath: 'apiTwo',
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...endpoints
  }),
});
```

### `serializeQueryArgs`

[summary](docblock://createApi.ts?token=CreateApiOptions.reducerPath)
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
      provides: (result) => result.map(({ id }) => ({ type: 'Posts', id })),
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

Defaults to `60` _(this value is in seconds)_. This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.

### `refetchOnMountOrArgChange`

Defaults to `false`. This setting allows you to control whether RTK Query will only serve a cached result, or if it should `refetch` when set to `true` or if an adequate amount of time has passed since the last successful query result.

- `false` - Will not cause a query to be performed _unless_ it does not exist yet.
- `true` - Will always refetch when a new subscriber to a query is added. Behaves the same as calling the `refetch` callback or passing `forceRefetch: true` in the action creator.
- `number` - **Value is in seconds**. If a number is provided and there is an existing query in the cache, it will compare the current time vs the last fulfilled timestamp, and only refetch if enough time has elapsed.

If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnMountOrArgChange` to each individual hook call or when dispatching the [`initiate`](#initiate) action.
:::

### `refetchOnFocus`

Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after the application window regains focus.

If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnFocus` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

### `refetchOnReconnect`

Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after regaining a network connection.

If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.

:::note
You can set this globally in `createApi`, but you can also override the default value and have more granular control by passing `refetchOnReconnect` to each individual hook call or when dispatching the [`initiate`](#initiate) action.

If you specify `track: false` when manually dispatching queries, RTK Query will not be able to automatically refetch for you.
:::

## Return value

See [the "created Api" API reference](../created-api/overview)

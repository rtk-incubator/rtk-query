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
  keepUnusedDataFor?: number;
```

It returns: `reducerPath`, `reducer`, `middleware`, `actions`, `selectors`, `hooks`

```ts
const api = createApi({
  baseQuery: fetchBaseQuery('/'),
  endpoints: (builder) => ({
    // ...
  }),
});

export const { reducerPath, reducer, middleware, hooks, actions, selectors } = api;
```

#### middleware

This is a standard redux middleware and is responsible for things like [polling](../concepts/polling), [garbage collection](#keepunuseddatafor) and a handful of other things. Make sure it's [included in your store](../introduction/quick-start#add-the-service-to-your-store).

#### actions

React Hooks user will most likely never need to use these in most cases. These are redux action creators that you can `dispatch` with `useDispatch` or `store.dispatch()`.

:::note Usage of actions outside of React Hooks
When dispatching an action creator, you're responsible for storing a reference to the promise it returns in the event that you want to update that specific subscription. To get an idea of what that entails, see the [Svelte Example](../examples/svelte) or the [React Class Components Example](../examples/react-class-components)
:::

#### selectors

Selectors are how you access your `query` or `mutation` data from the cache. If you're using Hooks, you don't have to worry about these in most cases. There are several ways to use them:

```js title="React
// hooks
const { data, status } = useSelector(selectors.getPosts());

// class component with connect
const mapStateToProps = (state) => ({
  data: selectors.getPosts(state),
});
connect(null, mapStateToProps);
```

```js title="Svelte"
$: ({ data, status } = selectors.getPosts()($store));
```

#### hooks

Hooks are specifically for React Hooks users. If you are not using React Hooks, you shouldn't `export` them – this way they're not included in the bundle or pull in the React dependency.

### `baseQuery`

### `entityTypes`

Specifying entity types is optional, but you should define them so that they can be used for caching and invalidation. When defining an entity type, you will be able to add them with `provides` and [invalidate](../concepts/mutations#advanced-mutations-with-revalidation) them with `invalidates` when configuring [endpoints](#endpoints).

### `reducerPath`

The `reducerPath` is a _unique_ key that your service will be mounted to in your store. If you call `createApi` more than once in your application, you will need to provide a unique value each time. Defaults to `api`.

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

Accepts a custom function if you have a need to change the serialization behavior for any reason. Defaults to:

```ts no-compile
function defaultSerializeQueryArgs(args: any, endpoint: string) {
  return `${endpoint}/${JSON.stringify(args)}`;
}
```

### `endpoints`

Endpoints are just a set of operations that you want to perform against your server. You define them as an object using the builder syntax. There are two basic endpoint types: `query` and `mutation`.

When defining a key like `getPosts` as shown below, it's important to know that this name will become exportable from `api` and be able to referenced under `api.hooks.getPosts`, `api.selectors.getPosts`, and `api.actions.getPosts`. The same thing applies to `mutation`s.

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

// Possible exports

export const { selectors, actions, reducerPath, reducer, middleware } = api;
// reducerPath, reducer, middleware are only used in store configuration
// selectors/actions will have: selectors.getPosts, selectors.addPost, actions.getPosts, actions.getPost


// React users that use hooks are able to take advantage of this special feature
// The syntax is `use(MethodName)(Query|Mutation)`
// TS 4.1+ users will get type safety doing this as well
export { useGetPostsQuery, useAddPostMutation } = api.hooks;
```

### `keepUnusedDataFor`

Defaults to `60` _(this value is in seconds)_. This is how long RTK Query will keep your data cached for **after** the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.

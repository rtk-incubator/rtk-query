- [`reducerPath`](./redux=integration#reducerpath)
- [`reducer`](./redux=integration#reducer)
- [`middleware`](./redux=integration#middleware)
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

#### hooks

Hooks are specifically for React Hooks users. Under each `api.endpoint.[endpointName]`, you will have `useQuery` or `useMutation` depending on the type. For example, if you had `getPosts` and `updatePost`, these options would be available:

```ts title="Hooks usage"
const { data } = api.endpoints.getPosts.useQuery();
const { data } = api.endpoints.updatePost.useMutation();

const { data } = api.useGetPostsQuery();
const [updatePost] = api.useUpdatePostMutation();
```

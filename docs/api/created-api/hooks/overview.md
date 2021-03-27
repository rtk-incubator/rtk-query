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

---
id: queries
title: Queries
sidebar_label: Queries
hide_title: true
---

# `Queries`

This is the most basic feature of `rtk-query`. A `query` can be performed with any data fetching library of your choice and will accept any HTTP method, but we recommend that you only use queries for `GET` requests. For anything that alters data on the server or will possibly invalidate the cache, you should use a [Mutation](./mutations).

By default, `rtk-query` ships with [fetchBaseQuery](../api/fetchBaseQuery), which is just a lightweight [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) wrapper that automatically handles request headers and response parsing in a manner similar to common libraries like `axios`.

> Depending on your environment, you may need to polyfill `fetch` with `whatwg-fetch` if you choose to use `fetchBaseQuery` or `fetch` on it's own.

### Query Keys

When you perform a `query`, we automatically serialize the request parameters and create an internal `queryKey` for the request. Any future request that has the same `queryKey` will be de-duped against the original, and will share updates if a `refetch` is trigged on the query from any subscribed component.

### Avoiding unnecessary requests

By default, if you add a component that makes the same query as an existing one, no request will be performed.

In some cases, you may want to skip this behavior and force a refetch - in that case, you can specifiy `forceRefetch` in the query options.

### Observing caching behavior

What you'll see below is this:

1. The first `Pokemon` component mounts and immediately fetches 'bulbasaur'
2. A second later, another `Pokemon` component is rendered with 'bulbasaur'

   - Notice that this one doesn't ever show 'Loading...' and no new network request happens? It's using the cache here.

3. A moment after that, a `Pokemon` component for 'pikachu' is added, and a new request happens.
4. When you click 'Refetch' of a particular pokemon type, it'll update all of them with one request.

> Try clicking the 'Add bulbasaur' button. You'll observe the same behavior described above until you click the 'Refetch' button on one of the components.

<iframe src="https://codesandbox.io/embed/concepts-queries-deduping-caching-5qy3n?fontsize=14&hidenavigation=1&theme=dark"
     style={{ width: '100%', height: '800px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
     title="rtk-query-react-hooks-example"
     allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb" 
     sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

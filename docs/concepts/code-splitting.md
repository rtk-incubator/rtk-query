---
id: code-splitting
title: Code Splitting
sidebar_label: Code Splitting
hide_title: true
---

# Code Splitting

RTK Query makes it possible to trim down your initial bundle size by allowing you to inject additional endpoints after you've setup your initial service definition. This can be very beneficial for larger applications that may have _many_ endpoints.

`injectEndpoints` accepts a collection of endpoints an one optional parameter of `overrideExisting`

```ts title="Basic setup"
import { createApi, fetchBaseQuery, ApiWithInjectedEndpoints } from '@rtk-incubator/rtk-query';

// initialize an empty api service that we'll inject endpoints into later as needed
export const emptySplitApi = createApi({
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  endpoints: () => ({}),
});

export const splitApi = emptySplitApi as ApiWithInjectedEndpoints<
  typeof emptySplitApi,
  [
    // These are only type imports, not runtime imports, meaning they're not included in the initial bundle
    typeof import('./posts').apiWithPosts,
    typeof import('./post').apiWithPost
  ]
>;
```

```ts title="Injecting additional endpoints"
const extendedApi = emptySplitApi.injectEndpoints({
  endpoints: (build) => ({
    exampleQuery: build.query({
      query: () => 'test',
    }),
  }),
  overrideExisting: true,
});
```

:::tip
You will get a warning if you inject an endpoint that already exists in development mode when you don't explicitly specify `overrideExisting: true`. You **will not see this in production** and the existing endpoint will just be overriden, so make sure to account for this in your tests.
:::

## Example

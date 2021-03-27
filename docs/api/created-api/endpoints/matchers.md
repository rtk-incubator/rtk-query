#### action matchers

These are action matchers for each endpoint to allow you matching on redux actions for that endpoint - for example in slice `extraReducers` or a custom middleware. Those are implemented as follows:

```ts
 matchPending: isAllOf(isPending(thunk), matchesEndpoint(endpoint)),
 matchFulfilled: isAllOf(isFulfilled(thunk), matchesEndpoint(endpoint)),
 matchRejected: isAllOf(isRejected(thunk), matchesEndpoint(endpoint)),
```

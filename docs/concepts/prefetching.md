---
id: prefetching
title: Prefetching
sidebar_label: Prefetching
hide_title: true
---

# `Prefetching`

The goal of prefetching is to make data fetch _before_ the user navigates to a page or attempts to load some known content.

There are a handful of situations that you may want to do this, but some very common use cases are:

1. User hovers over a navigation element
2. User hovers over a list element that is a link
3. User hovers over a next pagination button

### Prefetching with React Hooks

The `usePrefetch` hook accepts two parameters: the first is the key of a query action, and the second is an object of two optional parameters:

1. `ifOlderThan` - (default: `false` | `number`) - _number is value in seconds_

   - If specified, it will only run the query if the difference between `new Date()` and the last `fulfilledTimeStamp` is greater than the given value

2. `force`

   - If `force: true`, it will ignore the `ifOlderThan` value if it is set and the query will be run even if it exists in the cache.

#### Behavior of the hook

1. If `force: true` is set during the declaration or at the call site, the query will be run no matter what. The one exception to that is if the same query is already in-flight.
2. If no options are specified and the query exists in the cache, the query will be performed.
3. If no options are specified and the query _does not exist_ in the cache, the query will be performed.
   - `isLoading` will be true, `isFetching` will be true
4. If `ifOlderThan` is specified but evaluates to false and the query is in the cache, the query will not be performed.
5. If `ifOlderThan` is specified and evaluates to true, the query will be performed even if there is an existing cache entry.
   - `isLoading` will be false, `isFetching` will be true

```ts title="usePrefetch Example"
function User() {
  const prefetchUser = usePrefetch('getUser');

  // Low priority hover will not fire unless the last request happened more than 35s ago
  // High priority hover will _always_ fire
  return (
    <div>
      <button onMouseEnter={() => prefetchUser(4, { ifOlderThan: 35 })}>Low priority</button>
      <button onMouseEnter={() => prefetchUser(4, { force: true })}>High priority</button>
    </div>
  );
}
```

### Prefetching without hooks

If you're not using the `usePrefetch` hook, you can recreate the same behavior easily on your own in any framework.

```js title="Manual prefetch example"
dispatch(api.queryActions[endpointName](arg, { forceRefetch: true }));
```

The main difference is that the `usePrefetch` hook executes a bit of logic that evaluates the last fulfilled timestamp, presence in the cache, and observance of the `force` parameter. There is no magic here, and you can most likely recreate this same behavior in any framework.

### Example

This is a very basic example that shows how you can prefetch when a user hovers over the next arrow. This is probably not the optimal solution, because if they hover, click, then change pages without moving their mouse, we wouldn't know to prefetch the next page because we wouldn't see the next `onMouseEnter` event. In this case, you would need to handle this on your own. You could also consider automatically prefetching the next page...

<iframe
  src="https://codesandbox.io/embed/concepts-prefetching-h594j?fontsize=14&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-react-hooks-usePrefetch-example"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

### Automatic Prefetching Example

Picking up on our last example, we automatically `prefetch` the next page, giving the appearance of no network delay.

<iframe
  src="https://codesandbox.io/embed/concepts-prefetching-automatic-2id61?fontsize=14&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-react-hooks-usePrefetch-example"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

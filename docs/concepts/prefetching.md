---
id: prefetching
title: Prefetching
sidebar_label: Prefetching
hide_title: true
---

# `Prefetching`

The goal of prefetching is to make data fetch _before_ the user navigates to or attempts to load the expected content.

There are a handful of situations that you may want to do this, but some very common use cases are:

1. User hovers over a navigation element
2. User hovers over a list element that is a link
3. User hovers over a next pagination button

### Prefetching with React Hooks

The `usePrefetch` hook accepts two parameters: the first is the key of a query action, and the second is an object of two optional parameters:

1. `ifOlderThan` - (default: `false` | `number`) - _number is value in seconds_

   - If specified, will only fetch if the last `fulfilledTimeStamp` is before the given value

2. `force`

   - If `force: true`, it will ignore the `ifOlderThan` value if it is set and the query will be triggered even if it exists in the cache.

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

### Example

<iframe
  src="https://codesandbox.io/embed/concepts-polling-gorpg?fontsize=14&hidenavigation=1&theme=dark"
  style={{ width: '100%', height: '600px', border: 0, borderRadius: '4px', overflow: 'hidden' }}
  title="rtk-query-react-hooks-example"
  allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
  sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

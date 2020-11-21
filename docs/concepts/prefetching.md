---
id: prefetching
title: Prefetching
sidebar_label: Prefetching
hide_title: true
---

# `Prefetching`

The goal of prefetching is to make data fetch _before_ the user navigates to or attempts to load the expected content.

There are a handful of situations that you may want to do this, but some very common cases are:

1. User hovers over a navigation element
2. User hovers over a list element that is a link
3. User hovers over a pagination buttonvvvvv

#### Prefetching with React Hooks

```ts title="Prefetching Example"
function User() {
  // We set the default to force
  const prefetchUser = usePrefetch('getUser');

  // Low priority will not fire, unless the last request was older than 35s.
  // High priority hover will _always_ fire
  return (
    <div>
      <button onMouseEnter={() => prefetchUser(4, { ifOlderThan: 35 })} data-testid="lowPriority">
        Low priority user action intent
      </button>
      <button onMouseEnter={() => prefetchUser(4, { force: true })} data-testid="highPriority">
        High priority action intent - Prefetch User 2
      </button>
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

#### select

`select` is how you access your `query` or `mutation` data from the cache. If you're using Hooks, you don't have to worry about this in most cases. There are several ways to use them:

```js title="React Hooks"
const { data, status } = useSelector(api.getPosts.select());
```

```js title="Using connect from react-redux"
const mapStateToProps = (state) => ({
  data: api.getPosts.select()(state),
});
connect(null, mapStateToProps);
```

```js title="Svelte"
$: ({ data, status } = api.getPosts.select()($store));
```

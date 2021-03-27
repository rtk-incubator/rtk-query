### `internalActions`

:::danger
These may change at any given time and are not part of the public API for now
:::

- `updateSubscriptionOptions: ActionCreatorWithPayload<{ endpoint: string; requestId: string; options: SubscriptionOptions; queryCacheKey: QueryCacheKey }, string>;`
- `queryResultPatched: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey, patches: Patch[]; }, string>`
- `removeQueryResult: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey }, string>`
- `unsubscribeQueryResult: ActionCreatorWithPayload<{ queryCacheKey: QueryCacheKey, requestId: string }, string>`,
- `unsubscribeMutationResult: ActionCreatorWithPayload<MutationSubstateIdentifier, string>`,

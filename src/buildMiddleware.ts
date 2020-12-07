import {
  AnyAction,
  AsyncThunk,
  createAction,
  isFulfilled,
  isPending,
  isRejected,
  Middleware,
  MiddlewareAPI,
  ThunkDispatch,
} from '@reduxjs/toolkit';
import { batch as reactBatch } from 'react-redux';
import { QueryCacheKey, QueryStatus, QuerySubstateIdentifier, RootState, Subscribers } from './apiState';
// import { Api } from './apiTypes';
import {
  // MutationThunkArg
  QueryThunkArg,
  ThunkResult,
} from './buildThunks';
import {
  AssertEntityTypes,
  calculateProvidedBy,
  EndpointDefinitions,
  FullEntityDescription,
} from './endpointDefinitions';
import { onFocus, onOnline } from './setupListeners';
import { flatten } from './utils';

const batch = typeof reactBatch !== 'undefined' ? reactBatch : (fn: Function) => fn();

type QueryStateMeta<T> = Record<string, undefined | T>;
type TimeoutId = ReturnType<typeof setTimeout>;

export const removeQueryResult = createAction<QuerySubstateIdentifier>('__rtkq/removeQueryResult');

export function buildMiddleware<Definitions extends EndpointDefinitions, ReducerPath extends string>({
  endpointDefinitions,
  queryThunk,
  keepUnusedDataFor,
  assertEntityType,
}: {
  endpointDefinitions: { [key: string]: EndpointDefinitions };
  queryThunk: AsyncThunk<ThunkResult, QueryThunkArg<any>, {}>;
  keepUnusedDataFor: number;
  assertEntityType: AssertEntityTypes;
}) {
  type MWApi = MiddlewareAPI<ThunkDispatch<any, any, AnyAction>, RootState<Definitions, string, ReducerPath>>;

  const currentRemovalTimeouts: QueryStateMeta<TimeoutId> = {};

  let allApiReducerPaths: ReducerPath[] | undefined;
  const currentPolls: QueryStateMeta<{ nextPollTimestamp: number; timeout?: TimeoutId; pollingInterval: number }> = {};
  const middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>> = (
    mwApi
  ) => (next) => (action) => {
    const result = next(action);

    // Check and see if we've set all known paths, if not, give it a shot.
    if (!allApiReducerPaths) {
      allApiReducerPaths = Object.entries(mwApi.getState()).reduce((acc, [key, entry]: [string, any]) => {
        // Could probably just use a flag specifically for this?
        if ('queries' in entry && 'config' in entry) {
          acc.push(key as ReducerPath);
        }
        return acc;
      }, [] as ReducerPath[]);
    }

    // TODO:  tests, we'd need custom matchers to match any type of query/mutation thunk
    const isQueryThunk = (action: AnyAction): action is AnyAction => action.type.includes('/executeQuery/');
    const isMutationThunk = (action: AnyAction): action is AnyAction => action.type.includes('/executeMutation/');

    if (isFulfilled(action) && isMutationThunk(action)) {
      // TODO: how do we do this calculateProvidedBy?
      invalidateEntities(
        calculateProvidedBy(
          endpointDefinitions[action.meta.arg.reducerPath][action.meta.arg.endpoint].invalidates,
          action.payload.result,
          action.meta.arg.originalArgs,
          assertEntityType
        ),
        mwApi,
        action.meta.arg.reducerPath as ReducerPath
      );
    }

    if (action.type.includes('subscriptions/unsubscribeResult')) {
      handleUnsubscribe(action.payload, mwApi, action.payload.reducerPath as ReducerPath);
    }

    if (action.type.includes('subscriptions/updateSubscriptionOptions')) {
      updatePollingInterval(action.payload, mwApi, action.payload.reducerPath as ReducerPath);
    }

    if (
      (isPending(action) && isQueryThunk(action)) ||
      (isRejected(action) && isQueryThunk(action) && action.meta.condition)
    ) {
      updatePollingInterval(action.meta.arg, mwApi, action.meta.arg.reducerPath as ReducerPath);
    }

    if (
      (isFulfilled(action) && isQueryThunk(action)) ||
      (isRejected(action) && isQueryThunk(action) && !action.meta.condition)
    ) {
      startNextPoll(action.meta.arg, mwApi);
    }

    if (onFocus.match(action)) {
      refetchValidQueries(mwApi, 'refetchOnFocus');
    }
    if (onOnline.match(action)) {
      refetchValidQueries(mwApi, 'refetchOnReconnect');
    }

    return result;
  };

  return { middleware };

  function refetchValidQueries(api: MWApi, type: 'refetchOnFocus' | 'refetchOnReconnect') {
    let allQueries: Array<() => void> = [];

    for (const reducerPath of allApiReducerPaths || []) {
      const state = api.getState()[reducerPath as ReducerPath];
      const queries = state.queries;
      const subscriptions = state.subscriptions;
      const baseTypeValue = state.config[type]; // The defaults are set in buildSlice when calling createApi

      for (const queryCacheKey of Object.keys(subscriptions)) {
        const querySubState = queries[queryCacheKey];

        const allSubsAreFalse = Object.values(subscriptions[queryCacheKey] || {}).every(
          (entry) => type in entry && !entry[type]
        );

        const shouldRefetch = (baseTypeValue && !allSubsAreFalse) || !allSubsAreFalse;

        if (querySubState && shouldRefetch) {
          if (querySubState.status !== QueryStatus.uninitialized) {
            allQueries.push(() =>
              api.dispatch(
                queryThunk({
                  endpoint: querySubState.endpoint,
                  originalArgs: querySubState.originalArgs,
                  internalQueryArgs: querySubState.internalQueryArgs,
                  subscribe: false,
                  forceRefetch: true,
                  startedTimeStamp: Date.now(),
                  queryCacheKey: queryCacheKey as any,
                  reducerPath,
                })
              )
            );
          }
        }
      }
    }

    batch(() => {
      allQueries.forEach((call) => call());
    });
  }

  function invalidateEntities(
    entities: readonly FullEntityDescription<string>[],
    api: MWApi,
    reducerPath: ReducerPath
  ) {
    const state = api.getState()[reducerPath];
    const toInvalidate = new Set<QueryCacheKey>();
    for (const entity of entities) {
      const provided = state.provided[entity.type];
      if (!provided) {
        continue;
      }

      let invalidateSubscriptions =
        (entity.id !== undefined
          ? // id given: invalidate all queries that provide this type & id
            provided[entity.id]
          : // no id: invalidate all queries that provide this type
            flatten(Object.values(provided))) ?? [];

      for (const invalidate of invalidateSubscriptions) {
        toInvalidate.add(invalidate);
      }
    }

    batch(() => {
      for (const queryCacheKey of toInvalidate.values()) {
        const querySubState = state.queries[queryCacheKey];
        const subscriptionSubState = state.subscriptions[queryCacheKey];
        if (querySubState && subscriptionSubState) {
          if (Object.keys(subscriptionSubState).length === 0) {
            api.dispatch(removeQueryResult({ queryCacheKey, reducerPath }));
          } else if (querySubState.status !== QueryStatus.uninitialized) {
            api.dispatch(
              queryThunk({
                endpoint: querySubState.endpoint,
                originalArgs: querySubState.originalArgs,
                internalQueryArgs: querySubState.internalQueryArgs,
                queryCacheKey,
                subscribe: false,
                forceRefetch: true,
                startedTimeStamp: Date.now(),
                reducerPath,
              })
            );
          } else {
          }
        }
      }
    });
  }

  function handleUnsubscribe({ queryCacheKey }: QuerySubstateIdentifier, api: MWApi, reducerPath: ReducerPath) {
    const currentTimeout = currentRemovalTimeouts[queryCacheKey];
    if (currentTimeout) {
      clearTimeout(currentTimeout);
    }
    currentRemovalTimeouts[queryCacheKey] = setTimeout(() => {
      const subscriptions = api.getState()[reducerPath].subscriptions[queryCacheKey];
      if (!subscriptions || Object.keys(subscriptions).length === 0) {
        api.dispatch(removeQueryResult({ queryCacheKey, reducerPath }));
      }
      delete currentRemovalTimeouts![queryCacheKey];
    }, keepUnusedDataFor * 1000);
  }

  function startNextPoll({ queryCacheKey, reducerPath }: QuerySubstateIdentifier, api: MWApi) {
    const querySubState = api.getState()[reducerPath as ReducerPath].queries[queryCacheKey];
    const subscriptions = api.getState()[reducerPath as ReducerPath].subscriptions[queryCacheKey];

    if (!querySubState || querySubState.status === QueryStatus.uninitialized) return;

    const lowestPollingInterval = findLowestPollingInterval(subscriptions);
    if (!Number.isFinite(lowestPollingInterval)) return;

    const currentPoll = currentPolls[queryCacheKey];

    if (currentPoll?.timeout) {
      clearTimeout(currentPoll.timeout);
      currentPoll.timeout = undefined;
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval;

    const currentInterval: typeof currentPolls[number] = (currentPolls[queryCacheKey] = {
      nextPollTimestamp,
      pollingInterval: lowestPollingInterval,
      timeout: setTimeout(() => {
        currentInterval!.timeout = undefined;
        api.dispatch(
          queryThunk({
            endpoint: querySubState.endpoint,
            originalArgs: querySubState.originalArgs,
            internalQueryArgs: querySubState.internalQueryArgs,
            queryCacheKey,
            subscribe: false,
            forceRefetch: true,
            startedTimeStamp: Date.now(),
            reducerPath,
          })
        );
      }, lowestPollingInterval),
    });
  }

  function updatePollingInterval({ queryCacheKey }: QuerySubstateIdentifier, api: MWApi, reducerPath: ReducerPath) {
    const querySubState = api.getState()[reducerPath].queries[queryCacheKey];
    const subscriptions = api.getState()[reducerPath].subscriptions[queryCacheKey];

    if (!querySubState || querySubState.status === QueryStatus.uninitialized) {
      return;
    }

    const lowestPollingInterval = findLowestPollingInterval(subscriptions);
    const currentPoll = currentPolls[queryCacheKey];

    if (!Number.isFinite(lowestPollingInterval)) {
      if (currentPoll?.timeout) {
        clearTimeout(currentPoll.timeout);
      }
      delete currentPolls[queryCacheKey];
      return;
    }

    const nextPollTimestamp = Date.now() + lowestPollingInterval;

    if (!currentPoll || nextPollTimestamp < currentPoll.nextPollTimestamp) {
      startNextPoll({ queryCacheKey, reducerPath }, api);
    }
  }
}

function findLowestPollingInterval(subscribers: Subscribers = {}) {
  let lowestPollingInterval = Number.POSITIVE_INFINITY;
  for (const subscription of Object.values(subscribers)) {
    if (!!subscription.pollingInterval)
      lowestPollingInterval = Math.min(subscription.pollingInterval, lowestPollingInterval);
  }
  return lowestPollingInterval;
}

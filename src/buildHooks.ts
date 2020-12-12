import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, batch, shallowEqual } from 'react-redux';
import {
  MutationSubState,
  QueryStatus,
  QuerySubState,
  RequestStatusFlags,
  SubscriptionOptions,
  QueryKeys,
  RootState,
} from './apiState';
import { EndpointDefinitions, MutationDefinition, QueryDefinition, QueryArgFrom } from './endpointDefinitions';
import { QueryResultSelectorResult, skipSelector } from './buildSelectors';
import { QueryActionCreatorResult, MutationActionCreatorResult } from './buildActionMaps';
import { useShallowStableValue } from './utils';
import { Api, ApiEndpointMutation, ApiEndpointQuery } from './apiTypes';
import { Id, Override, NoInfer } from './tsHelpers';

interface QueryHooks<Definition extends QueryDefinition<any, any, any, any, any>> {
  useQuery: UseQuery<Definition>;
  useQuerySubscription: UseQuerySubscription<Definition>;
  useQueryState: UseQueryState<Definition>;
}

declare module './apiTypes' {
  export interface ApiEndpointQuery<
    Definition extends QueryDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > extends QueryHooks<Definition> {}

  export interface ApiEndpointMutation<
    Definition extends MutationDefinition<any, any, any, any, any>,
    Definitions extends EndpointDefinitions
  > {
    useMutation: MutationHook<Definition>;
  }
}

export type UseQuery<D extends QueryDefinition<any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: UseQuerySubscriptionOptions
) => UseQueryStateResult<D> & ReturnType<UseQuerySubscription<D>>;

interface UseQuerySubscriptionOptions extends SubscriptionOptions {
  skip?: boolean;
  refetchOnMountOrArgChange?: boolean | number;
}

export type UseQuerySubscription<D extends QueryDefinition<any, any, any, any>> = (
  arg: QueryArgFrom<D>,
  options?: UseQuerySubscriptionOptions
) => Pick<QueryActionCreatorResult<D>, 'refetch'>;

export type QueryStateSelector<R, D extends QueryDefinition<any, any, any, any>> = (
  state: QueryResultSelectorResult<D>,
  lastResult: R | undefined
) => R;

export type UseQueryState<D extends QueryDefinition<any, any, any, any>> = <R = UseQueryStateResult<D>>(
  arg: QueryArgFrom<D>,
  options?: {
    skip?: boolean;
    subSelector?: QueryStateSelector<R, D>;
    shouldUpdateLastValue?(newValue: NoInfer<R>, oldValue: NoInfer<R> | undefined): boolean;
  }
) => R;

type UseQueryStateBaseResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> & {
  /**
   * Query has not started yet.
   */
  isUninitialized: false;
  /**
   * Query is currently loading for the first time. No data yet.
   */
  isLoading: false;
  /**
   * Query is currently fetching, but might have data from an earlier request.
   */
  isFetching: false;
  /**
   * Query has data from a successful load.
   */
  isSuccess: false;
  /**
   * Query is currently in "error" state.
   */
  isError: false;
};

type UseQueryStateResult<D extends QueryDefinition<any, any, any, any>> = Id<
  | Override<Extract<UseQueryStateBaseResult<D>, { status: QueryStatus.uninitialized }>, { isUninitialized: true }>
  | Override<
      UseQueryStateBaseResult<D>,
      | { isLoading: true; isFetching: boolean; data: undefined }
      | ({ isSuccess: true; isFetching: boolean; error: undefined } & Required<
          Pick<UseQueryStateBaseResult<D>, 'data' | 'fulfilledTimeStamp'>
        >)
      | ({ isError: true } & Required<Pick<UseQueryStateBaseResult<D>, 'error'>>)
    >
>;

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = () => [
  (
    arg: QueryArgFrom<D>
  ) => Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>>,
  MutationSubState<D> & RequestStatusFlags
];

export type PrefetchOptions =
  | { force?: boolean }
  | {
      ifOlderThan?: false | number;
    };

const defaultQueryStateSelector: QueryStateSelector<UseQueryStateResult<any>, any> = (currentState, lastResult) => {
  // data is the last known good request result
  const data = currentState.status === 'fulfilled' ? currentState.data : lastResult?.data;

  const isPending = currentState.status === QueryStatus.pending;
  // isLoading = true only when loading while no data is present yet (initial load)
  const isLoading: any = !lastResult?.data && isPending;
  // isFetching = true any time a request is in flight
  const isFetching: any = isPending;
  // isSuccess = true when data is present
  const isSuccess: any = currentState.status === 'fulfilled' || (isPending && !!data);

  return { ...currentState, data, isFetching, isLoading, isSuccess } as any; // TODO
};

export function buildHooks<Definitions extends EndpointDefinitions>({
  api,
}: {
  api: Api<any, Definitions, any, string>;
}) {
  return { buildQueryHooks, buildMutationHook, usePrefetch };

  function usePrefetch<EndpointName extends QueryKeys<Definitions>>(
    endpointName: EndpointName,
    defaultOptions?: PrefetchOptions
  ) {
    const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
    const stableDefaultOptions = useShallowStableValue(defaultOptions);

    return useCallback(
      (arg: any, options?: PrefetchOptions) =>
        dispatch(api.internalActions.prefetchThunk(endpointName, arg, { ...stableDefaultOptions, ...options })),
      [endpointName, dispatch, stableDefaultOptions]
    );
  }

  function buildQueryHooks(name: string): QueryHooks<any> {
    const useQuerySubscription: UseQuerySubscription<any> = (
      arg: any,
      { refetchOnReconnect, refetchOnFocus, refetchOnMountOrArgChange, skip = false, pollingInterval = 0 } = {}
    ) => {
      const { initiate } = api.endpoints[name] as ApiEndpointQuery<
        QueryDefinition<any, any, any, any, any>,
        Definitions
      >;
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const stableArg = useShallowStableValue(arg);

      const promiseRef = useRef<QueryActionCreatorResult<any>>();

      useEffect(() => {
        if (skip) {
          return;
        }

        const lastPromise = promiseRef.current;
        if (lastPromise && lastPromise.arg === stableArg) {
          // arg did not change, but options did probably, update them
          lastPromise.updateSubscriptionOptions({ pollingInterval, refetchOnReconnect, refetchOnFocus });
        } else {
          if (lastPromise) lastPromise.unsubscribe();
          const promise = dispatch(
            initiate(stableArg, {
              subscriptionOptions: { pollingInterval, refetchOnReconnect, refetchOnFocus },
              forceRefetch: refetchOnMountOrArgChange,
            })
          );
          promiseRef.current = promise;
        }
      }, [
        stableArg,
        dispatch,
        skip,
        pollingInterval,
        refetchOnMountOrArgChange,
        refetchOnFocus,
        refetchOnReconnect,
        initiate,
      ]);

      useEffect(() => {
        return () => void promiseRef.current?.unsubscribe();
      }, []);

      return useMemo(
        () => ({
          refetch: () => void promiseRef.current?.refetch(),
        }),
        []
      );
    };

    const useQueryState: UseQueryState<any> = (
      arg: any,
      {
        skip = false,
        subSelector = defaultQueryStateSelector as QueryStateSelector<any, any>,
        shouldUpdateLastValue,
      } = {}
    ) => {
      const { select } = api.endpoints[name] as ApiEndpointQuery<QueryDefinition<any, any, any, any, any>, Definitions>;
      const stableArg = useShallowStableValue(arg);

      const lastValue = useRef<any>();

      const selector = useCallback(
        (state: RootState<Definitions, any, any>) => {
          const querySelector = select(skip ? skipSelector : stableArg);
          return subSelector(querySelector(state), lastValue.current);
        },
        [select, skip, stableArg, subSelector]
      );

      const currentState = useSelector(selector, shallowEqual);

      useEffect(() => {
        if ((shouldUpdateLastValue || defaultUpdateLastValue)(currentState, lastValue.current)) {
          lastValue.current = currentState;
        }

        function defaultUpdateLastValue(newValue: any, oldValue: any) {
          return subSelector === defaultQueryStateSelector
            ? newValue.status === QueryStatus.fulfilled
            : newValue !== oldValue;
        }
      }, [currentState, shouldUpdateLastValue, subSelector]);

      return currentState;
    };

    return {
      useQueryState,
      useQuerySubscription,
      useQuery(arg, options) {
        const querySubscriptionResults = useQuerySubscription(arg, options);
        const queryStateResults = useQueryState(arg, options);
        return useMemo(() => ({ ...queryStateResults, ...querySubscriptionResults }), [
          queryStateResults,
          querySubscriptionResults,
        ]);
      },
    };
  }

  function buildMutationHook(name: string): MutationHook<any> {
    return () => {
      const { select, initiate } = api.endpoints[name] as ApiEndpointMutation<
        MutationDefinition<any, any, any, any, any>,
        Definitions
      >;
      const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
      const [requestId, setRequestId] = useState<string>();

      const promiseRef = useRef<MutationActionCreatorResult<any>>();

      useEffect(() => () => void promiseRef.current?.unsubscribe(), []);

      const triggerMutation = useCallback(
        function (args) {
          let promise: MutationActionCreatorResult<any>;
          batch(() => {
            if (promiseRef.current) promiseRef.current.unsubscribe();
            promise = dispatch(initiate(args));
            promiseRef.current = promise;
            setRequestId(promise.requestId);
          });
          return promise!;
        },
        [dispatch, initiate]
      );

      const mutationSelector = useMemo(() => select(requestId || skipSelector), [requestId, select]);
      const currentState = useSelector(mutationSelector);

      return useMemo(() => [triggerMutation, currentState], [triggerMutation, currentState]);
    };
  }
}

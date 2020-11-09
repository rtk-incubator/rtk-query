import { AnyAction, ThunkDispatch } from '@reduxjs/toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector, batch } from 'react-redux';
import { MutationSubState, QueryStatus, QuerySubState } from './apiState';
import {
  EndpointDefinitions,
  MutationDefinition,
  QueryDefinition,
  isQueryDefinition,
  isMutationDefinition,
} from './endpointDefinitions';
import { QueryResultSelectors, MutationResultSelectors, skipSelector } from './buildSelectors';
import {
  QueryActions,
  MutationActions,
  QueryActionCreatorResult,
  MutationActionCreatorResult,
} from './buildActionMaps';

export interface QueryHookOptions {
  skip?: boolean;
}

export type QueryHook<D extends QueryDefinition<any, any, any, any>> = D extends QueryDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? (arg: QueryArg, options?: QueryHookOptions) => QueryHookResult<D>
  : never;

export type QueryHookResult<D extends QueryDefinition<any, any, any, any>> = QuerySubState<D> &
  Pick<QueryActionCreatorResult<D>, 'refetch'>;

export type MutationHook<D extends MutationDefinition<any, any, any, any>> = D extends MutationDefinition<
  infer QueryArg,
  any,
  any,
  any
>
  ? () => [
      (
        arg: QueryArg
      ) => Promise<Extract<MutationSubState<D>, { status: QueryStatus.fulfilled | QueryStatus.rejected }>>,
      MutationSubState<D>
    ]
  : never;

export type Hooks<Definitions extends EndpointDefinitions> = {
  [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any>
    ? {
        useQuery: QueryHook<Definitions[K]>;
      }
    : Definitions[K] extends MutationDefinition<any, any, any, any>
    ? {
        useMutation: MutationHook<Definitions[K]>;
      }
    : never;
};

export function buildQueryHook(
  name: string,
  queryActions: QueryActions<any>,
  querySelectors: QueryResultSelectors<any, any>
): QueryHook<any> {
  const startQuery = queryActions[name];
  const querySelector = querySelectors[name];
  return (arg, options) => {
    const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
    const skip = options?.skip === true;

    const currentPromiseRef = useRef<QueryActionCreatorResult<any>>();

    useEffect(() => {
      if (skip) {
        return;
      }
      const promise = dispatch(startQuery(arg));
      currentPromiseRef.current = promise;
      return () => void promise.unsubscribe();
    }, [arg, dispatch, skip]);

    const currentState = useSelector(querySelector(skip ? skipSelector : arg));
    const refetch = useCallback(() => void currentPromiseRef.current?.refetch(), []);

    return useMemo(() => ({ ...currentState, refetch }), [currentState, refetch]);
  };
}

export function buildMutationHook(
  name: string,
  mutationActions: MutationActions<any>,
  mutationSelectors: MutationResultSelectors<any, any>
): MutationHook<any> {
  return () => {
    const dispatch = useDispatch<ThunkDispatch<any, any, AnyAction>>();
    const [requestId, setRequestId] = useState<string>();

    const promiseRef = useRef<MutationActionCreatorResult<any>>();

    useEffect(() => () => void promiseRef.current?.unsubscribe(), []);

    const triggerMutation = useCallback(
      function (args) {
        let promise: MutationActionCreatorResult<any>;
        batch(() => {
          // false positive:
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          promiseRef.current?.unsubscribe();
          promise = dispatch(mutationActions[name](args));
          promiseRef.current = promise;
          setRequestId(promise.requestId);
        });
        return promise!;
      },
      [dispatch]
    );

    return [triggerMutation, useSelector(mutationSelectors[name](requestId || skipSelector))];
  };
}

export function buildHooks<Definitions extends EndpointDefinitions>({
  endpointDefinitions,
  querySelectors,
  queryActions,
  mutationSelectors,
  mutationActions,
}: {
  endpointDefinitions: Definitions;
  querySelectors: QueryResultSelectors<Definitions, any>;
  queryActions: QueryActions<Definitions>;
  mutationSelectors: MutationResultSelectors<Definitions, any>;
  mutationActions: MutationActions<Definitions>;
}) {
  const hooks: Hooks<Definitions> = Object.entries(endpointDefinitions).reduce<Hooks<any>>((acc, [name, endpoint]) => {
    if (isQueryDefinition(endpoint)) {
      acc[name] = { useQuery: buildQueryHook(name, queryActions, querySelectors) };
    } else if (isMutationDefinition(endpoint)) {
      acc[name] = { useMutation: buildMutationHook(name, mutationActions, mutationSelectors) };
    }
    return acc;
  }, {});

  return { hooks };
}

import type { AnyAction, Reducer } from '@reduxjs/toolkit';
import { buildThunks, QueryApi } from './buildThunks';
import { buildSlice } from './buildSlice';
import { buildActionMaps } from './buildActionMaps';
import { buildSelectors } from './buildSelectors';
import { buildHooks, buildQueryHook, buildMutationHook } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import { EndpointDefinitions, EndpointBuilder, DefinitionType } from './endpointDefinitions';
import type { CombinedState, QueryStatePhantomType } from './apiState';

export { fetchBaseQuery } from './fetchBaseQuery';
export { QueryStatus } from './apiState';

function defaultSerializeQueryArgs(args: any) {
  return JSON.stringify(args);
}

// Maybe this type of concept should be moved into a react specific package like `@rtk-incubator/simple-query/react`
export const useQuery = (service: any, method: any, opts?: any) => {
  return buildQueryHook(method, service.queryActions, service.selectors.query)(opts);
};

export const useMutation = (service: any, method: any) => {
  return buildMutationHook(method, service.mutationActions, service.selectors.mutation)();
};

export function createApi<
  InternalQueryArgs,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string
>({
  baseQuery,
  reducerPath,
  serializeQueryArgs = defaultSerializeQueryArgs,
  endpoints,
  keepUnusedDataFor = 60,
}: {
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  entityTypes: readonly EntityTypes[];
  reducerPath: ReducerPath;
  serializeQueryArgs?(args: InternalQueryArgs): string;
  endpoints(build: EndpointBuilder<InternalQueryArgs, EntityTypes>): Definitions;
  keepUnusedDataFor?: number;
}) {
  type State = CombinedState<Definitions, EntityTypes>;

  const endpointDefinitions = endpoints({
    query: (x) => ({ ...x, type: DefinitionType.query }),
    mutation: (x) => ({ ...x, type: DefinitionType.mutation }),
  });

  const { queryThunk, mutationThunk } = buildThunks({ baseQuery, reducerPath, endpointDefinitions });

  const {
    reducer: _reducer,
    actions: { unsubscribeQueryResult, unsubscribeMutationResult, removeQueryResult },
  } = buildSlice({ endpointDefinitions, queryThunk, mutationThunk, reducerPath });

  const reducer = (_reducer as any) as Reducer<State & QueryStatePhantomType<ReducerPath>, AnyAction>;

  const { querySelectors, mutationSelectors } = buildSelectors({
    serializeQueryArgs,
    endpointDefinitions,
    reducerPath,
  });

  const { mutationActions, queryActions } = buildActionMaps({
    queryThunk,
    mutationThunk,
    serializeQueryArgs,
    endpointDefinitions,
    querySelectors,
    unsubscribeQueryResult,
    mutationSelectors,
    unsubscribeMutationResult,
  });

  const { middleware } = buildMiddleware({
    reducerPath,
    endpointDefinitions,
    queryActions,
    mutationThunk,
    removeQueryResult,
    keepUnusedDataFor,
    unsubscribeQueryResult,
  });

  const { hooks } = buildHooks({
    endpointDefinitions,
    querySelectors,
    queryActions,
    mutationSelectors,
    mutationActions,
  });

  return {
    queryActions,
    mutationActions,
    reducer,
    selectors: {
      query: querySelectors,
      mutation: mutationSelectors,
    },
    unsubscribeQueryResult,
    unsubscribeMutationResult,
    middleware,
    hooks,
  };
}

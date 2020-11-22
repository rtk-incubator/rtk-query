import type { AnyAction, Middleware, Reducer, ThunkDispatch } from '@reduxjs/toolkit';
import { buildThunks, PatchQueryResultThunk, QueryApi, UpdateQueryResultThunk } from './buildThunks';
import { buildSlice, SliceActions } from './buildSlice';
import { buildActionMaps, EndpointActions } from './buildActionMaps';
import { buildSelectors, Selectors } from './buildSelectors';
import { buildHooks, Hooks } from './buildHooks';
import { buildMiddleware } from './buildMiddleware';
import {
  EndpointDefinitions,
  EndpointBuilder,
  DefinitionType,
  isQueryDefinition,
  isMutationDefinition,
  AssertEntityTypes,
} from './endpointDefinitions';
import type { CombinedState, QueryCacheKey, QueryStatePhantomType, RootState } from './apiState';
import { assertCast, BaseQueryArg, UnionToIntersection } from './tsHelpers';

export { fetchBaseQuery } from './fetchBaseQuery';
export { QueryStatus } from './apiState';

export type SerializeQueryArgs<InternalQueryArgs> = (args: InternalQueryArgs, endpoint: string) => string;
export type InternalSerializeQueryArgs<InternalQueryArgs> = (
  args: InternalQueryArgs,
  endpoint: string
) => QueryCacheKey;

function defaultSerializeQueryArgs(args: any, endpoint: string) {
  // Sort the object keys before stringifying, to prevent useQuery({ a: 1, b: 2 }) having a different cache key than  useQuery({ b: 2, a: 1 })
  return `${endpoint}/${JSON.stringify(args, Object.keys(args).sort())}`;
}

const IS_DEV = () => typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

export function createApi<
  BaseQuery extends (args: any, api: QueryApi) => any,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string = 'api',
  EntityTypes extends string = never
>({
  baseQuery,
  entityTypes = [],
  reducerPath = 'api' as ReducerPath,
  serializeQueryArgs = defaultSerializeQueryArgs,
  endpoints,
  keepUnusedDataFor = 60,
}: {
  baseQuery: BaseQuery;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  endpoints(build: EndpointBuilder<BaseQuery, EntityTypes>): Definitions;
  keepUnusedDataFor?: number;
}): Api<BaseQuery, Definitions, ReducerPath, EntityTypes> {
  type State = CombinedState<Definitions, EntityTypes>;

  type InternalQueryArgs = BaseQueryArg<BaseQuery>;

  assertCast<InternalSerializeQueryArgs<InternalQueryArgs>>(serializeQueryArgs);

  const endpointDefinitions: EndpointDefinitions = {};

  const assertEntityType: AssertEntityTypes = (entity) => {
    if (IS_DEV()) {
      if (!entityTypes.includes(entity.type as any)) {
        console.error(`Entity type '${entity.type}' was used, but not specified in \`entityTypes\`!`);
      }
    }
    return entity;
  };

  const uninitialized: any = () => {
    throw Error('called before initialization');
  };

  const api: Api<BaseQuery, {}, ReducerPath, EntityTypes> = {
    reducerPath,
    selectors: {},
    actions: {},
    hooks: {},
    internalActions: {
      removeQueryResult: uninitialized,
      unsubscribeMutationResult: uninitialized,
      unsubscribeQueryResult: uninitialized,
      updateSubscriptionOptions: uninitialized,
      queryResultPatched: uninitialized,
    },
    util: {
      patchQueryResult: uninitialized,
      updateQueryResult: uninitialized,
    },
    reducer: uninitialized,
    middleware: uninitialized,
    injectEndpoints,
  };

  const { queryThunk, mutationThunk, patchQueryResult, updateQueryResult } = buildThunks({
    baseQuery,
    reducerPath,
    endpointDefinitions,
    api,
    serializeQueryArgs,
  });
  Object.assign(api.util, { patchQueryResult, updateQueryResult });

  const { reducer, actions: sliceActions } = buildSlice({
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    reducerPath,
    assertEntityType,
  });
  assertCast<Reducer<State & QueryStatePhantomType<ReducerPath>, AnyAction>>(reducer);
  Object.assign(api.internalActions, sliceActions);
  api.reducer = reducer;

  const { middleware } = buildMiddleware({
    reducerPath,
    endpointDefinitions,
    queryThunk,
    mutationThunk,
    keepUnusedDataFor,
    sliceActions,
    assertEntityType,
  });
  api.middleware = middleware;

  const { buildQuerySelector, buildMutationSelector } = buildSelectors({
    serializeQueryArgs,
    reducerPath,
  });

  const { buildQueryAction, buildMutationAction } = buildActionMaps({
    queryThunk,
    mutationThunk,
    serializeQueryArgs,
    querySelectors: api.selectors as any,
    mutationSelectors: api.selectors as any,
    sliceActions,
  });

  const { buildQueryHook, buildMutationHook } = buildHooks({
    querySelectors: api.selectors as any,
    queryActions: api.actions as any,
    mutationSelectors: api.selectors as any,
    mutationActions: api.actions as any,
  });

  function injectEndpoints(inject: Parameters<typeof api.injectEndpoints>[0]) {
    const evaluatedEndpoints = inject.endpoints({
      query: (x) => ({ ...x, type: DefinitionType.query }),
      mutation: (x) => ({ ...x, type: DefinitionType.mutation }),
    });
    for (const [endpoint, definition] of Object.entries(evaluatedEndpoints)) {
      if (IS_DEV()) {
        if (!inject.overrideExisting && endpoint in endpointDefinitions) {
          console.error(
            `called \`injectEndpoints\` to override already-existing endpoint ${endpoint} without specifying \`overrideExisting: true\``
          );
          return;
        }
      }
      endpointDefinitions[endpoint] = definition;

      assertCast<Api<InternalQueryArgs, Record<string, any>, ReducerPath, EntityTypes>>(api);
      if (isQueryDefinition(definition)) {
        api.selectors[endpoint] = buildQuerySelector(endpoint, definition);
        api.actions[endpoint] = buildQueryAction(endpoint, definition);
        const useQuery = buildQueryHook(endpoint);
        api.hooks[endpoint] = { useQuery };
        (api.hooks as any)[`use${capitalize(endpoint)}Query`] = useQuery;
      } else if (isMutationDefinition(definition)) {
        api.selectors[endpoint] = buildMutationSelector();
        api.actions[endpoint] = buildMutationAction(endpoint, definition);
        const useMutation = buildMutationHook(endpoint);
        api.hooks[endpoint] = { useMutation };
        (api.hooks as any)[`use${capitalize(endpoint)}Mutation`] = useMutation;
      }
    }

    return api as any;
  }

  return api.injectEndpoints({ endpoints });
}

export interface Api<
  BaseQuery extends (arg: any, ...args: any[]) => any,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string
> {
  reducerPath: ReducerPath;
  actions: EndpointActions<Definitions>;
  internalActions: SliceActions;
  reducer: Reducer<CombinedState<Definitions, EntityTypes> & QueryStatePhantomType<ReducerPath>, AnyAction>;
  selectors: Selectors<Definitions, RootState<Definitions, EntityTypes, ReducerPath>>;
  middleware: Middleware<{}, RootState<Definitions, string, ReducerPath>, ThunkDispatch<any, any, AnyAction>>;
  hooks: Hooks<Definitions>;
  util: {
    updateQueryResult: UpdateQueryResultThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
    patchQueryResult: PatchQueryResultThunk<Definitions, RootState<Definitions, string, ReducerPath>>;
  };
  injectEndpoints<NewDefinitions extends EndpointDefinitions>(_: {
    endpoints: (build: EndpointBuilder<BaseQuery, EntityTypes>) => NewDefinitions;
    overrideExisting?: boolean;
  }): Api<BaseQuery, Definitions & NewDefinitions, ReducerPath, EntityTypes>;
}

export type ApiWithInjectedEndpoints<
  ApiDefinition extends Api<any, any, any, any>,
  Injections extends ApiDefinition extends Api<infer B, any, infer R, infer E>
    ? [Api<B, any, R, E>, ...Api<B, any, R, E>[]]
    : never
> = ApiDefinition & {
  actions: Partial<UnionToIntersection<Injections[number]['actions']>>;
  selectors: Partial<UnionToIntersection<Injections[number]['selectors']>>;
  hooks: Partial<UnionToIntersection<Injections[number]['hooks']>>;
};

function capitalize(str: string) {
  return str.replace(str[0], str[0].toUpperCase());
}

import type { AnyAction, Reducer } from '@reduxjs/toolkit';
import type { CombinedState } from './core/apiState';
import { Api, BaseQueryArg, BaseQueryFn } from './apiTypes';
import { buildActionMaps } from './core/buildActionMaps';
import { buildHooks } from './redux-hooks/buildHooks';
import { buildMiddleware } from './core/buildMiddleware';
import { buildSelectors } from './core/buildSelectors';
import { buildSlice } from './core/buildSlice';
import { buildThunks } from './core/buildThunks';
import { defaultSerializeQueryArgs, InternalSerializeQueryArgs, SerializeQueryArgs } from './defaultSerializeQueryArgs';
import {
  AssertEntityTypes,
  DefinitionType,
  EndpointBuilder,
  EndpointDefinitions,
  isMutationDefinition,
  isQueryDefinition,
} from './endpointDefinitions';
import { assertCast } from './tsHelpers';
import { capitalize, IS_DEV } from './utils';
export { ApiProvider } from './ApiProvider';
export { QueryStatus } from './core/apiState';
export type { Api, ApiWithInjectedEndpoints, BaseQueryEnhancer, BaseQueryFn } from './apiTypes';
export { fetchBaseQuery } from './fetchBaseQuery';
export type { FetchBaseQueryError, FetchArgs } from './fetchBaseQuery';
export { retry } from './retry';
export { setupListeners } from './setupListeners';

export interface CreateApiOptions<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string = 'api',
  EntityTypes extends string = never
> {
  baseQuery: BaseQuery;
  entityTypes?: readonly EntityTypes[];
  reducerPath?: ReducerPath;
  serializeQueryArgs?: SerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  endpoints(build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>): Definitions;
  keepUnusedDataFor?: number;
  refetchOnMountOrArgChange?: boolean | number;
  refetchOnFocus?: boolean;
  refetchOnReconnect?: boolean;
}

export function createApi<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string = 'api',
  EntityTypes extends string = never
>(
  options: CreateApiOptions<BaseQuery, Definitions, ReducerPath, EntityTypes>
): Api<BaseQuery, Definitions, ReducerPath, EntityTypes> {
  const optionsWithDefaults = {
    entityTypes: [],
    reducerPath: 'api' as ReducerPath,
    serializeQueryArgs: defaultSerializeQueryArgs,
    keepUnusedDataFor: 60,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    ...options,
  };

  const endpointDefinitions: EndpointDefinitions = {};

  const api: Api<BaseQuery, {}, ReducerPath, EntityTypes, never> = {
    injectEndpoints,
  };

  api.usePrefetch = usePrefetch;

  function injectEndpoints(inject: Parameters<typeof api.injectEndpoints>[0]) {
    const evaluatedEndpoints = inject.endpoints({
      query: (x) => ({ ...x, type: DefinitionType.query } as any),
      mutation: (x) => ({ ...x, type: DefinitionType.mutation } as any),
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
        const { useQuery, useQueryState, useQuerySubscription } = buildQueryHooks(endpoint);
        api.endpoints[endpoint] = {
          useQuery,
          useQueryState,
          useQuerySubscription,
        };
        (api as any)[`use${capitalize(endpoint)}Query`] = useQuery;
      } else if (isMutationDefinition(definition)) {
        const useMutation = buildMutationHook(endpoint);
        api.endpoints[endpoint] = {
          useMutation,
        };
        (api as any)[`use${capitalize(endpoint)}Mutation`] = useMutation;
      }
    }

    return api as any;
  }

  return api.injectEndpoints({ endpoints });
}

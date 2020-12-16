import { buildHooks, MutationHooks, QueryHooks } from './buildHooks';
import {
  EndpointDefinitions,
  QueryDefinition,
  MutationDefinition,
  isQueryDefinition,
  isMutationDefinition,
} from '../endpointDefinitions';
import { TS41Hooks } from '../ts41Types';
import './buildSelectors';
import { Api, Module } from '../apiTypes';
import { capitalize } from '../utils';
import { safeAssign } from '../tsHelpers';

const reduxHooksModuleName = Symbol();
export type ReduxHooksModule = typeof reduxHooksModuleName;

declare module '../apiTypes' {
  export interface ApiModules<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    BaseQuery extends BaseQueryFn,
    Definitions extends EndpointDefinitions,
    ReducerPath extends string,
    EntityTypes extends string
  > {
    [reduxHooksModuleName]: {
      endpoints: {
        [K in keyof Definitions]: Definitions[K] extends QueryDefinition<any, any, any, any, any>
          ? QueryHooks<Definitions[K]>
          : Definitions[K] extends MutationDefinition<any, any, any, any, any>
          ? MutationHooks<Definitions[K]>
          : never;
      };
    } & TS41Hooks<Definitions>;
  }
}

export const coreModule: Module<ReduxHooksModule> = (api, options, context) => {
  const { buildQueryHooks, buildMutationHook, usePrefetch } = buildHooks({ api });
  safeAssign(api, { usePrefetch });

  return {
    name: reduxHooksModuleName,
    injectEndpoint(endpoint, definition) {
      const anyApi = (api as any) as Api<any, Record<string, any>, string, string, ReduxHooksModule>;
      if (isQueryDefinition(definition)) {
        const { useQuery, useQueryState, useQuerySubscription } = buildQueryHooks(endpoint);
        safeAssign(anyApi.endpoints[endpoint], {
          useQuery,
          useQueryState,
          useQuerySubscription,
        });
        (api as any)[`use${capitalize(endpoint)}Query`] = useQuery;
      } else if (isMutationDefinition(definition)) {
        const useMutation = buildMutationHook(endpoint);
        safeAssign(anyApi.endpoints[endpoint], {
          useMutation,
        });
        (api as any)[`use${capitalize(endpoint)}Mutation`] = useMutation;
      }
    },
  };
};

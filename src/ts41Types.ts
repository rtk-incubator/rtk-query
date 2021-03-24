import { MutationHook, UseLazyQuery, UseQuery } from './react-hooks/buildHooks';
import { DefinitionType, EndpointDefinitions } from './endpointDefinitions';

export type TS41Hooks<Definitions extends EndpointDefinitions> = keyof Definitions extends infer Keys
  ? Keys extends string
    ? Definitions[Keys] extends { type: DefinitionType.query }
      ? {
          [K in Keys as `use${Capitalize<K>}Query`]: UseQuery<Definitions[K] & { type: DefinitionType.query }>;
        } &
          {
            [K in Keys as `useLazy${Capitalize<K>}Query`]: UseLazyQuery<
              Definitions[K] & { type: DefinitionType.query }
            >;
          }
      : Definitions[Keys] extends { type: DefinitionType.mutation }
      ? {
          [K in Keys as `use${Capitalize<K>}Mutation`]: MutationHook<
            Definitions[K] & { type: DefinitionType.mutation }
          >;
        }
      : never
    : never
  : never;

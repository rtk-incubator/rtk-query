/**
 * Note: this file should import all other files for type discovery and declaration merging
 */
import { QueryApi } from './core/buildThunks';
import { AnyAction, ThunkAction } from '@reduxjs/toolkit';
import { PrefetchOptions } from './redux-hooks/buildHooks';
import { EndpointDefinitions, EndpointBuilder, EndpointDefinition } from './endpointDefinitions';
import { UnionToIntersection, Id } from './tsHelpers';
import './buildSelectors';
import { SliceActions } from './core/buildSlice';
import { onFocus, onFocusLost, onOffline, onOnline } from './setupListeners';
import { CoreModule } from './core';
import { CreateApiOptions } from './';

type UnwrapPromise<T> = T extends PromiseLike<infer V> ? V : T;
type MaybePromise<T> = T | PromiseLike<T>;

export type BaseQueryFn<Args = any, Result = unknown, Error = unknown, DefinitionExtraOptions = {}> = (
  args: Args,
  api: QueryApi,
  extraOptions: DefinitionExtraOptions
) => MaybePromise<{ error: Error; data?: undefined } | { error?: undefined; data?: Result }>;

export type BaseQueryEnhancer<AdditionalArgs = unknown, AdditionalDefinitionExtraOptions = unknown, Config = void> = <
  BaseQuery extends BaseQueryFn
>(
  baseQuery: BaseQuery,
  config: Config
) => BaseQueryFn<
  BaseQueryArg<BaseQuery> & AdditionalArgs,
  BaseQueryResult<BaseQuery>,
  BaseQueryError<BaseQuery>,
  BaseQueryExtraOptions<BaseQuery> & AdditionalDefinitionExtraOptions
>;

export type BaseQueryResult<BaseQuery extends BaseQueryFn> = Exclude<
  UnwrapPromise<ReturnType<BaseQuery>>,
  { data: undefined }
>['data'];

export type BaseQueryError<BaseQuery extends BaseQueryFn> = Exclude<
  UnwrapPromise<ReturnType<BaseQuery>>,
  { error: undefined }
>['error'];

export type BaseQueryArg<T extends (arg: any, ...args: any[]) => any> = T extends (arg: infer A, ...args: any[]) => any
  ? A
  : any;

export type BaseQueryExtraOptions<BaseQuery extends BaseQueryFn> = Parameters<BaseQuery>[2];

export interface ApiModules<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  BaseQuery extends BaseQueryFn,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Definitions extends EndpointDefinitions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ReducerPath extends string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  EntityTypes extends string
> {}

export type ModuleName = keyof ApiModules<any, any, any, any>;

export type Module<Name extends ModuleName> = <
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string
>(
  api: Api<BaseQuery, EndpointDefinitions, ReducerPath, EntityTypes, ModuleName>,
  options: Required<CreateApiOptions<BaseQuery, Definitions, ReducerPath, EntityTypes>>,
  context: {
    endpointDefinitions: Definitions;
  }
) => {
  name: Name;
  injectEndpoint(endpoint: string, definition: EndpointDefinition<any, any, any, any>): void;
};

export type Api<
  BaseQuery extends BaseQueryFn,
  Definitions extends EndpointDefinitions,
  ReducerPath extends string,
  EntityTypes extends string,
  Enhancers extends ModuleName = CoreModule
> = Id<
  {
    injectEndpoints<NewDefinitions extends EndpointDefinitions>(_: {
      endpoints: (build: EndpointBuilder<BaseQuery, EntityTypes, ReducerPath>) => NewDefinitions;
      overrideExisting?: boolean;
    }): Api<BaseQuery, Definitions & NewDefinitions, ReducerPath, EntityTypes, Enhancers>;
  } & Id<UnionToIntersection<ApiModules<BaseQuery, Definitions, ReducerPath, EntityTypes>[Enhancers]>>
>;

export type ApiWithInjectedEndpoints<
  ApiDefinition extends Api<any, any, any, any>,
  Injections extends ApiDefinition extends Api<infer B, any, infer R, infer E>
    ? [Api<B, any, R, E>, ...Api<B, any, R, E>[]]
    : never
> = Omit<ApiDefinition, 'endpoints'> &
  Omit<Injections, 'endpoints'> & {
    endpoints: ApiDefinition['endpoints'] & Partial<UnionToIntersection<Injections[number]['endpoints']>>;
  };

export type InternalActions = SliceActions & {
  prefetchThunk: (endpointName: any, arg: any, options: PrefetchOptions) => ThunkAction<void, any, any, AnyAction>;
} & {
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnReconnect-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onOnline: typeof onOnline;
  onOffline: typeof onOffline;
  /**
   * Will cause the RTK Query middleware to trigger any refetchOnFocus-related behavior
   * @link https://rtk-query-docs.netlify.app/api/setupListeners
   */
  onFocus: typeof onFocus;
  onFocusLost: typeof onFocusLost;
};

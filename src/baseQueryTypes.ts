import { ThunkDispatch } from '@reduxjs/toolkit';
import { MaybePromise, UnwrapPromise } from './tsHelpers';

export interface BaseQueryApi {
  signal?: AbortSignal;
  dispatch: ThunkDispatch<any, any, any>;
  getState: () => unknown;
}

export type QueryReturnValue<T = unknown, E = unknown> =
  | {
      error: E;
      data?: undefined;
    }
  | {
      error?: undefined;
      data: T;
    };

export type BaseQueryFn<Args = any, Result = unknown, Error = unknown, DefinitionExtraOptions = {}> = (
  args: Args,
  api: BaseQueryApi,
  extraOptions: DefinitionExtraOptions
) => MaybePromise<QueryReturnValue<Result, Error>>;

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

export type BaseQueryResult<BaseQuery extends BaseQueryFn> = UnwrapPromise<
  ReturnType<BaseQuery>
> extends infer Unwrapped
  ? Unwrapped extends { data: any }
    ? Unwrapped['data']
    : never
  : never;

export type BaseQueryError<BaseQuery extends BaseQueryFn> = UnwrapPromise<ReturnType<BaseQuery>> extends infer Unwrapped
  ? Unwrapped extends { error: any }
    ? Unwrapped['error']
    : never
  : never;

export type BaseQueryArg<T extends (arg: any, ...args: any[]) => any> = T extends (arg: infer A, ...args: any[]) => any
  ? A
  : any;

export type BaseQueryExtraOptions<BaseQuery extends BaseQueryFn> = Parameters<BaseQuery>[2];

import { BaseQueryFn } from './baseQueryTypes';

const NEVER = Symbol();
export type NEVER = typeof NEVER;

/**
 * Creates a "dummy" BaseQuery to be used if your api *only* uses the `queryFn` definition syntax.
 * This also allows you to specify a specific error type to be shared by all your `queryFn` definitions.
 */
export function dummyBaseQuery<ErrorType>(): BaseQueryFn<void, NEVER, ErrorType, {}> {
  return function () {
    throw new Error(
      'When using `dummyBaseQuery`, all queries & mutations have to use the `queryFn` definition syntax.'
    );
  };
}

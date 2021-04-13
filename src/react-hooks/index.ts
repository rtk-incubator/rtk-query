import { coreModule } from '../core/module';
import { buildCreateApi } from '../createApi';
import { reactHooksModule } from './module';

/**
 * Creates a service to use in your application. Contains both the core and react-hooks modules.
 *
 * @link https://rtk-query-docs.netlify.app/api/createApi
 *
 * @param opts.baseQuery
 * The base query used by each endpoint if no `queryFn` option is specified.
 * @param opts.entityTypes
 * An array of string entity type names. Specifying entity types is optional, but you should define them so that they can be used for caching and invalidation.
 * @param opts.reducerPath
 * The `reducerPath` is a _unique_ key that your service will be mounted to in your store. If you call `createApi` more than once in your application, you will need to provide a unique value each time. Defaults to `api`.
 * @param opts.serializeQueryArgs
 * Accepts a custom function if you have a need to change the creation of cache keys for any reason.
 * @param opts.endpoints
 * A set of operations to perform against your server defined as an object using the builder syntax.
 * @param opts.keepUnusedDataFor
 * Defaults to 60 (this value is in seconds). This is how long RTK Query will keep your data cached for after the last component unsubscribes. For example, if you query an endpoint, then unmount the component, then mount another component that makes the same request within the given time frame, the most recent value will be served from the cache.
 * @param opts.refetchOnMountOrArgChange
 * Defaults to `false`. This setting allows you to control whether RTK Query will only serve a cached result, or if it should `refetch` when set to `true` or if an adequate amount of time has passed since the last successful query result.
 * - `false` - Will not cause a query to be performed _unless_ it does not exist yet.
 * - `true` - Will always refetch when a new subscriber to a query is added. Behaves the same as calling the `refetch` callback or passing `forceRefetch: true` in the action creator.
 * - `number` - **Value is in seconds**. If a number is provided and there is an existing query in the cache, it will compare the current time vs the last fulfilled timestamp, and only refetch if enough time has elapsed.
 *
 * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
 * @param opts.refetchOnFocus
 * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after the application window regains focus.
 *
 * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
 * @param opts.refetchOnReconnect
 * Defaults to `false`. This setting allows you to control whether RTK Query will try to refetch all subscribed queries after regaining a network connection.
 *
 * If you specify this option alongside `skip: true`, this **will not be evaluated** until `skip` is false.
 *
 * @returns Object containing the following:
 * - `reducerPath`
 * - `reducer` - A standard redux reducer that enables core functionality. Make sure it's included in your store.
 * - `middleware` - This is a standard redux middleware and is responsible for things like polling, garbage collection and a handful of other things. Make sure it's included in your store.
 * - `endpoints` - Endpoints based on the input endpoints provided to `createApi`, containing `select`, `hooks` and `action matchers`.
 * - `internalActions` - Internal actions not part of the public API. Note: These are subject to change at any given time.
 * - `util` - `prefetchThunk`, `patchQueryResult`, `updateQueryResult`
 * - `injectEndpoints` - A function to inject the endpoints into the original API, but also give you that same API with correct types for these endpoints back. Useful with code-splitting.
 * - `enhanceEndpoints` - A function to enhance a generated API with additional information. Useful with code-generation.
 * - `usePrefetch` - A hook that accepts a string endpoint name, and provides a callback that when called, pre-fetches the data for that endpoint.
 * - `...generatedHooks` - Auto-generated `query` and `mutation` hooks intended to be used as the core method for components to interface with the API.
 */
const createApi = buildCreateApi(coreModule(), reactHooksModule());

export { createApi, reactHooksModule };

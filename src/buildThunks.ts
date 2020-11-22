import { Api } from '.';
import { InternalRootState, QueryKeys, QueryStatus, QuerySubstateIdentifier } from './apiState';
import { StartQueryActionCreatorOptions } from './buildActionMaps';
import { EndpointDefinitions } from './endpointDefinitions';

export interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier, StartQueryActionCreatorOptions {
  originalArgs: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  startedTimeStamp: number;
}

export interface MutationThunkArg<InternalQueryArgs> {
  originalArgs: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  track?: boolean;
  startedTimeStamp: number;
}

export interface ThunkResult {
  fulfilledTimeStamp: number;
  result: unknown;
}

export interface QueryApi {
  signal: AbortSignal;
  rejectWithValue(value: any): unknown;
}

function defaultTransformResponse(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue;
}


export function buildThunks<BaseQuery extends (args: any, api: QueryApi) => any, ReducerPath extends string>({
  reducerPath,
  baseQuery,
  endpointDefinitions,
  api,
}: {
  baseQuery: BaseQuery;
  reducerPath: ReducerPath;
  endpointDefinitions: EndpointDefinitions;
  api: Api<BaseQuery, EndpointDefinitions, ReducerPath, string>;
}) {
  type InternalQueryArgs = BaseQueryArg<BaseQuery>;

  const queryThunk = createAsyncThunk<
    ThunkResult,
    QueryThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(
    `${reducerPath}/executeQuery`,
    async (arg, { signal, rejectWithValue }) => {
      const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
      return {
        fulfilledTimeStamp: Date.now(),
        result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result),
      };
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerPath]?.queries?.[arg.queryCacheKey];
        return !(requestState?.status === 'pending' || (requestState?.status === 'fulfilled' && !arg.forceRefetch));
      },
      dispatchConditionRejection: true,
    }
  );

  const mutationThunk = createAsyncThunk<
    ThunkResult,
    MutationThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerPath> }
  >(`${reducerPath}/executeMutation`, async (arg, { signal, rejectWithValue }) => {
    const result = await baseQuery(arg.internalQueryArgs, { signal, rejectWithValue });
    return {
      fulfilledTimeStamp: Date.now(),
      result: (endpointDefinitions[arg.endpoint].transformResponse ?? defaultTransformResponse)(result),
    };
  });

  return { queryThunk, mutationThunk };
}

import { createAsyncThunk } from '@reduxjs/toolkit';
import { InternalRootState, QuerySubstateIdentifier } from './apiState';
import { StartQueryActionCreatorOptions } from './buildActionMaps';
import { EndpointDefinitions } from './endpointDefinitions';

export interface QueryThunkArg<InternalQueryArgs> extends QuerySubstateIdentifier, StartQueryActionCreatorOptions {
  endpoint: string;
  // arg: unknown;
  internalQueryArgs: InternalQueryArgs;
}

export interface MutationThunkArg<InternalQueryArgs> {
  arg: unknown;
  endpoint: string;
  internalQueryArgs: InternalQueryArgs;
  track?: boolean;
}

export interface QueryApi {
  signal: AbortSignal;
  rejectWithValue(value: any): unknown;
}

function defaultPostProcess(baseQueryReturnValue: unknown) {
  return baseQueryReturnValue;
}

export function buildThunks<InternalQueryArgs, ReducerKey extends string>({
  reducerKey,
  baseQuery,
  endpointDefinitions,
}: {
  baseQuery(args: InternalQueryArgs, api: QueryApi): any;
  reducerKey: ReducerKey;
  endpointDefinitions: EndpointDefinitions;
}) {
  const queryThunk = createAsyncThunk<
    unknown,
    QueryThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerKey> }
  >(
    `${reducerKey}/executeQuery`,
    (arg, { signal, rejectWithValue }) => {
      return baseQuery(arg.internalQueryArgs, { signal, rejectWithValue }).then(
        endpointDefinitions[arg.endpoint].postProcess ?? defaultPostProcess
      );
    },
    {
      condition(arg, { getState }) {
        let requestState = getState()[reducerKey]?.queries?.[arg.queryCacheKey];
        return !(requestState?.status === 'pending' || (requestState?.status === 'fulfilled' && !arg.forceRefetch));
      },
      dispatchConditionRejection: true,
    }
  );

  const mutationThunk = createAsyncThunk<
    unknown,
    MutationThunkArg<InternalQueryArgs>,
    { state: InternalRootState<ReducerKey> }
  >(`${reducerKey}/executeMutation`, (arg, { signal, rejectWithValue }) => {
    return baseQuery(arg.internalQueryArgs, { signal, rejectWithValue }).then(
      endpointDefinitions[arg.endpoint].postProcess ?? defaultPostProcess
    );
  });

  return { queryThunk, mutationThunk };
}

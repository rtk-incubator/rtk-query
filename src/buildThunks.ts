import { AnyAction, createAsyncThunk, ThunkAction } from '@reduxjs/toolkit';
import { Api, InternalSerializeQueryArgs } from '.';
import { InternalRootState, QueryKeys, QueryStatus, QuerySubstateIdentifier } from './apiState';
import { StartQueryActionCreatorOptions } from './buildActionMaps';
import { EndpointDefinitions, QueryArgFrom, ResultTypeFrom } from './endpointDefinitions';
import { BaseQueryArg } from './tsHelpers';
import { Draft } from '@reduxjs/toolkit';
import { Patch, isDraftable, produceWithPatches } from 'immer';
import { QueryResultSelector } from './buildSelectors';

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

type MaybeDrafted<T> = T | Draft<T>;
type Recipe<T> = (data: MaybeDrafted<T>) => undefined | MaybeDrafted<T>;

export type PatchQueryResultThunk<Definitions extends EndpointDefinitions, State> = <
  EndpointName extends QueryKeys<Definitions>
>(
  endpointName: EndpointName,
  args: QueryArgFrom<Definitions[EndpointName]>,
  patches: Patch[]
) => ThunkAction<void, State, unknown, AnyAction>;

export type UpdateQueryResultThunk<Definitions extends EndpointDefinitions, State> = <
  EndpointName extends QueryKeys<Definitions>
>(
  endpointName: EndpointName,
  args: QueryArgFrom<Definitions[EndpointName]>,
  updateRecicpe: Recipe<ResultTypeFrom<Definitions[EndpointName]>>,
  insertRecipe?: () => ResultTypeFrom<Definitions[EndpointName]>
) => ThunkAction<PatchCollection, State, unknown, AnyAction>;

type PatchCollection = { patches: Patch[]; inversePatches: Patch[] };

export function buildThunks<BaseQuery extends (args: any, api: QueryApi) => any, ReducerPath extends string>({
  reducerPath,
  baseQuery,
  endpointDefinitions,
  serializeQueryArgs,
  api,
}: {
  baseQuery: BaseQuery;
  reducerPath: ReducerPath;
  endpointDefinitions: EndpointDefinitions;
  serializeQueryArgs: InternalSerializeQueryArgs<BaseQueryArg<BaseQuery>>;
  api: Api<BaseQuery, EndpointDefinitions, ReducerPath, string>;
}) {
  type InternalQueryArgs = BaseQueryArg<BaseQuery>;
  type State = InternalRootState<ReducerPath>;

  const patchQueryResult: PatchQueryResultThunk<EndpointDefinitions, State> = (endpointName, args, patches) => (
    dispatch
  ) => {
    dispatch(
      api.internalActions.queryResultPatched({ queryCacheKey: serializeQueryArgs(args, endpointName), patches })
    );
  };

  const updateQueryResult: UpdateQueryResultThunk<EndpointDefinitions, State> = (
    endpointName,
    args,
    updateRecicpe,
    insertRecipe
  ) => (dispatch, getState) => {
    const currentState = (api.selectors[endpointName] as QueryResultSelector<any, any>)(args)(getState());
    let ret: PatchCollection = { patches: [], inversePatches: [] };
    if (currentState.status === QueryStatus.uninitialized) {
      return ret;
    }
    if (currentState.data) {
      if (isDraftable(currentState.data)) {
        const [, patches, inversePatches] = produceWithPatches(currentState.data, updateRecicpe);
        ret.patches.push(...patches);
        ret.inversePatches.push(...inversePatches);
      } else {
        const value = updateRecicpe(currentState.data);
        ret.patches.push({ op: 'replace', path: [], value });
        ret.inversePatches.push({ op: 'replace', path: [], value: currentState.data });
      }
    } else {
      if (insertRecipe) {
        const value = insertRecipe();
        ret.patches.push({ op: 'replace', path: [], value });
        ret.inversePatches.push({ op: 'replace', path: [], value: currentState.data });
      }
    }

    dispatch(patchQueryResult(endpointName, args, ret.patches));

    return ret;
  };

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

  return { queryThunk, mutationThunk, updateQueryResult, patchQueryResult };
}

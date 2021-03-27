import { createApi } from '@rtk-incubator/rtk-query/react';
import { actionsReducer, matchSequence, setupApiStore, waitMs } from './helpers';

const baseQuery = (args?: any) => ({ data: args });
const api = createApi({
  baseQuery,
  entityTypes: ['Banana', 'Bread'],
  endpoints: (build) => ({
    getBanana: build.query<unknown, number>({
      query(id) {
        return { url: `banana/${id}` };
      },
      provides: ['Banana'],
    }),
    getBread: build.query<unknown, number>({
      query(id) {
        return { url: `bread/${id}` };
      },
      provides: ['Bread'],
    }),
  }),
});
const { getBanana, getBread } = api.endpoints;

const storeRef = setupApiStore(api, {
  ...actionsReducer,
});

it('invalidates the specified entities', async () => {
  await storeRef.store.dispatch(getBanana.initiate(1));
  matchSequence(storeRef.store.getState().actions, getBanana.matchPending, getBanana.matchFulfilled);

  await storeRef.store.dispatch(api.internalActions.invalidateEntities(['Banana', 'Bread']));

  // Slight pause to let the middleware run and such
  await waitMs(20);

  const firstSequence = [
    getBanana.matchPending,
    getBanana.matchFulfilled,
    api.internalActions.invalidateEntities.match,
    getBanana.matchPending,
    getBanana.matchFulfilled,
  ];
  matchSequence(storeRef.store.getState().actions, ...firstSequence);

  await storeRef.store.dispatch(getBread.initiate(1));
  await storeRef.store.dispatch(api.internalActions.invalidateEntities([{ type: 'Bread' }]));

  await waitMs(20);

  matchSequence(
    storeRef.store.getState().actions,
    ...firstSequence,
    getBread.matchPending,
    getBread.matchFulfilled,
    api.internalActions.invalidateEntities.match,
    getBread.matchPending,
    getBread.matchFulfilled
  );
});

describe.skip('TS only tests', () => {
  it('should allow for an array of string EntityTypes', () => {
    api.internalActions.invalidateEntities(['Banana', 'Bread']);
  });
  it('should allow for an array of full EntityTypes descriptions', () => {
    api.internalActions.invalidateEntities([{ type: 'Banana' }, { type: 'Bread', id: 1 }]);
  });

  it('should allow for a mix of full descriptions as well as plain strings', () => {
    api.internalActions.invalidateEntities(['Banana', { type: 'Bread', id: 1 }]);
  });
  it('should error when using non-existing EntityTypes', () => {
    // @ts-expect-error
    api.internalActions.invalidateEntities(['Missing Entity']);
  });
  it('should error when using non-existing EntityTypes in the full format', () => {
    // @ts-expect-error
    api.internalActions.invalidateEntities([{ type: 'Missing' }]);
  });
});

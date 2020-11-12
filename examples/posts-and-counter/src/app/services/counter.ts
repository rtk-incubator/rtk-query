import { createApi, fetchBaseQuery } from '@rtk-incubator/simple-query/dist';

interface CountResponse {
  count: number;
}

export const counterApi = createApi({
  reducerKey: 'counterApi',
  baseQuery: fetchBaseQuery(),
  entityTypes: ['Counter'],
  endpoints: (build) => ({
    getCount: build.query<CountResponse, void>({
      query: () => 'count',
      provides: [{ type: 'Counter' }],
    }),
    incrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          url: `increment`,
          method: 'PUT',
          body: JSON.stringify({ amount }),
        };
      },
      invalidates: [{ type: 'Counter' }],
    }),
    decrementCount: build.mutation<CountResponse, number>({
      query(amount) {
        return {
          url: `decrement`,
          method: 'PUT',
          body: JSON.stringify({ amount }),
        };
      },
      invalidates: [{ type: 'Counter' }],
    }),
  }),
});

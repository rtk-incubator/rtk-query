import { createApi, fetchBaseQuery } from '@rtk-incubator/simple-query/dist';

interface CountResponse {
    count: number;
}

export const counterApi = createApi({
    reducerPath: 'counterApi',
    baseQuery: fetchBaseQuery({
        baseUrl: '/',
    }),
    entityTypes: ['Counter'],
    endpoints: (build) => ({
        getAbsoluteTest: build.query<any, void>({
            query: () => ({
                url: 'https://mocked.data',
                params: {
                    hello: 'friend',
                },
            }),
        }),
        getCount: build.query<CountResponse, void>({
            query: () => ({
                url: `/count?=${'whydothis'}`,
                params: {
                    test: 'param',
                    additional: 1,
                },
            }),
            provides: [{ type: 'Counter' }],
        }),
        incrementCount: build.mutation<CountResponse, number>({
            query: (amount) => ({
                url: `/increment`,
                method: 'PUT',
                body: { amount },
            }),
            invalidates: [{ type: 'Counter' }],
        }),
        decrementCount: build.mutation<CountResponse, number>({
            query: (amount) => ({
                url: `decrement`,
                method: 'PUT',
                body: { amount },
            }),
            invalidates: [{ type: 'Counter' }],
        }),
    }),
});

# Basic Usage

Step 1: Create your api:

```ts
import {createApi} from '@rtk-incubator/simple-query'
import {ListResponse, User} from './types'

export const api = createApi({
  reducerPath: 'testApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://reqres.in/api' }),
  entityTypes: [], // TODO: make entityTypes optional
  endpoints: (builder) => ({
    listUsers: builder.query<ListResponse<User>, number | void>({
      query: () => 'users',
    }),
    updateUser: builder.mutation<User, { id: number; patch: Partial<User> }>({
      query({ id, patch }) {
        return {
          url: `users/${id}`,
          method: 'PATCH',
          body: patch,
        };
      },
    }),
  })
);
```

Step 2: Use it in your store defintion

```ts
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
const store = configureStore({
  reducer: {
    testApi: api.reducer, // "testApi" here has to match the `reducerPath` option for `createApi`
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
});
```

Step 3: use the hooks in your React components

```tsx
import {api} from './api'
import {User} from './types'

function UsersList() {
    const { status, data } = api.hooks.getUsers.useQuery();
    if (status === 'rejected') {
        return <>An error occured!</>
    }
    if (status !== 'fulfilled') {
        return <>Loading!</>
    }
    return {data.data.map(user => <UserDetails key={user.id} user={user} />)}
}

function User({user}: {user: User}) {
const [updateUser, updateResult] = api.hooks.updateUser.useMutation();

  return (
    <div>
      <p>
        first name: {user.first_name} <br />
        last name: {user.last_name} <br />
      </p>
      <button
        disabled={updateResult.status === 'pending'}
        onClick={() => updateUser({ id, patch: { first_name: 'Alice' } })}
      >
        set first name to Alice
      </button>
    </div>
  );
}
```

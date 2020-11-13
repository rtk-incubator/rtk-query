<script lang="ts">
    import { onMount } from 'svelte';
    import { QueryStatus } from '@rtk-incubator/simple-query/dist';
    import { counterApi } from './services/counter';
    import { store } from './store';
    import Counter from './Counter.svelte'

    let pollingInterval = 0;
    let counters = [] as number[];
    let queryRef;

    const pollingOptions = [
        { value: 0, label: '0 - off' },
        { value: 1000, label: '1s' },
        { value: 5000, label: '5s' },
        { value: 10000, label: '10s' },
        { value: 60000, label: '1m' }
    ]

    const { incrementCount, decrementCount } = counterApi.mutationActions;

    // Whenever the polling interval changes, update the reference
    $: queryRef?.updateSubscriptionOptions({ pollingInterval })

    $: ({ data, status, error } = counterApi.selectors.query.getCount()($store));

    $: loading = status === QueryStatus.pending;

    let getCount = () => {};

    onMount(async () => {
        queryRef = ({ refetch: getCount } = store.dispatch(counterApi.queryActions.getCount()));
    });
</script>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }

    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }

    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>

<main>
    <h1>{data?.count || 0}</h1>
    <button on:click={() => store.dispatch(incrementCount(1, { track: false }))}>Increase</button>
    <button on:click={() => store.dispatch(decrementCount(1, { track: false }))}>Decrease</button>
    <button on:click={getCount} disabled={loading}>Refetch count</button>
    <button on:click={() => queryRef.updateSubscription({ pollingInterval })}>Update Polling</button>
    <select bind:value={pollingInterval}>
        {#each pollingOptions as { value, label }}
        <option {value}>{label}</option>
        {/each}
    </select>
    <hr />
    <h3>Custom counters!</h3><button on:click={() => { counters = [...counters, counters.length + 1] }}>Add counter</button>

    {#each counters as id}
		<Counter {id} />
	{/each}
</main>

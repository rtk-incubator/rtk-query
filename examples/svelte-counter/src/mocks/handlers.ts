import { rest } from 'msw';

// high tech in-memory storage
let count = 0;

export const handlers = [
    rest.get('/error', (req, res, ctx) => {
        return res(
            ctx.status(500),
            ctx.json({
                message: 'what is this doing!',
                data: [{ some: 'key' }],
            }),
        );
    }),
    rest.get('/network-error', (req, res, ctx) => {
        return res.networkError('Fake network error');
    }),
    rest.get('/mismatched-header-error', (req, res, ctx) => {
        return res(ctx.text('oh hello there'), ctx.set('Content-Type', 'application/hal+banana'));
    }),
    rest.get('https://mocked.data', (req, res, ctx) => {
        return res(
            ctx.json({
                great: 'success',
            }),
        );
    }),
    rest.put<{ amount: number }>('/increment', (req, res, ctx) => {
        const { amount } = req.body;
        count = count += amount;

        return res(ctx.json({ count }));
    }),
    rest.put<{ amount: number }>('/decrement', (req, res, ctx) => {
        const { amount } = req.body;
        count = count -= amount;

        return res(ctx.json({ count }));
    }),
    rest.get('/count', (req, res, ctx) => {
        return res(ctx.json({ count }));
    }),
];

module.exports = {
  docs: [
    {
      type: 'category',
      label: 'Introduction',
      collapsed: true,
      items: ['introduction/getting-started', 'introduction/comparison', 'introduction/video-overview'],
    },
    {
      type: 'category',
      label: 'Concepts',
      collapsed: true,
      items: [
        'concepts/queries',
        'concepts/mutations',
        'concepts/error-handling',
        'concepts/conditional-fetching',
        'concepts/pagination',
        'concepts/polling',
        'concepts/prefetching',
        'concepts/optimistic-updates',
        'concepts/code-splitting',
        'concepts/code-generation',
        'concepts/customizing-create-api',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Exports',
          collapsed: false,
          items: [
            'api/exports/createApi',
            'api/exports/fetchBaseQuery',
            'api/exports/ApiProvider',
            'api/exports/setupListeners',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: [
        'examples/examples-overview',
        'examples/authentication',
        'examples/react-hooks',
        'examples/react-class-components',
        'examples/react-with-graphql',
        'examples/react-optimistic-updates',
        'examples/svelte',
      ],
    },
  ],
};

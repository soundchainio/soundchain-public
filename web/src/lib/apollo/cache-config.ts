import { InMemoryCacheConfig } from '@apollo/client';

export const cacheConfig: InMemoryCacheConfig = {
  typePolicies: {
    Query: {
      fields: {
        post(_, { args, toReference }) {
          return toReference({
            __typename: 'Post',
            id: args?.id,
          });
        },
        comment(_, { args, toReference }) {
          return toReference({
            __typename: 'Comment',
            id: args?.id,
          });
        },
        message(_, { args, toReference }) {
          return toReference({
            __typename: 'Message',
            id: args?.id,
          });
        },
        conversation: {
          keyArgs: ['recipient'],
          merge(existing = { nodes: [] }, { pageInfo, nodes }, { args }) {
            if (!args?.page) {
              return {
                nodes: [...existing.nodes, ...nodes],
                pageInfo,
              };
            }
            return {
              nodes: [...nodes, ...existing.nodes],
              pageInfo,
            };
          },
        },
      },
    },
  },
};

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
      },
    },
  },
};

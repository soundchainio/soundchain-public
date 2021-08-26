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
        feed: {
          merge(existing, incoming, { readField }) {
            const posts = existing ? { ...existing.posts } : {};
            incoming.posts.forEach(post => {
              posts[readField('id', post)] = post;
            });
            return {
              cursor: incoming.pageInfo.endCursor,
              posts,
            };
          },

          read(existing) {
            if (existing) {
              return {
                cursor: existing.pageInfo.endCursor,
                posts: Object.values(existing.posts),
              };
            }
          },
        },
      },
    },
  },
};

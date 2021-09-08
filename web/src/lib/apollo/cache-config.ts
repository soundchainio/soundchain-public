import { InMemoryCacheConfig } from '@apollo/client';
import { FeedConnection, FeedItem } from 'lib/graphql';

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
        chatHistory: {
          keyArgs: ['profileId'],
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
        comments: {
          keyArgs: ['postId'],
          merge(existing = { nodes: [] }, { pageInfo, nodes }, { args }) {
            if (!existing.pageInfo) {
              return {
                nodes,
                pageInfo,
              };
            }

            if (args?.page.before) {
              return {
                nodes: [...nodes, ...existing.nodes],
                pageInfo: {
                  ...existing.pageInfo,
                  startCursor: pageInfo.startCursor,
                  hasPreviousPage: pageInfo.hasPreviousPage,
                },
              };
            }

            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo: { ...existing.pageInfo, endCursor: pageInfo.endCursor, hasNextPage: pageInfo.hasNextPage },
            };
          },
        },
        feed: {
          keyArgs: false,
          merge(existing, incoming, { readField }): FeedConnection {
            const nodes = existing ? { ...existing.nodes } : {};

            incoming.nodes.forEach((node: FeedItem) => {
              const key = readField('id', node);
              nodes[key as string] = node;
            });

            return {
              pageInfo: {
                ...incoming.pageInfo,
              },
              nodes,
            };
          },
          read(existing): FeedConnection | void {
            if (existing) {
              return {
                pageInfo: { ...existing.pageInfo },
                nodes: Object.values(existing.nodes),
              };
            }
          },
        },
      },
    },
  },
};

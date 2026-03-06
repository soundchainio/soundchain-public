/* eslint-disable @typescript-eslint/no-explicit-any */
import { InMemoryCacheConfig } from '@apollo/client'
import {
  ChatConnection,
  FeedConnection,
  FeedItem,
  Follow,
  FollowConnection,
  FollowedArtistsConnection,
  ListingItemConnection,
  PolygonscanResult,
  Post,
  PostConnection,
  TrackConnection,
} from 'lib/graphql'

const filterNodeDuplicates = (existingNodes: any, incomingNodes: any, pageInfo: any) => {
  return {
    nodes: [
      ...existingNodes,
      ...incomingNodes.filter(
        (incomingNode: any) => existingNodes.filter((existingNode: any) => existingNode.__ref === incomingNode.__ref).length === 0,
      ),
    ],
    pageInfo,
  }
}

export const cacheConfig: InMemoryCacheConfig = {
  typePolicies: {
    Query: {
      fields: {
        post(_, { args, toReference }) {
          return toReference({
            __typename: 'Post',
            id: args?.id,
          })
        },
        comment(_, { args, toReference }) {
          return toReference({
            __typename: 'Comment',
            id: args?.id,
          })
        },
        message(_, { args, toReference }) {
          return toReference({
            __typename: 'Message',
            id: args?.id,
          })
        },
        comments: {
          keyArgs: ['postId'],
          merge(existing = { nodes: [] }, { pageInfo, nodes }, { args, readField }) {
            if (!existing.pageInfo) {
              return {
                nodes,
                pageInfo,
              }
            }

            // Deduplicate using ID as key (like posts/feed do)
            const existingById = new Map<string, any>()
            existing.nodes.forEach((node: any) => {
              const id = readField('id', node) as string
              if (id) existingById.set(id, node)
            })

            // Add incoming nodes, overwriting duplicates
            nodes.forEach((node: any) => {
              const id = readField('id', node) as string
              if (id) existingById.set(id, node)
            })

            // Convert back to array, maintaining order based on direction
            const mergedNodes = Array.from(existingById.values())

            if (args?.page.before) {
              return {
                nodes: mergedNodes,
                pageInfo: {
                  ...existing.pageInfo,
                  startCursor: pageInfo.startCursor,
                  hasPreviousPage: pageInfo.hasPreviousPage,
                },
              }
            }

            return {
              nodes: mergedNodes,
              pageInfo: {
                ...existing.pageInfo,
                endCursor: pageInfo.endCursor,
                hasNextPage: pageInfo.hasNextPage,
              },
            }
          },
        },
        trackComments: {
          keyArgs: ['trackId'],
          merge(existing = { nodes: [] }, { pageInfo, nodes }, { args, readField }) {
            if (!existing.pageInfo) {
              return { nodes, pageInfo }
            }

            // Deduplicate using ID as key
            const existingById = new Map<string, any>()
            existing.nodes.forEach((node: any) => {
              const id = readField('id', node) as string
              if (id) existingById.set(id, node)
            })

            nodes.forEach((node: any) => {
              const id = readField('id', node) as string
              if (id) existingById.set(id, node)
            })

            const mergedNodes = Array.from(existingById.values())

            return {
              nodes: mergedNodes,
              pageInfo: {
                ...existing.pageInfo,
                endCursor: pageInfo.endCursor,
                hasNextPage: pageInfo.hasNextPage,
              },
            }
          },
        },
        feed: {
          keyArgs: false,
          merge(existing, incoming, { readField }): FeedConnection {
            const nodes = existing ? { ...existing.nodes } : {}

            incoming.nodes.forEach((node: FeedItem) => {
              const key = readField('id', node)
              nodes[key as string] = node
            })

            return {
              pageInfo: {
                ...incoming.pageInfo,
              },
              nodes,
            }
          },

          read(existing): FeedConnection | void {
            if (existing) {
              return {
                pageInfo: { ...existing.pageInfo },
                nodes: Object.values(existing.nodes),
              }
            }
          },
        },
        posts: {
          keyArgs: ['filter'],
          merge(existing, incoming, { readField }): PostConnection {
            const nodes = existing ? { ...existing.nodes } : {}

            incoming.nodes.forEach((node: Post) => {
              const key = readField('id', node)
              nodes[key as string] = node
            })

            return {
              pageInfo: {
                ...incoming.pageInfo,
              },
              nodes,
            }
          },
          read(existing): PostConnection | void {
            if (existing) {
              return {
                pageInfo: { ...existing.pageInfo },
                nodes: Object.values(existing.nodes),
              }
            }
          },
        },
        followers: {
          keyArgs: ['id'],
          merge(existing, incoming, { readField }): FollowConnection {
            const nodes = existing ? { ...existing.nodes } : {}

            incoming.nodes.forEach((node: Follow) => {
              const key = readField('id', node)
              nodes[key as string] = node
            })

            return {
              pageInfo: {
                ...incoming.pageInfo,
              },
              nodes,
            }
          },
          read(existing): FollowConnection | void {
            if (existing) {
              return {
                pageInfo: { ...existing.pageInfo },
                nodes: Object.values(existing.nodes),
              }
            }
          },
        },
        following: {
          keyArgs: ['id'],
          merge(existing, incoming, { readField }): FollowConnection {
            const nodes = existing ? { ...existing.nodes } : {}

            incoming.nodes.forEach((node: Follow) => {
              const key = readField('id', node)
              nodes[key as string] = node
            })

            return {
              pageInfo: {
                ...incoming.pageInfo,
              },
              nodes,
            }
          },
          read(existing): FollowConnection | void {
            if (existing) {
              return {
                pageInfo: { ...existing.pageInfo },
                nodes: Object.values(existing.nodes),
              }
            }
          },
        },
        chats: {
          keyArgs: false,
          merge(existing = { nodes: [] }, { nodes, pageInfo }): ChatConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        tracks: {
          keyArgs: ['filter'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): TrackConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        groupedTracks: {
          keyArgs: ['filter'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): TrackConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        exploreTracks: {
          keyArgs: ['search'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): TrackConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        exploreUsers: {
          keyArgs: ['search'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): TrackConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        favoriteTracks: {
          keyArgs: ['search'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): TrackConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        followedArtists: {
          keyArgs: ['search'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): FollowedArtistsConnection {
            return {
              nodes: [...existing.nodes, ...nodes],
              pageInfo,
            }
          },
        },
        getTransactionHistory: {
          keyArgs: ['wallet'],
          merge(existing = { result: [] }, { result, nextPage }): PolygonscanResult {
            return {
              result: [...existing.result, ...result],
              nextPage,
            }
          },
        },
        listingItems: {
          keyArgs: ['sort', 'filter'],
          merge(existing = { nodes: [] }, incoming, { args }): ListingItemConnection {
            // If this is a refetch (no cursor/after), replace data entirely
            if (!args?.page?.after) {
              return {
                nodes: incoming.nodes,
                pageInfo: incoming.pageInfo,
              }
            }
            // Otherwise, merge for pagination (fetchMore)
            return filterNodeDuplicates(existing.nodes, incoming.nodes, incoming.pageInfo)
          },
        },
        buyNowListingItems: {
          keyArgs: ['filter'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): ListingItemConnection {
            return filterNodeDuplicates(existing.nodes, nodes, pageInfo)
          },
        },
        ownedTracks: {
          keyArgs: ['filter'],
          merge(existing = { nodes: [] }, { nodes, pageInfo }): ListingItemConnection {
            return filterNodeDuplicates(existing.nodes, nodes, pageInfo)
          },
        },
      },
    },
  },
}

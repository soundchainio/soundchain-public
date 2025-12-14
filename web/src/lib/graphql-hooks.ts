// CRITICAL FIX: Delete this file entirely and have consumers import directly from graphql.ts
// This re-export layer is causing webpack module resolution issues

// Direct re-exports from graphql.ts (NO intermediary variables)
export {
  useMeQuery,
  useMeLazyQuery,
  useUpdateDefaultWalletMutation,
  useToggleFavoriteMutation,
  useTrackLazyQuery,
  useUpdateMetaMaskAddressesMutation,
  useChangeReactionMutation,
  useReactToPostMutation,
  useRetractReactionMutation,
  useGuestReactToPostMutation,
  DefaultWallet,
  ReactionType,
  UploadUrlDocument,  // This is a value (gql document), not just a type!
  type MeQuery,
  type TrackQuery,
  type UploadUrlQuery
} from './graphql';

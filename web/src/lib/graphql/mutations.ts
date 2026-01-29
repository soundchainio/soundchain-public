import { gql } from '@apollo/client';

// Wallet-only login mutation (MetaMask, Coinbase, WalletConnect, etc.)
export const LOGIN_WITH_WALLET_MUTATION = gql`
  mutation LoginWithWallet($input: LoginWithWalletInput!) {
    loginWithWallet(input: $input) {
      jwt
    }
  }
`;

// Make Post Permanent mutation
export const MAKE_POST_PERMANENT_MUTATION = gql`
  mutation MakePostPermanent($input: MakePostPermanentInput!) {
    makePostPermanent(input: $input) {
      success
      error
      post {
        id
        isPermanent
        isEphemeral
        mediaExpiresAt
      }
    }
  }
`;

// Remove From Permanent mutation
export const REMOVE_FROM_PERMANENT_MUTATION = gql`
  mutation RemoveFromPermanent($input: RemoveFromPermanentInput!) {
    removeFromPermanent(input: $input) {
      success
      error
      post {
        id
        deleted
      }
    }
  }
`;

export const UPDATE_COMMENT_MUTATION = gql`
  mutation UpdateComment($input: UpdateCommentInput!) {
    updateComment(input: $input) {
      id
      body
      updatedAt
    }
  }
`;

// Placeholder function to mimic the mutation call
export const updateComment = (options: any) => {
  // This should be replaced with actual Apollo Client mutation logic
  return new Promise((resolve, reject) => {
    const { variables } = options;
    if (variables && variables.input && variables.input.body && variables.input.commentId) {
      resolve({
        data: {
          updateComment: {
            id: variables.input.commentId,
            body: variables.input.body,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      reject(new Error('Invalid mutation variables'));
    }
  });
};

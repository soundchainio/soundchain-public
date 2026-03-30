import { gql } from '@apollo/client';

// Wallet-only login mutation (MetaMask, Coinbase, WalletConnect, etc.)
export const LOGIN_WITH_WALLET_MUTATION = gql`
  mutation LoginWithWallet($input: LoginWithWalletInput!) {
    loginWithWallet(input: $input) {
      jwt
    }
  }
`;

// Create HD wallet account (no Magic OAuth, no external wallet required)
export const CREATE_HD_ACCOUNT_MUTATION = gql`
  mutation CreateHdAccount($input: CreateHdAccountInput!) {
    createHdAccount(input: $input) {
      jwt
      hdWalletAddress
      handle
    }
  }
`;

// L1 Email Bypass — direct email-to-JWT, no Magic OAuth
export const LOGIN_BY_EMAIL_MUTATION = gql`
  mutation LoginByEmail($email: String!, $force: Boolean) {
    loginByEmail(email: $email, force: $force) {
      jwt
    }
  }
`;

// EmailKey authentication mutations (WebAuthn + email-gated biometric)
export const PASSKEY_REGISTER_OPTIONS_MUTATION = gql`
  mutation PasskeyRegisterOptions {
    passkeyRegisterOptions {
      sessionId
      options
    }
  }
`;

export const PASSKEY_REGISTER_VERIFY_MUTATION = gql`
  mutation PasskeyRegisterVerify($input: PasskeyRegisterVerifyInput!) {
    passkeyRegisterVerify(input: $input) {
      success
    }
  }
`;

export const PASSKEY_LOGIN_OPTIONS_MUTATION = gql`
  mutation PasskeyLoginOptions($email: String) {
    passkeyLoginOptions(email: $email) {
      sessionId
      options
      hasEmailKey
    }
  }
`;

export const PASSKEY_LOGIN_VERIFY_MUTATION = gql`
  mutation PasskeyLoginVerify($input: PasskeyLoginVerifyInput!) {
    passkeyLoginVerify(input: $input) {
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

// Heartbeat mutation for online presence tracking
export const HEARTBEAT_MUTATION = gql`
  mutation Heartbeat {
    heartbeat {
      id
      lastSeenAt
    }
  }
`;

// Make Story Permanent mutation - pay OGUN to convert 24hr story to permanent reel with SCid
export const MAKE_STORY_PERMANENT_MUTATION = gql`
  mutation MakeStoryPermanent($input: MakeStoryPermanentInput!) {
    makeStoryPermanent(input: $input) {
      success
      error
      story {
        id
        isPermanent
        permanentTxHash
        scid
      }
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

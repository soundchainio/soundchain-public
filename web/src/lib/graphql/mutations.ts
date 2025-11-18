import { gql } from '@apollo/client';

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

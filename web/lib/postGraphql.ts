import { gql } from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */

export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: any;
};
export type AddPostInput = {
  owner: Scalars['String'];
  textContent: Scalars['String'];
  videoUrl: Scalars['String'];
};

export type Post = {
  __typename?: 'Post';
  id: Scalars['ID'];
  owner: Scalars['String'];
  textContent: Scalars['String'];
  videoUrl: Scalars['String'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
};

export type AddPostPayload = {
  __typename?: 'AddPostPayload';
  post: Post;
};
export type PostQuery = { __typename?: 'Query' } & {
  posts: Array<{ __typename?: 'Post' } & Pick<Post, 'id' | 'owner' | 'textContent' | 'videoUrl' | 'createdAt'>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addPost: AddPostInput;
};

export type MutationAddPostArgs = {
  owner: Scalars['String'];
  textContent: Scalars['String'];
  videoUrl: Scalars['String'];
};
export const PostMutationDocument = gql`
  mutation AddInput($input: AddPostInput!) {
    addPost(input: $input) {
      post {
        id
        textContent
        owner
        videoUrl
        createdAt
      }
    }
  }
`;
export const PostQueryDocument = gql`
  query {
    posts {
      owner
      textContent
      id
      videoUrl
      createdAt
    }
  }
`;

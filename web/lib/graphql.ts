import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** The javascript `Date` as string. Type represents date and time as the ISO Date string. */
  DateTime: any;
};

export type AddPostInput = {
  owner: Scalars['String'];
  textContent: Scalars['String'];

}

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

export type AddBookInput = {
  title: Scalars['String'];
};

export type AddBookPayload = {
  __typename?: 'AddBookPayload';
  book: Book;
};

export type Book = {
  __typename?: 'Book';
  id: Scalars['ID'];
  title: Scalars['String'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
};

export type Mutation = {
  __typename?: 'Mutation';
  addBook: AddBookPayload;
};

export type MutationAddBookArgs = {
  input: AddBookInput;
};

export type Query = {
  __typename?: 'Query';
  book: Book;
  books: Array<Book>;
};

export type QueryBookArgs = {
  id: Scalars['String'];
};

export type HomePageQueryVariables = Exact<{ [key: string]: never }>;

export type HomePageQuery = { __typename?: 'Query' } & {
  books: Array<{ __typename?: 'Book' } & Pick<Book, 'id' | 'title' | 'createdAt'>>;
};

export const HomePageDocument = gql`
  query HomePage {
    books {
      id
      title
      createdAt
    }
  }
`;
export type PostQuery = { __typename?: 'Query' } & {
  posts: Array<{ __typename?: 'Post' } & Pick<Post, 'id' | 'owner' | 'textContent' | 'videoUrl' | 'createdAt'>>;
};

export const PostDocument = gql`
  query {
    posts{
      owner
      textContent
      id
      videoUrl
      createdAt
    }
} 
`
/**
 * __useHomePageQuery__
 *
 * To run a query within a React component, call `useHomePageQuery` and pass it any options that fit your needs.
 * When your component renders, `useHomePageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHomePageQuery({
 *   variables: {
 *   },
 * });
 */
export function useHomePageQuery(baseOptions?: Apollo.QueryHookOptions<HomePageQuery, HomePageQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<HomePageQuery, HomePageQueryVariables>(HomePageDocument, options);
}
export function useHomePageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HomePageQuery, HomePageQueryVariables>) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<HomePageQuery, HomePageQueryVariables>(HomePageDocument, options);
}
export type HomePageQueryHookResult = ReturnType<typeof useHomePageQuery>;
export type HomePageLazyQueryHookResult = ReturnType<typeof useHomePageLazyQuery>;
export type HomePageQueryResult = Apollo.QueryResult<HomePageQuery, HomePageQueryVariables>;

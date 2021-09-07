import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions =  {}
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /** The javascript `Date` as string. Type represents date and time as the ISO Date string. */
  DateTime: string;
};

export type AddCommentInput = {
  postId: Scalars['String'];
  body: Scalars['String'];
};

export type AddCommentPayload = {
  __typename?: 'AddCommentPayload';
  comment: Comment;
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  jwt: Scalars['String'];
};

export type ChangeReactionInput = {
  postId: Scalars['String'];
  type: ReactionType;
};

export type ChangeReactionPayload = {
  __typename?: 'ChangeReactionPayload';
  post: Post;
};

export type ClearNotificationsPayload = {
  __typename?: 'ClearNotificationsPayload';
  ok: Scalars['Boolean'];
};

export type Comment = {
  __typename?: 'Comment';
  id: Scalars['ID'];
  body: Scalars['String'];
  postId: Scalars['String'];
  profileId: Scalars['String'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  post: Post;
  profile: Profile;
};

export type CommentNotification = {
  __typename?: 'CommentNotification';
  type: NotificationType;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  id: Scalars['String'];
  authorName: Scalars['String'];
  authorPicture: Maybe<Scalars['String']>;
  body: Scalars['String'];
  previewBody: Scalars['String'];
  link: Scalars['String'];
};

export type CreatePostInput = {
  body: Scalars['String'];
  mediaLink?: Maybe<Scalars['String']>;
};

export type CreatePostPayload = {
  __typename?: 'CreatePostPayload';
  post: Post;
};

export type CreateRepostInput = {
  body: Scalars['String'];
  repostId: Scalars['String'];
};

export type CreateRepostPayload = {
  __typename?: 'CreateRepostPayload';
  post: Post;
  originalPost: Post;
};


export type DeleteCommentInput = {
  commentId: Scalars['String'];
};

export type DeleteCommentPayload = {
  __typename?: 'DeleteCommentPayload';
  comment: Comment;
};

export type FeedConnection = {
  __typename?: 'FeedConnection';
  pageInfo: PageInfo;
  nodes: Array<FeedItem>;
};

export type FeedItem = {
  __typename?: 'FeedItem';
  id: Scalars['ID'];
  postedAt: Scalars['DateTime'];
  post: Post;
};

export type FilterPostInput = {
  profileId?: Maybe<Scalars['String']>;
};

export type FollowProfileInput = {
  followedId: Scalars['String'];
};

export type FollowProfilePayload = {
  __typename?: 'FollowProfilePayload';
  followedProfile: Profile;
};

export type FollowerNotification = {
  __typename?: 'FollowerNotification';
  type: NotificationType;
  createdAt: Scalars['DateTime'];
  id: Scalars['String'];
  followerName: Scalars['String'];
  followerPicture: Maybe<Scalars['String']>;
  link: Scalars['String'];
};

export type ForgotPasswordInput = {
  email: Scalars['String'];
};

export type ForgotPasswordPayload = {
  __typename?: 'ForgotPasswordPayload';
  ok: Scalars['Boolean'];
};

export enum Genre {
  Acoustic = 'ACOUSTIC',
  Alternative = 'ALTERNATIVE',
  Ambient = 'AMBIENT',
  Americana = 'AMERICANA',
  CPop = 'C_POP',
  Christian = 'CHRISTIAN',
  ClassicRock = 'CLASSIC_ROCK',
  Classical = 'CLASSICAL',
  Country = 'COUNTRY',
  Dance = 'DANCE',
  Devotional = 'DEVOTIONAL',
  Electronic = 'ELECTRONIC',
  Experimental = 'EXPERIMENTAL',
  Gospel = 'GOSPEL',
  HardRock = 'HARD_ROCK',
  HipHop = 'HIP_HOP',
  Indie = 'INDIE',
  Jazz = 'JAZZ',
  KPop = 'K_POP',
  KidsAndFamily = 'KIDS_AND_FAMILY',
  Latin = 'LATIN',
  Metal = 'METAL',
  MusicaMexicana = 'MUSICA_MEXICANA',
  MusicaTropical = 'MUSICA_TROPICAL',
  Podcasts = 'PODCASTS',
  Pop = 'POP',
  PopLatino = 'POP_LATINO',
  Punk = 'PUNK',
  RAndB = 'R_AND_B',
  Reggae = 'REGGAE',
  Salsa = 'SALSA',
  SoulFunk = 'SOUL_FUNK',
  Soundtrack = 'SOUNDTRACK',
  Spoken = 'SPOKEN',
  UrbanLatino = 'URBAN_LATINO',
  World = 'WORLD'
}

export type LoginInput = {
  /** Username can be email or handle */
  username: Scalars['String'];
  password: Scalars['String'];
};

export type Message = {
  __typename?: 'Message';
  id: Scalars['ID'];
  fromId: Scalars['String'];
  toId: Scalars['String'];
  message: Scalars['String'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  fromProfile: Profile;
};

export type MessageConnection = {
  __typename?: 'MessageConnection';
  pageInfo: PageInfo;
  nodes: Array<Message>;
};

export type Mutation = {
  __typename?: 'Mutation';
  addComment: AddCommentPayload;
  deleteComment: DeleteCommentPayload;
  sendMessage: SendMessagePayload;
  resetNotificationCount: Profile;
  clearNotifications: ClearNotificationsPayload;
  createPost: CreatePostPayload;
  reactToPost: ReactToPostPayload;
  retractReaction: RetractReactionPayload;
  changeReaction: ChangeReactionPayload;
  createRepost: CreateRepostPayload;
  updateSocialMedias: UpdateSocialMediasPayload;
  updateFavoriteGenres: UpdateFavoriteGenresPayload;
  updateProfilePicture: UpdateProfilePicturePayload;
  updateCoverPicture: UpdateCoverPicturePayload;
  followProfile: FollowProfilePayload;
  unfollowProfile: UnfollowProfilePayload;
  register: AuthPayload;
  login: AuthPayload;
  verifyUserEmail: VerifyUserEmailPayload;
  forgotPassword: ForgotPasswordPayload;
  resetPassword: ResetPasswordPayload;
};


export type MutationAddCommentArgs = {
  input: AddCommentInput;
};


export type MutationDeleteCommentArgs = {
  input: DeleteCommentInput;
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationCreatePostArgs = {
  input: CreatePostInput;
};


export type MutationReactToPostArgs = {
  input: ReactToPostInput;
};


export type MutationRetractReactionArgs = {
  input: RetractReactionInput;
};


export type MutationChangeReactionArgs = {
  input: ChangeReactionInput;
};


export type MutationCreateRepostArgs = {
  input: CreateRepostInput;
};


export type MutationUpdateSocialMediasArgs = {
  input: UpdateSocialMediasInput;
};


export type MutationUpdateFavoriteGenresArgs = {
  input: UpdateFavoriteGenresInput;
};


export type MutationUpdateProfilePictureArgs = {
  input: UpdateProfilePictureInput;
};


export type MutationUpdateCoverPictureArgs = {
  input: UpdateCoverPictureInput;
};


export type MutationFollowProfileArgs = {
  input: FollowProfileInput;
};


export type MutationUnfollowProfileArgs = {
  input: UnfollowProfileInput;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationVerifyUserEmailArgs = {
  input: VerifyUserEmailInput;
};


export type MutationForgotPasswordArgs = {
  input: ForgotPasswordInput;
};


export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};

export type Notification = CommentNotification | ReactionNotification | FollowerNotification;

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  pageInfo: PageInfo;
  nodes: Array<Notification>;
};

export enum NotificationType {
  Comment = 'Comment',
  Reaction = 'Reaction',
  Follower = 'Follower'
}

export type PageInfo = {
  __typename?: 'PageInfo';
  totalCount: Scalars['Float'];
  hasPreviousPage: Scalars['Boolean'];
  hasNextPage: Scalars['Boolean'];
  startCursor: Maybe<Scalars['String']>;
  endCursor: Maybe<Scalars['String']>;
};

export type PageInput = {
  first?: Maybe<Scalars['Int']>;
  after?: Maybe<Scalars['String']>;
  last?: Maybe<Scalars['Int']>;
  before?: Maybe<Scalars['String']>;
};

export type Post = {
  __typename?: 'Post';
  id: Scalars['ID'];
  body: Scalars['String'];
  mediaLink: Maybe<Scalars['String']>;
  repostId: Maybe<Scalars['String']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  profile: Profile;
  comments: Array<Comment>;
  commentCount: Scalars['Float'];
  repostCount: Scalars['Float'];
  totalReactions: Scalars['Float'];
  topReactions: Array<ReactionType>;
  myReaction: Maybe<ReactionType>;
};


export type PostTopReactionsArgs = {
  top: Scalars['Float'];
};

export type PostConnection = {
  __typename?: 'PostConnection';
  pageInfo: PageInfo;
  nodes: Array<Post>;
};

export type Profile = {
  __typename?: 'Profile';
  id: Scalars['ID'];
  displayName: Scalars['String'];
  profilePicture: Maybe<Scalars['String']>;
  coverPicture: Maybe<Scalars['String']>;
  socialMedias: SocialMedias;
  favoriteGenres: Array<Genre>;
  followerCount: Scalars['Float'];
  followingCount: Scalars['Float'];
  unreadNotificationCount: Scalars['Float'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  userHandle: Scalars['String'];
  isFollowed: Scalars['Boolean'];
};

export type Query = {
  __typename?: 'Query';
  comment: Comment;
  comments: Array<Comment>;
  chatHistory: MessageConnection;
  message: Message;
  feed: FeedConnection;
  notifications: NotificationConnection;
  notification: Notification;
  post: Post;
  repost: Post;
  posts: PostConnection;
  myProfile: Profile;
  profile: Profile;
  uploadUrl: UploadUrl;
  me: Maybe<User>;
  validPasswordResetToken: Scalars['Boolean'];
};


export type QueryCommentArgs = {
  id: Scalars['String'];
};


export type QueryCommentsArgs = {
  postId: Scalars['String'];
};


export type QueryChatHistoryArgs = {
  page?: Maybe<PageInput>;
  profileId: Scalars['String'];
};


export type QueryMessageArgs = {
  id: Scalars['String'];
};


export type QueryFeedArgs = {
  page?: Maybe<PageInput>;
};


export type QueryNotificationsArgs = {
  page?: Maybe<PageInput>;
  sort?: Maybe<SortNotificationInput>;
};


export type QueryNotificationArgs = {
  id: Scalars['String'];
};


export type QueryPostArgs = {
  id: Scalars['String'];
};


export type QueryRepostArgs = {
  id: Scalars['String'];
};


export type QueryPostsArgs = {
  page?: Maybe<PageInput>;
  sort?: Maybe<SortPostInput>;
  filter?: Maybe<FilterPostInput>;
};


export type QueryProfileArgs = {
  id: Scalars['String'];
};


export type QueryUploadUrlArgs = {
  fileType: UploadFileType;
};


export type QueryValidPasswordResetTokenArgs = {
  token: Scalars['String'];
};

export type ReactToPostInput = {
  postId: Scalars['String'];
  type: ReactionType;
};

export type ReactToPostPayload = {
  __typename?: 'ReactToPostPayload';
  post: Post;
};

export type ReactionNotification = {
  __typename?: 'ReactionNotification';
  type: NotificationType;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  id: Scalars['String'];
  authorName: Scalars['String'];
  authorPicture: Maybe<Scalars['String']>;
  postId: Scalars['String'];
  reactionType: ReactionType;
  link: Scalars['String'];
};

export enum ReactionType {
  Happy = 'HAPPY',
  Heart = 'HEART',
  Horns = 'HORNS',
  Sad = 'SAD',
  Sunglasses = 'SUNGLASSES'
}

export type RegisterInput = {
  email: Scalars['String'];
  displayName: Scalars['String'];
  handle: Scalars['String'];
  password: Scalars['String'];
};

export type ResetPasswordInput = {
  token: Scalars['String'];
  password: Scalars['String'];
};

export type ResetPasswordPayload = {
  __typename?: 'ResetPasswordPayload';
  ok: Scalars['Boolean'];
};

export type RetractReactionInput = {
  postId: Scalars['String'];
};

export type RetractReactionPayload = {
  __typename?: 'RetractReactionPayload';
  post: Post;
};

export type SendMessageInput = {
  message: Scalars['String'];
  toId: Scalars['String'];
};

export type SendMessagePayload = {
  __typename?: 'SendMessagePayload';
  message: Message;
};

export type SocialMedias = {
  __typename?: 'SocialMedias';
  facebook: Maybe<Scalars['String']>;
  instagram: Maybe<Scalars['String']>;
  soundcloud: Maybe<Scalars['String']>;
  twitter: Maybe<Scalars['String']>;
};

export enum SortNotificationField {
  CreatedAt = 'CREATED_AT'
}

export type SortNotificationInput = {
  field: SortNotificationField;
  order?: Maybe<SortOrder>;
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum SortPostField {
  CreatedAt = 'CREATED_AT'
}

export type SortPostInput = {
  field: SortPostField;
  order?: Maybe<SortOrder>;
};

export type UnfollowProfileInput = {
  followedId: Scalars['String'];
};

export type UnfollowProfilePayload = {
  __typename?: 'UnfollowProfilePayload';
  unfollowedProfile: Profile;
};

export type UpdateCoverPictureInput = {
  picture: Scalars['String'];
};

export type UpdateCoverPicturePayload = {
  __typename?: 'UpdateCoverPicturePayload';
  profile: Profile;
};

export type UpdateFavoriteGenresInput = {
  favoriteGenres: Array<Genre>;
};

export type UpdateFavoriteGenresPayload = {
  __typename?: 'UpdateFavoriteGenresPayload';
  profile: Profile;
};

export type UpdateProfilePictureInput = {
  picture: Scalars['String'];
};

export type UpdateProfilePicturePayload = {
  __typename?: 'UpdateProfilePicturePayload';
  profile: Profile;
};

export type UpdateSocialMediasInput = {
  facebook?: Maybe<Scalars['String']>;
  instagram?: Maybe<Scalars['String']>;
  soundcloud?: Maybe<Scalars['String']>;
  twitter?: Maybe<Scalars['String']>;
};

export type UpdateSocialMediasPayload = {
  __typename?: 'UpdateSocialMediasPayload';
  profile: Profile;
};

export enum UploadFileType {
  Jpeg = 'JPEG',
  Png = 'PNG'
}

export type UploadUrl = {
  __typename?: 'UploadUrl';
  uploadUrl: Scalars['String'];
  fileName: Scalars['String'];
  readUrl: Scalars['String'];
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID'];
  email: Scalars['String'];
  handle: Scalars['String'];
  verified: Scalars['Boolean'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  profile: Profile;
};

export type VerifyUserEmailInput = {
  token: Scalars['String'];
};

export type VerifyUserEmailPayload = {
  __typename?: 'VerifyUserEmailPayload';
  user: User;
};

export type AddCommentMutationVariables = Exact<{
  input: AddCommentInput;
}>;


export type AddCommentMutation = (
  { __typename?: 'Mutation' }
  & { addComment: (
    { __typename?: 'AddCommentPayload' }
    & { comment: (
      { __typename?: 'Comment' }
      & { post: (
        { __typename?: 'Post' }
        & Pick<Post, 'id' | 'commentCount'>
      ) }
      & CommentComponentFieldsFragment
    ) }
  ) }
);

export type ChangeReactionMutationVariables = Exact<{
  input: ChangeReactionInput;
}>;


export type ChangeReactionMutation = (
  { __typename?: 'Mutation' }
  & { changeReaction: (
    { __typename?: 'ChangeReactionPayload' }
    & { post: (
      { __typename?: 'Post' }
      & Pick<Post, 'id' | 'totalReactions' | 'topReactions' | 'myReaction'>
    ) }
  ) }
);

export type ChatHistoryQueryVariables = Exact<{
  profileId: Scalars['String'];
  page?: Maybe<PageInput>;
}>;


export type ChatHistoryQuery = (
  { __typename?: 'Query' }
  & { chatHistory: (
    { __typename?: 'MessageConnection' }
    & { pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'startCursor'>
    ), nodes: Array<(
      { __typename?: 'Message' }
      & MessageComponentFieldsFragment
    )> }
  ) }
);

export type ClearNotificationsMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearNotificationsMutation = (
  { __typename?: 'Mutation' }
  & { clearNotifications: (
    { __typename?: 'ClearNotificationsPayload' }
    & Pick<ClearNotificationsPayload, 'ok'>
  ) }
);

export type CommentQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type CommentQuery = (
  { __typename?: 'Query' }
  & { comment: (
    { __typename?: 'Comment' }
    & CommentComponentFieldsFragment
  ) }
);

export type CommentComponentFieldsFragment = (
  { __typename?: 'Comment' }
  & Pick<Comment, 'id' | 'body' | 'createdAt'>
  & { profile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
  ) }
);

export type CommentNotificationFieldsFragment = (
  { __typename?: 'CommentNotification' }
  & Pick<CommentNotification, 'id' | 'type' | 'body' | 'previewBody' | 'link' | 'createdAt' | 'authorName' | 'authorPicture'>
);

export type CommentsQueryVariables = Exact<{
  postId: Scalars['String'];
}>;


export type CommentsQuery = (
  { __typename?: 'Query' }
  & { comments: Array<(
    { __typename?: 'Comment' }
    & CommentComponentFieldsFragment
  )> }
);

export type CreatePostMutationVariables = Exact<{
  input: CreatePostInput;
}>;


export type CreatePostMutation = (
  { __typename?: 'Mutation' }
  & { createPost: (
    { __typename?: 'CreatePostPayload' }
    & { post: (
      { __typename?: 'Post' }
      & Pick<Post, 'id'>
    ) }
  ) }
);

export type CreateRepostMutationVariables = Exact<{
  input: CreateRepostInput;
}>;


export type CreateRepostMutation = (
  { __typename?: 'Mutation' }
  & { createRepost: (
    { __typename?: 'CreateRepostPayload' }
    & { post: (
      { __typename?: 'Post' }
      & Pick<Post, 'id'>
    ), originalPost: (
      { __typename?: 'Post' }
      & Pick<Post, 'id' | 'repostCount'>
    ) }
  ) }
);

export type DeleteCommentMutationVariables = Exact<{
  input: DeleteCommentInput;
}>;


export type DeleteCommentMutation = (
  { __typename?: 'Mutation' }
  & { deleteComment: (
    { __typename?: 'DeleteCommentPayload' }
    & { comment: (
      { __typename?: 'Comment' }
      & CommentComponentFieldsFragment
    ) }
  ) }
);

export type FeedQueryVariables = Exact<{
  page?: Maybe<PageInput>;
}>;


export type FeedQuery = (
  { __typename?: 'Query' }
  & { feed: (
    { __typename?: 'FeedConnection' }
    & { nodes: Array<(
      { __typename?: 'FeedItem' }
      & Pick<FeedItem, 'id'>
      & { post: (
        { __typename?: 'Post' }
        & PostComponentFieldsFragment
      ) }
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor'>
    ) }
  ) }
);

export type FollowProfileMutationVariables = Exact<{
  input: FollowProfileInput;
}>;


export type FollowProfileMutation = (
  { __typename?: 'Mutation' }
  & { followProfile: (
    { __typename?: 'FollowProfilePayload' }
    & { followedProfile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'followerCount' | 'isFollowed'>
    ) }
  ) }
);

export type FollowerNotificationFieldsFragment = (
  { __typename?: 'FollowerNotification' }
  & Pick<FollowerNotification, 'id' | 'type' | 'link' | 'createdAt' | 'followerName' | 'followerPicture'>
);

export type ForgotPasswordMutationVariables = Exact<{
  input: ForgotPasswordInput;
}>;


export type ForgotPasswordMutation = (
  { __typename?: 'Mutation' }
  & { forgotPassword: (
    { __typename?: 'ForgotPasswordPayload' }
    & Pick<ForgotPasswordPayload, 'ok'>
  ) }
);

export type UploadUrlQueryVariables = Exact<{
  fileType: UploadFileType;
}>;


export type UploadUrlQuery = (
  { __typename?: 'Query' }
  & { uploadUrl: (
    { __typename?: 'UploadUrl' }
    & Pick<UploadUrl, 'uploadUrl' | 'fileName' | 'readUrl'>
  ) }
);

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = (
  { __typename?: 'Mutation' }
  & { login: (
    { __typename?: 'AuthPayload' }
    & Pick<AuthPayload, 'jwt'>
  ) }
);

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = (
  { __typename?: 'Query' }
  & { me: Maybe<(
    { __typename?: 'User' }
    & Pick<User, 'id' | 'handle' | 'email'>
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'displayName' | 'profilePicture' | 'followerCount' | 'followingCount'>
    ) }
  )> }
);

export type MessageQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type MessageQuery = (
  { __typename?: 'Query' }
  & { message: (
    { __typename?: 'Message' }
    & MessageComponentFieldsFragment
  ) }
);

export type MessageComponentFieldsFragment = (
  { __typename?: 'Message' }
  & Pick<Message, 'id' | 'message' | 'fromId' | 'toId' | 'createdAt'>
  & { fromProfile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
  ) }
);

export type MyProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProfileQuery = (
  { __typename?: 'Query' }
  & { myProfile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'displayName'>
    & { socialMedias: (
      { __typename?: 'SocialMedias' }
      & Pick<SocialMedias, 'facebook' | 'instagram' | 'soundcloud' | 'twitter'>
    ) }
  ) }
);

export type NotificationQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type NotificationQuery = (
  { __typename?: 'Query' }
  & { notification: (
    { __typename?: 'CommentNotification' }
    & CommentNotificationFieldsFragment
  ) | (
    { __typename?: 'ReactionNotification' }
    & ReactionNotificationFieldsFragment
  ) | (
    { __typename?: 'FollowerNotification' }
    & FollowerNotificationFieldsFragment
  ) }
);

export type NotificationCountQueryVariables = Exact<{ [key: string]: never; }>;


export type NotificationCountQuery = (
  { __typename?: 'Query' }
  & { myProfile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'unreadNotificationCount'>
  ) }
);

export type NotificationsQueryVariables = Exact<{
  sort?: Maybe<SortNotificationInput>;
}>;


export type NotificationsQuery = (
  { __typename?: 'Query' }
  & { notifications: (
    { __typename?: 'NotificationConnection' }
    & { nodes: Array<(
      { __typename?: 'CommentNotification' }
      & CommentNotificationFieldsFragment
    ) | (
      { __typename?: 'ReactionNotification' }
      & ReactionNotificationFieldsFragment
    ) | (
      { __typename?: 'FollowerNotification' }
      & FollowerNotificationFieldsFragment
    )> }
  ) }
);

export type PostQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type PostQuery = (
  { __typename?: 'Query' }
  & { post: (
    { __typename?: 'Post' }
    & PostComponentFieldsFragment
  ) }
);

export type PostComponentFieldsFragment = (
  { __typename?: 'Post' }
  & Pick<Post, 'id' | 'body' | 'mediaLink' | 'repostId' | 'createdAt' | 'commentCount' | 'repostCount' | 'totalReactions' | 'topReactions' | 'myReaction'>
  & { profile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
  ) }
);

export type PostsQueryVariables = Exact<{
  filter?: Maybe<FilterPostInput>;
  sort?: Maybe<SortPostInput>;
}>;


export type PostsQuery = (
  { __typename?: 'Query' }
  & { posts: (
    { __typename?: 'PostConnection' }
    & { nodes: Array<(
      { __typename?: 'Post' }
      & PostComponentFieldsFragment
    )> }
  ) }
);

export type ProfileQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type ProfileQuery = (
  { __typename?: 'Query' }
  & { profile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'displayName' | 'profilePicture' | 'coverPicture' | 'userHandle' | 'isFollowed' | 'followerCount' | 'followingCount'>
    & { socialMedias: (
      { __typename?: 'SocialMedias' }
      & Pick<SocialMedias, 'facebook' | 'instagram' | 'soundcloud' | 'twitter'>
    ) }
  ) }
);

export type ProfileDisplayNameQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type ProfileDisplayNameQuery = (
  { __typename?: 'Query' }
  & { profile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'displayName'>
  ) }
);

export type ReactToPostMutationVariables = Exact<{
  input: ReactToPostInput;
}>;


export type ReactToPostMutation = (
  { __typename?: 'Mutation' }
  & { reactToPost: (
    { __typename?: 'ReactToPostPayload' }
    & { post: (
      { __typename?: 'Post' }
      & Pick<Post, 'id' | 'totalReactions' | 'topReactions' | 'myReaction'>
    ) }
  ) }
);

export type ReactionNotificationFieldsFragment = (
  { __typename?: 'ReactionNotification' }
  & Pick<ReactionNotification, 'id' | 'type' | 'reactionType' | 'link' | 'authorName' | 'authorPicture' | 'createdAt' | 'postId'>
);

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = (
  { __typename?: 'Mutation' }
  & { register: (
    { __typename?: 'AuthPayload' }
    & Pick<AuthPayload, 'jwt'>
  ) }
);

export type ResetNotificationCountMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetNotificationCountMutation = (
  { __typename?: 'Mutation' }
  & { resetNotificationCount: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'unreadNotificationCount'>
  ) }
);

export type ResetPasswordMutationVariables = Exact<{
  input: ResetPasswordInput;
}>;


export type ResetPasswordMutation = (
  { __typename?: 'Mutation' }
  & { resetPassword: (
    { __typename?: 'ResetPasswordPayload' }
    & Pick<ResetPasswordPayload, 'ok'>
  ) }
);

export type RetractReactionMutationVariables = Exact<{
  input: RetractReactionInput;
}>;


export type RetractReactionMutation = (
  { __typename?: 'Mutation' }
  & { retractReaction: (
    { __typename?: 'RetractReactionPayload' }
    & { post: (
      { __typename?: 'Post' }
      & Pick<Post, 'id' | 'totalReactions' | 'topReactions' | 'myReaction'>
    ) }
  ) }
);

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = (
  { __typename?: 'Mutation' }
  & { sendMessage: (
    { __typename?: 'SendMessagePayload' }
    & { message: (
      { __typename?: 'Message' }
      & MessageComponentFieldsFragment
    ) }
  ) }
);

export type UnfollowProfileMutationVariables = Exact<{
  input: UnfollowProfileInput;
}>;


export type UnfollowProfileMutation = (
  { __typename?: 'Mutation' }
  & { unfollowProfile: (
    { __typename?: 'UnfollowProfilePayload' }
    & { unfollowedProfile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'followerCount' | 'isFollowed'>
    ) }
  ) }
);

export type UpdateCoverPictureMutationVariables = Exact<{
  input: UpdateCoverPictureInput;
}>;


export type UpdateCoverPictureMutation = (
  { __typename?: 'Mutation' }
  & { updateCoverPicture: (
    { __typename?: 'UpdateCoverPicturePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'coverPicture'>
    ) }
  ) }
);

export type UpdateFavoriteGenresMutationVariables = Exact<{
  input: UpdateFavoriteGenresInput;
}>;


export type UpdateFavoriteGenresMutation = (
  { __typename?: 'Mutation' }
  & { updateFavoriteGenres: (
    { __typename?: 'UpdateFavoriteGenresPayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'favoriteGenres'>
    ) }
  ) }
);

export type UpdateProfilePictureMutationVariables = Exact<{
  input: UpdateProfilePictureInput;
}>;


export type UpdateProfilePictureMutation = (
  { __typename?: 'Mutation' }
  & { updateProfilePicture: (
    { __typename?: 'UpdateProfilePicturePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'profilePicture'>
    ) }
  ) }
);

export type UpdateSocialMediasMutationVariables = Exact<{
  input: UpdateSocialMediasInput;
}>;


export type UpdateSocialMediasMutation = (
  { __typename?: 'Mutation' }
  & { updateSocialMedias: (
    { __typename?: 'UpdateSocialMediasPayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id'>
      & { socialMedias: (
        { __typename?: 'SocialMedias' }
        & Pick<SocialMedias, 'facebook' | 'instagram' | 'soundcloud' | 'twitter'>
      ) }
    ) }
  ) }
);

export type ValidPasswordResetTokenQueryVariables = Exact<{
  token: Scalars['String'];
}>;


export type ValidPasswordResetTokenQuery = (
  { __typename?: 'Query' }
  & Pick<Query, 'validPasswordResetToken'>
);

export type VerifyUserEmailMutationVariables = Exact<{
  input: VerifyUserEmailInput;
}>;


export type VerifyUserEmailMutation = (
  { __typename?: 'Mutation' }
  & { verifyUserEmail: (
    { __typename?: 'VerifyUserEmailPayload' }
    & { user: (
      { __typename?: 'User' }
      & Pick<User, 'id' | 'verified'>
    ) }
  ) }
);

export const CommentComponentFieldsFragmentDoc = gql`
    fragment CommentComponentFields on Comment {
  id
  body
  createdAt
  profile {
    id
    displayName
    profilePicture
  }
}
    `;
export const CommentNotificationFieldsFragmentDoc = gql`
    fragment CommentNotificationFields on CommentNotification {
  id
  type
  body
  previewBody
  link
  createdAt
  authorName
  authorPicture
}
    `;
export const FollowerNotificationFieldsFragmentDoc = gql`
    fragment FollowerNotificationFields on FollowerNotification {
  id
  type
  link
  createdAt
  followerName
  followerPicture
}
    `;
export const MessageComponentFieldsFragmentDoc = gql`
    fragment MessageComponentFields on Message {
  id
  message
  fromId
  toId
  createdAt
  fromProfile {
    id
    displayName
    profilePicture
  }
}
    `;
export const PostComponentFieldsFragmentDoc = gql`
    fragment PostComponentFields on Post {
  id
  body
  mediaLink
  repostId
  createdAt
  commentCount
  repostCount
  totalReactions
  topReactions(top: 2)
  myReaction
  profile {
    id
    displayName
    profilePicture
  }
}
    `;
export const ReactionNotificationFieldsFragmentDoc = gql`
    fragment ReactionNotificationFields on ReactionNotification {
  id
  type
  reactionType
  link
  authorName
  authorPicture
  createdAt
  postId
}
    `;
export const AddCommentDocument = gql`
    mutation AddComment($input: AddCommentInput!) {
  addComment(input: $input) {
    comment {
      ...CommentComponentFields
      post {
        id
        commentCount
      }
    }
  }
}
    ${CommentComponentFieldsFragmentDoc}`;
export type AddCommentMutationFn = Apollo.MutationFunction<AddCommentMutation, AddCommentMutationVariables>;

/**
 * __useAddCommentMutation__
 *
 * To run a mutation, you first call `useAddCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addCommentMutation, { data, loading, error }] = useAddCommentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useAddCommentMutation(baseOptions?: Apollo.MutationHookOptions<AddCommentMutation, AddCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddCommentMutation, AddCommentMutationVariables>(AddCommentDocument, options);
      }
export type AddCommentMutationHookResult = ReturnType<typeof useAddCommentMutation>;
export type AddCommentMutationResult = Apollo.MutationResult<AddCommentMutation>;
export type AddCommentMutationOptions = Apollo.BaseMutationOptions<AddCommentMutation, AddCommentMutationVariables>;
export const ChangeReactionDocument = gql`
    mutation ChangeReaction($input: ChangeReactionInput!) {
  changeReaction(input: $input) {
    post {
      id
      totalReactions
      topReactions(top: 2)
      myReaction
    }
  }
}
    `;
export type ChangeReactionMutationFn = Apollo.MutationFunction<ChangeReactionMutation, ChangeReactionMutationVariables>;

/**
 * __useChangeReactionMutation__
 *
 * To run a mutation, you first call `useChangeReactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useChangeReactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [changeReactionMutation, { data, loading, error }] = useChangeReactionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useChangeReactionMutation(baseOptions?: Apollo.MutationHookOptions<ChangeReactionMutation, ChangeReactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ChangeReactionMutation, ChangeReactionMutationVariables>(ChangeReactionDocument, options);
      }
export type ChangeReactionMutationHookResult = ReturnType<typeof useChangeReactionMutation>;
export type ChangeReactionMutationResult = Apollo.MutationResult<ChangeReactionMutation>;
export type ChangeReactionMutationOptions = Apollo.BaseMutationOptions<ChangeReactionMutation, ChangeReactionMutationVariables>;
export const ChatHistoryDocument = gql`
    query ChatHistory($profileId: String!, $page: PageInput) {
  chatHistory(profileId: $profileId, page: $page) {
    pageInfo {
      hasNextPage
      startCursor
    }
    nodes {
      ...MessageComponentFields
    }
  }
}
    ${MessageComponentFieldsFragmentDoc}`;

/**
 * __useChatHistoryQuery__
 *
 * To run a query within a React component, call `useChatHistoryQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatHistoryQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatHistoryQuery({
 *   variables: {
 *      profileId: // value for 'profileId'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useChatHistoryQuery(baseOptions: Apollo.QueryHookOptions<ChatHistoryQuery, ChatHistoryQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatHistoryQuery, ChatHistoryQueryVariables>(ChatHistoryDocument, options);
      }
export function useChatHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatHistoryQuery, ChatHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatHistoryQuery, ChatHistoryQueryVariables>(ChatHistoryDocument, options);
        }
export type ChatHistoryQueryHookResult = ReturnType<typeof useChatHistoryQuery>;
export type ChatHistoryLazyQueryHookResult = ReturnType<typeof useChatHistoryLazyQuery>;
export type ChatHistoryQueryResult = Apollo.QueryResult<ChatHistoryQuery, ChatHistoryQueryVariables>;
export const ClearNotificationsDocument = gql`
    mutation ClearNotifications {
  clearNotifications {
    ok
  }
}
    `;
export type ClearNotificationsMutationFn = Apollo.MutationFunction<ClearNotificationsMutation, ClearNotificationsMutationVariables>;

/**
 * __useClearNotificationsMutation__
 *
 * To run a mutation, you first call `useClearNotificationsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClearNotificationsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [clearNotificationsMutation, { data, loading, error }] = useClearNotificationsMutation({
 *   variables: {
 *   },
 * });
 */
export function useClearNotificationsMutation(baseOptions?: Apollo.MutationHookOptions<ClearNotificationsMutation, ClearNotificationsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ClearNotificationsMutation, ClearNotificationsMutationVariables>(ClearNotificationsDocument, options);
      }
export type ClearNotificationsMutationHookResult = ReturnType<typeof useClearNotificationsMutation>;
export type ClearNotificationsMutationResult = Apollo.MutationResult<ClearNotificationsMutation>;
export type ClearNotificationsMutationOptions = Apollo.BaseMutationOptions<ClearNotificationsMutation, ClearNotificationsMutationVariables>;
export const CommentDocument = gql`
    query Comment($id: String!) {
  comment(id: $id) {
    ...CommentComponentFields
  }
}
    ${CommentComponentFieldsFragmentDoc}`;

/**
 * __useCommentQuery__
 *
 * To run a query within a React component, call `useCommentQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommentQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommentQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useCommentQuery(baseOptions: Apollo.QueryHookOptions<CommentQuery, CommentQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommentQuery, CommentQueryVariables>(CommentDocument, options);
      }
export function useCommentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommentQuery, CommentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommentQuery, CommentQueryVariables>(CommentDocument, options);
        }
export type CommentQueryHookResult = ReturnType<typeof useCommentQuery>;
export type CommentLazyQueryHookResult = ReturnType<typeof useCommentLazyQuery>;
export type CommentQueryResult = Apollo.QueryResult<CommentQuery, CommentQueryVariables>;
export const CommentsDocument = gql`
    query Comments($postId: String!) {
  comments(postId: $postId) {
    ...CommentComponentFields
  }
}
    ${CommentComponentFieldsFragmentDoc}`;

/**
 * __useCommentsQuery__
 *
 * To run a query within a React component, call `useCommentsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCommentsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCommentsQuery({
 *   variables: {
 *      postId: // value for 'postId'
 *   },
 * });
 */
export function useCommentsQuery(baseOptions: Apollo.QueryHookOptions<CommentsQuery, CommentsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommentsQuery, CommentsQueryVariables>(CommentsDocument, options);
      }
export function useCommentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommentsQuery, CommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommentsQuery, CommentsQueryVariables>(CommentsDocument, options);
        }
export type CommentsQueryHookResult = ReturnType<typeof useCommentsQuery>;
export type CommentsLazyQueryHookResult = ReturnType<typeof useCommentsLazyQuery>;
export type CommentsQueryResult = Apollo.QueryResult<CommentsQuery, CommentsQueryVariables>;
export const CreatePostDocument = gql`
    mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    post {
      id
    }
  }
}
    `;
export type CreatePostMutationFn = Apollo.MutationFunction<CreatePostMutation, CreatePostMutationVariables>;

/**
 * __useCreatePostMutation__
 *
 * To run a mutation, you first call `useCreatePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreatePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createPostMutation, { data, loading, error }] = useCreatePostMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreatePostMutation(baseOptions?: Apollo.MutationHookOptions<CreatePostMutation, CreatePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreatePostMutation, CreatePostMutationVariables>(CreatePostDocument, options);
      }
export type CreatePostMutationHookResult = ReturnType<typeof useCreatePostMutation>;
export type CreatePostMutationResult = Apollo.MutationResult<CreatePostMutation>;
export type CreatePostMutationOptions = Apollo.BaseMutationOptions<CreatePostMutation, CreatePostMutationVariables>;
export const CreateRepostDocument = gql`
    mutation CreateRepost($input: CreateRepostInput!) {
  createRepost(input: $input) {
    post {
      id
    }
    originalPost {
      id
      repostCount
    }
  }
}
    `;
export type CreateRepostMutationFn = Apollo.MutationFunction<CreateRepostMutation, CreateRepostMutationVariables>;

/**
 * __useCreateRepostMutation__
 *
 * To run a mutation, you first call `useCreateRepostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateRepostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createRepostMutation, { data, loading, error }] = useCreateRepostMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateRepostMutation(baseOptions?: Apollo.MutationHookOptions<CreateRepostMutation, CreateRepostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateRepostMutation, CreateRepostMutationVariables>(CreateRepostDocument, options);
      }
export type CreateRepostMutationHookResult = ReturnType<typeof useCreateRepostMutation>;
export type CreateRepostMutationResult = Apollo.MutationResult<CreateRepostMutation>;
export type CreateRepostMutationOptions = Apollo.BaseMutationOptions<CreateRepostMutation, CreateRepostMutationVariables>;
export const DeleteCommentDocument = gql`
    mutation DeleteComment($input: DeleteCommentInput!) {
  deleteComment(input: $input) {
    comment {
      ...CommentComponentFields
    }
  }
}
    ${CommentComponentFieldsFragmentDoc}`;
export type DeleteCommentMutationFn = Apollo.MutationFunction<DeleteCommentMutation, DeleteCommentMutationVariables>;

/**
 * __useDeleteCommentMutation__
 *
 * To run a mutation, you first call `useDeleteCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteCommentMutation, { data, loading, error }] = useDeleteCommentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteCommentMutation(baseOptions?: Apollo.MutationHookOptions<DeleteCommentMutation, DeleteCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteCommentMutation, DeleteCommentMutationVariables>(DeleteCommentDocument, options);
      }
export type DeleteCommentMutationHookResult = ReturnType<typeof useDeleteCommentMutation>;
export type DeleteCommentMutationResult = Apollo.MutationResult<DeleteCommentMutation>;
export type DeleteCommentMutationOptions = Apollo.BaseMutationOptions<DeleteCommentMutation, DeleteCommentMutationVariables>;
export const FeedDocument = gql`
    query Feed($page: PageInput) {
  feed(page: $page) {
    nodes {
      id
      post {
        ...PostComponentFields
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    ${PostComponentFieldsFragmentDoc}`;

/**
 * __useFeedQuery__
 *
 * To run a query within a React component, call `useFeedQuery` and pass it any options that fit your needs.
 * When your component renders, `useFeedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFeedQuery({
 *   variables: {
 *      page: // value for 'page'
 *   },
 * });
 */
export function useFeedQuery(baseOptions?: Apollo.QueryHookOptions<FeedQuery, FeedQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FeedQuery, FeedQueryVariables>(FeedDocument, options);
      }
export function useFeedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FeedQuery, FeedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FeedQuery, FeedQueryVariables>(FeedDocument, options);
        }
export type FeedQueryHookResult = ReturnType<typeof useFeedQuery>;
export type FeedLazyQueryHookResult = ReturnType<typeof useFeedLazyQuery>;
export type FeedQueryResult = Apollo.QueryResult<FeedQuery, FeedQueryVariables>;
export const FollowProfileDocument = gql`
    mutation FollowProfile($input: FollowProfileInput!) {
  followProfile(input: $input) {
    followedProfile {
      id
      followerCount
      isFollowed
    }
  }
}
    `;
export type FollowProfileMutationFn = Apollo.MutationFunction<FollowProfileMutation, FollowProfileMutationVariables>;

/**
 * __useFollowProfileMutation__
 *
 * To run a mutation, you first call `useFollowProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useFollowProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [followProfileMutation, { data, loading, error }] = useFollowProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useFollowProfileMutation(baseOptions?: Apollo.MutationHookOptions<FollowProfileMutation, FollowProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<FollowProfileMutation, FollowProfileMutationVariables>(FollowProfileDocument, options);
      }
export type FollowProfileMutationHookResult = ReturnType<typeof useFollowProfileMutation>;
export type FollowProfileMutationResult = Apollo.MutationResult<FollowProfileMutation>;
export type FollowProfileMutationOptions = Apollo.BaseMutationOptions<FollowProfileMutation, FollowProfileMutationVariables>;
export const ForgotPasswordDocument = gql`
    mutation ForgotPassword($input: ForgotPasswordInput!) {
  forgotPassword(input: $input) {
    ok
  }
}
    `;
export type ForgotPasswordMutationFn = Apollo.MutationFunction<ForgotPasswordMutation, ForgotPasswordMutationVariables>;

/**
 * __useForgotPasswordMutation__
 *
 * To run a mutation, you first call `useForgotPasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useForgotPasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [forgotPasswordMutation, { data, loading, error }] = useForgotPasswordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useForgotPasswordMutation(baseOptions?: Apollo.MutationHookOptions<ForgotPasswordMutation, ForgotPasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ForgotPasswordMutation, ForgotPasswordMutationVariables>(ForgotPasswordDocument, options);
      }
export type ForgotPasswordMutationHookResult = ReturnType<typeof useForgotPasswordMutation>;
export type ForgotPasswordMutationResult = Apollo.MutationResult<ForgotPasswordMutation>;
export type ForgotPasswordMutationOptions = Apollo.BaseMutationOptions<ForgotPasswordMutation, ForgotPasswordMutationVariables>;
export const UploadUrlDocument = gql`
    query UploadUrl($fileType: UploadFileType!) {
  uploadUrl(fileType: $fileType) {
    uploadUrl
    fileName
    readUrl
  }
}
    `;

/**
 * __useUploadUrlQuery__
 *
 * To run a query within a React component, call `useUploadUrlQuery` and pass it any options that fit your needs.
 * When your component renders, `useUploadUrlQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUploadUrlQuery({
 *   variables: {
 *      fileType: // value for 'fileType'
 *   },
 * });
 */
export function useUploadUrlQuery(baseOptions: Apollo.QueryHookOptions<UploadUrlQuery, UploadUrlQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UploadUrlQuery, UploadUrlQueryVariables>(UploadUrlDocument, options);
      }
export function useUploadUrlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UploadUrlQuery, UploadUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UploadUrlQuery, UploadUrlQueryVariables>(UploadUrlDocument, options);
        }
export type UploadUrlQueryHookResult = ReturnType<typeof useUploadUrlQuery>;
export type UploadUrlLazyQueryHookResult = ReturnType<typeof useUploadUrlLazyQuery>;
export type UploadUrlQueryResult = Apollo.QueryResult<UploadUrlQuery, UploadUrlQueryVariables>;
export const LoginDocument = gql`
    mutation Login($input: LoginInput!) {
  login(input: $input) {
    jwt
  }
}
    `;
export type LoginMutationFn = Apollo.MutationFunction<LoginMutation, LoginMutationVariables>;

/**
 * __useLoginMutation__
 *
 * To run a mutation, you first call `useLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [loginMutation, { data, loading, error }] = useLoginMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useLoginMutation(baseOptions?: Apollo.MutationHookOptions<LoginMutation, LoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<LoginMutation, LoginMutationVariables>(LoginDocument, options);
      }
export type LoginMutationHookResult = ReturnType<typeof useLoginMutation>;
export type LoginMutationResult = Apollo.MutationResult<LoginMutation>;
export type LoginMutationOptions = Apollo.BaseMutationOptions<LoginMutation, LoginMutationVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    handle
    email
    profile {
      id
      displayName
      profilePicture
      followerCount
      followingCount
    }
  }
}
    `;

/**
 * __useMeQuery__
 *
 * To run a query within a React component, call `useMeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMeQuery({
 *   variables: {
 *   },
 * });
 */
export function useMeQuery(baseOptions?: Apollo.QueryHookOptions<MeQuery, MeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MeQuery, MeQueryVariables>(MeDocument, options);
      }
export function useMeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeQueryResult = Apollo.QueryResult<MeQuery, MeQueryVariables>;
export const MessageDocument = gql`
    query Message($id: String!) {
  message(id: $id) {
    ...MessageComponentFields
  }
}
    ${MessageComponentFieldsFragmentDoc}`;

/**
 * __useMessageQuery__
 *
 * To run a query within a React component, call `useMessageQuery` and pass it any options that fit your needs.
 * When your component renders, `useMessageQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMessageQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useMessageQuery(baseOptions: Apollo.QueryHookOptions<MessageQuery, MessageQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MessageQuery, MessageQueryVariables>(MessageDocument, options);
      }
export function useMessageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MessageQuery, MessageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MessageQuery, MessageQueryVariables>(MessageDocument, options);
        }
export type MessageQueryHookResult = ReturnType<typeof useMessageQuery>;
export type MessageLazyQueryHookResult = ReturnType<typeof useMessageLazyQuery>;
export type MessageQueryResult = Apollo.QueryResult<MessageQuery, MessageQueryVariables>;
export const MyProfileDocument = gql`
    query MyProfile {
  myProfile {
    id
    displayName
    socialMedias {
      facebook
      instagram
      soundcloud
      twitter
    }
  }
}
    `;

/**
 * __useMyProfileQuery__
 *
 * To run a query within a React component, call `useMyProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useMyProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMyProfileQuery({
 *   variables: {
 *   },
 * });
 */
export function useMyProfileQuery(baseOptions?: Apollo.QueryHookOptions<MyProfileQuery, MyProfileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MyProfileQuery, MyProfileQueryVariables>(MyProfileDocument, options);
      }
export function useMyProfileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MyProfileQuery, MyProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MyProfileQuery, MyProfileQueryVariables>(MyProfileDocument, options);
        }
export type MyProfileQueryHookResult = ReturnType<typeof useMyProfileQuery>;
export type MyProfileLazyQueryHookResult = ReturnType<typeof useMyProfileLazyQuery>;
export type MyProfileQueryResult = Apollo.QueryResult<MyProfileQuery, MyProfileQueryVariables>;
export const NotificationDocument = gql`
    query Notification($id: String!) {
  notification(id: $id) {
    ... on CommentNotification {
      ...CommentNotificationFields
    }
    ... on ReactionNotification {
      ...ReactionNotificationFields
    }
    ... on FollowerNotification {
      ...FollowerNotificationFields
    }
  }
}
    ${CommentNotificationFieldsFragmentDoc}
${ReactionNotificationFieldsFragmentDoc}
${FollowerNotificationFieldsFragmentDoc}`;

/**
 * __useNotificationQuery__
 *
 * To run a query within a React component, call `useNotificationQuery` and pass it any options that fit your needs.
 * When your component renders, `useNotificationQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useNotificationQuery(baseOptions: Apollo.QueryHookOptions<NotificationQuery, NotificationQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NotificationQuery, NotificationQueryVariables>(NotificationDocument, options);
      }
export function useNotificationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NotificationQuery, NotificationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NotificationQuery, NotificationQueryVariables>(NotificationDocument, options);
        }
export type NotificationQueryHookResult = ReturnType<typeof useNotificationQuery>;
export type NotificationLazyQueryHookResult = ReturnType<typeof useNotificationLazyQuery>;
export type NotificationQueryResult = Apollo.QueryResult<NotificationQuery, NotificationQueryVariables>;
export const NotificationCountDocument = gql`
    query NotificationCount {
  myProfile {
    id
    unreadNotificationCount
  }
}
    `;

/**
 * __useNotificationCountQuery__
 *
 * To run a query within a React component, call `useNotificationCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useNotificationCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationCountQuery({
 *   variables: {
 *   },
 * });
 */
export function useNotificationCountQuery(baseOptions?: Apollo.QueryHookOptions<NotificationCountQuery, NotificationCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NotificationCountQuery, NotificationCountQueryVariables>(NotificationCountDocument, options);
      }
export function useNotificationCountLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NotificationCountQuery, NotificationCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NotificationCountQuery, NotificationCountQueryVariables>(NotificationCountDocument, options);
        }
export type NotificationCountQueryHookResult = ReturnType<typeof useNotificationCountQuery>;
export type NotificationCountLazyQueryHookResult = ReturnType<typeof useNotificationCountLazyQuery>;
export type NotificationCountQueryResult = Apollo.QueryResult<NotificationCountQuery, NotificationCountQueryVariables>;
export const NotificationsDocument = gql`
    query Notifications($sort: SortNotificationInput) {
  notifications(sort: $sort) {
    nodes {
      ... on CommentNotification {
        ...CommentNotificationFields
      }
      ... on ReactionNotification {
        ...ReactionNotificationFields
      }
      ... on FollowerNotification {
        ...FollowerNotificationFields
      }
    }
  }
}
    ${CommentNotificationFieldsFragmentDoc}
${ReactionNotificationFieldsFragmentDoc}
${FollowerNotificationFieldsFragmentDoc}`;

/**
 * __useNotificationsQuery__
 *
 * To run a query within a React component, call `useNotificationsQuery` and pass it any options that fit your needs.
 * When your component renders, `useNotificationsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useNotificationsQuery({
 *   variables: {
 *      sort: // value for 'sort'
 *   },
 * });
 */
export function useNotificationsQuery(baseOptions?: Apollo.QueryHookOptions<NotificationsQuery, NotificationsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NotificationsQuery, NotificationsQueryVariables>(NotificationsDocument, options);
      }
export function useNotificationsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NotificationsQuery, NotificationsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NotificationsQuery, NotificationsQueryVariables>(NotificationsDocument, options);
        }
export type NotificationsQueryHookResult = ReturnType<typeof useNotificationsQuery>;
export type NotificationsLazyQueryHookResult = ReturnType<typeof useNotificationsLazyQuery>;
export type NotificationsQueryResult = Apollo.QueryResult<NotificationsQuery, NotificationsQueryVariables>;
export const PostDocument = gql`
    query Post($id: String!) {
  post(id: $id) {
    ...PostComponentFields
  }
}
    ${PostComponentFieldsFragmentDoc}`;

/**
 * __usePostQuery__
 *
 * To run a query within a React component, call `usePostQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePostQuery(baseOptions: Apollo.QueryHookOptions<PostQuery, PostQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostQuery, PostQueryVariables>(PostDocument, options);
      }
export function usePostLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostQuery, PostQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostQuery, PostQueryVariables>(PostDocument, options);
        }
export type PostQueryHookResult = ReturnType<typeof usePostQuery>;
export type PostLazyQueryHookResult = ReturnType<typeof usePostLazyQuery>;
export type PostQueryResult = Apollo.QueryResult<PostQuery, PostQueryVariables>;
export const PostsDocument = gql`
    query Posts($filter: FilterPostInput, $sort: SortPostInput) {
  posts(filter: $filter, sort: $sort) {
    nodes {
      ...PostComponentFields
    }
  }
}
    ${PostComponentFieldsFragmentDoc}`;

/**
 * __usePostsQuery__
 *
 * To run a query within a React component, call `usePostsQuery` and pass it any options that fit your needs.
 * When your component renders, `usePostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePostsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      sort: // value for 'sort'
 *   },
 * });
 */
export function usePostsQuery(baseOptions?: Apollo.QueryHookOptions<PostsQuery, PostsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostsQuery, PostsQueryVariables>(PostsDocument, options);
      }
export function usePostsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostsQuery, PostsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostsQuery, PostsQueryVariables>(PostsDocument, options);
        }
export type PostsQueryHookResult = ReturnType<typeof usePostsQuery>;
export type PostsLazyQueryHookResult = ReturnType<typeof usePostsLazyQuery>;
export type PostsQueryResult = Apollo.QueryResult<PostsQuery, PostsQueryVariables>;
export const ProfileDocument = gql`
    query Profile($id: String!) {
  profile(id: $id) {
    id
    displayName
    profilePicture
    coverPicture
    socialMedias {
      facebook
      instagram
      soundcloud
      twitter
    }
    userHandle
    isFollowed
    followerCount
    followingCount
  }
}
    `;

/**
 * __useProfileQuery__
 *
 * To run a query within a React component, call `useProfileQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useProfileQuery(baseOptions: Apollo.QueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
      }
export function useProfileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
        }
export type ProfileQueryHookResult = ReturnType<typeof useProfileQuery>;
export type ProfileLazyQueryHookResult = ReturnType<typeof useProfileLazyQuery>;
export type ProfileQueryResult = Apollo.QueryResult<ProfileQuery, ProfileQueryVariables>;
export const ProfileDisplayNameDocument = gql`
    query ProfileDisplayName($id: String!) {
  profile(id: $id) {
    displayName
  }
}
    `;

/**
 * __useProfileDisplayNameQuery__
 *
 * To run a query within a React component, call `useProfileDisplayNameQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileDisplayNameQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileDisplayNameQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useProfileDisplayNameQuery(baseOptions: Apollo.QueryHookOptions<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>(ProfileDisplayNameDocument, options);
      }
export function useProfileDisplayNameLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>(ProfileDisplayNameDocument, options);
        }
export type ProfileDisplayNameQueryHookResult = ReturnType<typeof useProfileDisplayNameQuery>;
export type ProfileDisplayNameLazyQueryHookResult = ReturnType<typeof useProfileDisplayNameLazyQuery>;
export type ProfileDisplayNameQueryResult = Apollo.QueryResult<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>;
export const ReactToPostDocument = gql`
    mutation ReactToPost($input: ReactToPostInput!) {
  reactToPost(input: $input) {
    post {
      id
      totalReactions
      topReactions(top: 2)
      myReaction
    }
  }
}
    `;
export type ReactToPostMutationFn = Apollo.MutationFunction<ReactToPostMutation, ReactToPostMutationVariables>;

/**
 * __useReactToPostMutation__
 *
 * To run a mutation, you first call `useReactToPostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useReactToPostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [reactToPostMutation, { data, loading, error }] = useReactToPostMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useReactToPostMutation(baseOptions?: Apollo.MutationHookOptions<ReactToPostMutation, ReactToPostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ReactToPostMutation, ReactToPostMutationVariables>(ReactToPostDocument, options);
      }
export type ReactToPostMutationHookResult = ReturnType<typeof useReactToPostMutation>;
export type ReactToPostMutationResult = Apollo.MutationResult<ReactToPostMutation>;
export type ReactToPostMutationOptions = Apollo.BaseMutationOptions<ReactToPostMutation, ReactToPostMutationVariables>;
export const RegisterDocument = gql`
    mutation Register($input: RegisterInput!) {
  register(input: $input) {
    jwt
  }
}
    `;
export type RegisterMutationFn = Apollo.MutationFunction<RegisterMutation, RegisterMutationVariables>;

/**
 * __useRegisterMutation__
 *
 * To run a mutation, you first call `useRegisterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerMutation, { data, loading, error }] = useRegisterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRegisterMutation(baseOptions?: Apollo.MutationHookOptions<RegisterMutation, RegisterMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RegisterMutation, RegisterMutationVariables>(RegisterDocument, options);
      }
export type RegisterMutationHookResult = ReturnType<typeof useRegisterMutation>;
export type RegisterMutationResult = Apollo.MutationResult<RegisterMutation>;
export type RegisterMutationOptions = Apollo.BaseMutationOptions<RegisterMutation, RegisterMutationVariables>;
export const ResetNotificationCountDocument = gql`
    mutation ResetNotificationCount {
  resetNotificationCount {
    id
    unreadNotificationCount
  }
}
    `;
export type ResetNotificationCountMutationFn = Apollo.MutationFunction<ResetNotificationCountMutation, ResetNotificationCountMutationVariables>;

/**
 * __useResetNotificationCountMutation__
 *
 * To run a mutation, you first call `useResetNotificationCountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetNotificationCountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetNotificationCountMutation, { data, loading, error }] = useResetNotificationCountMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetNotificationCountMutation(baseOptions?: Apollo.MutationHookOptions<ResetNotificationCountMutation, ResetNotificationCountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetNotificationCountMutation, ResetNotificationCountMutationVariables>(ResetNotificationCountDocument, options);
      }
export type ResetNotificationCountMutationHookResult = ReturnType<typeof useResetNotificationCountMutation>;
export type ResetNotificationCountMutationResult = Apollo.MutationResult<ResetNotificationCountMutation>;
export type ResetNotificationCountMutationOptions = Apollo.BaseMutationOptions<ResetNotificationCountMutation, ResetNotificationCountMutationVariables>;
export const ResetPasswordDocument = gql`
    mutation ResetPassword($input: ResetPasswordInput!) {
  resetPassword(input: $input) {
    ok
  }
}
    `;
export type ResetPasswordMutationFn = Apollo.MutationFunction<ResetPasswordMutation, ResetPasswordMutationVariables>;

/**
 * __useResetPasswordMutation__
 *
 * To run a mutation, you first call `useResetPasswordMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetPasswordMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetPasswordMutation, { data, loading, error }] = useResetPasswordMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useResetPasswordMutation(baseOptions?: Apollo.MutationHookOptions<ResetPasswordMutation, ResetPasswordMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetPasswordMutation, ResetPasswordMutationVariables>(ResetPasswordDocument, options);
      }
export type ResetPasswordMutationHookResult = ReturnType<typeof useResetPasswordMutation>;
export type ResetPasswordMutationResult = Apollo.MutationResult<ResetPasswordMutation>;
export type ResetPasswordMutationOptions = Apollo.BaseMutationOptions<ResetPasswordMutation, ResetPasswordMutationVariables>;
export const RetractReactionDocument = gql`
    mutation RetractReaction($input: RetractReactionInput!) {
  retractReaction(input: $input) {
    post {
      id
      totalReactions
      topReactions(top: 2)
      myReaction
    }
  }
}
    `;
export type RetractReactionMutationFn = Apollo.MutationFunction<RetractReactionMutation, RetractReactionMutationVariables>;

/**
 * __useRetractReactionMutation__
 *
 * To run a mutation, you first call `useRetractReactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRetractReactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [retractReactionMutation, { data, loading, error }] = useRetractReactionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useRetractReactionMutation(baseOptions?: Apollo.MutationHookOptions<RetractReactionMutation, RetractReactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RetractReactionMutation, RetractReactionMutationVariables>(RetractReactionDocument, options);
      }
export type RetractReactionMutationHookResult = ReturnType<typeof useRetractReactionMutation>;
export type RetractReactionMutationResult = Apollo.MutationResult<RetractReactionMutation>;
export type RetractReactionMutationOptions = Apollo.BaseMutationOptions<RetractReactionMutation, RetractReactionMutationVariables>;
export const SendMessageDocument = gql`
    mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
    message {
      ...MessageComponentFields
    }
  }
}
    ${MessageComponentFieldsFragmentDoc}`;
export type SendMessageMutationFn = Apollo.MutationFunction<SendMessageMutation, SendMessageMutationVariables>;

/**
 * __useSendMessageMutation__
 *
 * To run a mutation, you first call `useSendMessageMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSendMessageMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [sendMessageMutation, { data, loading, error }] = useSendMessageMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSendMessageMutation(baseOptions?: Apollo.MutationHookOptions<SendMessageMutation, SendMessageMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SendMessageMutation, SendMessageMutationVariables>(SendMessageDocument, options);
      }
export type SendMessageMutationHookResult = ReturnType<typeof useSendMessageMutation>;
export type SendMessageMutationResult = Apollo.MutationResult<SendMessageMutation>;
export type SendMessageMutationOptions = Apollo.BaseMutationOptions<SendMessageMutation, SendMessageMutationVariables>;
export const UnfollowProfileDocument = gql`
    mutation UnfollowProfile($input: UnfollowProfileInput!) {
  unfollowProfile(input: $input) {
    unfollowedProfile {
      id
      followerCount
      isFollowed
    }
  }
}
    `;
export type UnfollowProfileMutationFn = Apollo.MutationFunction<UnfollowProfileMutation, UnfollowProfileMutationVariables>;

/**
 * __useUnfollowProfileMutation__
 *
 * To run a mutation, you first call `useUnfollowProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnfollowProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unfollowProfileMutation, { data, loading, error }] = useUnfollowProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUnfollowProfileMutation(baseOptions?: Apollo.MutationHookOptions<UnfollowProfileMutation, UnfollowProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnfollowProfileMutation, UnfollowProfileMutationVariables>(UnfollowProfileDocument, options);
      }
export type UnfollowProfileMutationHookResult = ReturnType<typeof useUnfollowProfileMutation>;
export type UnfollowProfileMutationResult = Apollo.MutationResult<UnfollowProfileMutation>;
export type UnfollowProfileMutationOptions = Apollo.BaseMutationOptions<UnfollowProfileMutation, UnfollowProfileMutationVariables>;
export const UpdateCoverPictureDocument = gql`
    mutation UpdateCoverPicture($input: UpdateCoverPictureInput!) {
  updateCoverPicture(input: $input) {
    profile {
      id
      coverPicture
    }
  }
}
    `;
export type UpdateCoverPictureMutationFn = Apollo.MutationFunction<UpdateCoverPictureMutation, UpdateCoverPictureMutationVariables>;

/**
 * __useUpdateCoverPictureMutation__
 *
 * To run a mutation, you first call `useUpdateCoverPictureMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCoverPictureMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCoverPictureMutation, { data, loading, error }] = useUpdateCoverPictureMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCoverPictureMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCoverPictureMutation, UpdateCoverPictureMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCoverPictureMutation, UpdateCoverPictureMutationVariables>(UpdateCoverPictureDocument, options);
      }
export type UpdateCoverPictureMutationHookResult = ReturnType<typeof useUpdateCoverPictureMutation>;
export type UpdateCoverPictureMutationResult = Apollo.MutationResult<UpdateCoverPictureMutation>;
export type UpdateCoverPictureMutationOptions = Apollo.BaseMutationOptions<UpdateCoverPictureMutation, UpdateCoverPictureMutationVariables>;
export const UpdateFavoriteGenresDocument = gql`
    mutation UpdateFavoriteGenres($input: UpdateFavoriteGenresInput!) {
  updateFavoriteGenres(input: $input) {
    profile {
      id
      favoriteGenres
    }
  }
}
    `;
export type UpdateFavoriteGenresMutationFn = Apollo.MutationFunction<UpdateFavoriteGenresMutation, UpdateFavoriteGenresMutationVariables>;

/**
 * __useUpdateFavoriteGenresMutation__
 *
 * To run a mutation, you first call `useUpdateFavoriteGenresMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateFavoriteGenresMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateFavoriteGenresMutation, { data, loading, error }] = useUpdateFavoriteGenresMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateFavoriteGenresMutation(baseOptions?: Apollo.MutationHookOptions<UpdateFavoriteGenresMutation, UpdateFavoriteGenresMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateFavoriteGenresMutation, UpdateFavoriteGenresMutationVariables>(UpdateFavoriteGenresDocument, options);
      }
export type UpdateFavoriteGenresMutationHookResult = ReturnType<typeof useUpdateFavoriteGenresMutation>;
export type UpdateFavoriteGenresMutationResult = Apollo.MutationResult<UpdateFavoriteGenresMutation>;
export type UpdateFavoriteGenresMutationOptions = Apollo.BaseMutationOptions<UpdateFavoriteGenresMutation, UpdateFavoriteGenresMutationVariables>;
export const UpdateProfilePictureDocument = gql`
    mutation UpdateProfilePicture($input: UpdateProfilePictureInput!) {
  updateProfilePicture(input: $input) {
    profile {
      id
      profilePicture
    }
  }
}
    `;
export type UpdateProfilePictureMutationFn = Apollo.MutationFunction<UpdateProfilePictureMutation, UpdateProfilePictureMutationVariables>;

/**
 * __useUpdateProfilePictureMutation__
 *
 * To run a mutation, you first call `useUpdateProfilePictureMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfilePictureMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfilePictureMutation, { data, loading, error }] = useUpdateProfilePictureMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfilePictureMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProfilePictureMutation, UpdateProfilePictureMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProfilePictureMutation, UpdateProfilePictureMutationVariables>(UpdateProfilePictureDocument, options);
      }
export type UpdateProfilePictureMutationHookResult = ReturnType<typeof useUpdateProfilePictureMutation>;
export type UpdateProfilePictureMutationResult = Apollo.MutationResult<UpdateProfilePictureMutation>;
export type UpdateProfilePictureMutationOptions = Apollo.BaseMutationOptions<UpdateProfilePictureMutation, UpdateProfilePictureMutationVariables>;
export const UpdateSocialMediasDocument = gql`
    mutation updateSocialMedias($input: UpdateSocialMediasInput!) {
  updateSocialMedias(input: $input) {
    profile {
      id
      socialMedias {
        facebook
        instagram
        soundcloud
        twitter
      }
    }
  }
}
    `;
export type UpdateSocialMediasMutationFn = Apollo.MutationFunction<UpdateSocialMediasMutation, UpdateSocialMediasMutationVariables>;

/**
 * __useUpdateSocialMediasMutation__
 *
 * To run a mutation, you first call `useUpdateSocialMediasMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateSocialMediasMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateSocialMediasMutation, { data, loading, error }] = useUpdateSocialMediasMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateSocialMediasMutation(baseOptions?: Apollo.MutationHookOptions<UpdateSocialMediasMutation, UpdateSocialMediasMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateSocialMediasMutation, UpdateSocialMediasMutationVariables>(UpdateSocialMediasDocument, options);
      }
export type UpdateSocialMediasMutationHookResult = ReturnType<typeof useUpdateSocialMediasMutation>;
export type UpdateSocialMediasMutationResult = Apollo.MutationResult<UpdateSocialMediasMutation>;
export type UpdateSocialMediasMutationOptions = Apollo.BaseMutationOptions<UpdateSocialMediasMutation, UpdateSocialMediasMutationVariables>;
export const ValidPasswordResetTokenDocument = gql`
    query ValidPasswordResetToken($token: String!) {
  validPasswordResetToken(token: $token)
}
    `;

/**
 * __useValidPasswordResetTokenQuery__
 *
 * To run a query within a React component, call `useValidPasswordResetTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useValidPasswordResetTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useValidPasswordResetTokenQuery({
 *   variables: {
 *      token: // value for 'token'
 *   },
 * });
 */
export function useValidPasswordResetTokenQuery(baseOptions: Apollo.QueryHookOptions<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>(ValidPasswordResetTokenDocument, options);
      }
export function useValidPasswordResetTokenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>(ValidPasswordResetTokenDocument, options);
        }
export type ValidPasswordResetTokenQueryHookResult = ReturnType<typeof useValidPasswordResetTokenQuery>;
export type ValidPasswordResetTokenLazyQueryHookResult = ReturnType<typeof useValidPasswordResetTokenLazyQuery>;
export type ValidPasswordResetTokenQueryResult = Apollo.QueryResult<ValidPasswordResetTokenQuery, ValidPasswordResetTokenQueryVariables>;
export const VerifyUserEmailDocument = gql`
    mutation VerifyUserEmail($input: VerifyUserEmailInput!) {
  verifyUserEmail(input: $input) {
    user {
      id
      verified
    }
  }
}
    `;
export type VerifyUserEmailMutationFn = Apollo.MutationFunction<VerifyUserEmailMutation, VerifyUserEmailMutationVariables>;

/**
 * __useVerifyUserEmailMutation__
 *
 * To run a mutation, you first call `useVerifyUserEmailMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useVerifyUserEmailMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [verifyUserEmailMutation, { data, loading, error }] = useVerifyUserEmailMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useVerifyUserEmailMutation(baseOptions?: Apollo.MutationHookOptions<VerifyUserEmailMutation, VerifyUserEmailMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<VerifyUserEmailMutation, VerifyUserEmailMutationVariables>(VerifyUserEmailDocument, options);
      }
export type VerifyUserEmailMutationHookResult = ReturnType<typeof useVerifyUserEmailMutation>;
export type VerifyUserEmailMutationResult = Apollo.MutationResult<VerifyUserEmailMutation>;
export type VerifyUserEmailMutationOptions = Apollo.BaseMutationOptions<VerifyUserEmailMutation, VerifyUserEmailMutationVariables>;
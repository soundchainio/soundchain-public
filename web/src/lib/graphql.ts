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
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: unknown;
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

export type Chat = {
  __typename?: 'Chat';
  id: Scalars['ID'];
  message: Scalars['String'];
  fromId: Scalars['String'];
  readAt: Scalars['DateTime'];
  createdAt: Scalars['DateTime'];
  profile: Profile;
  unread: Scalars['Boolean'];
};

export type ChatConnection = {
  __typename?: 'ChatConnection';
  pageInfo: PageInfo;
  nodes: Array<Chat>;
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
  deleted: Maybe<Scalars['Boolean']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  post: Post;
  profile: Profile;
};

export type CommentConnection = {
  __typename?: 'CommentConnection';
  pageInfo: PageInfo;
  nodes: Array<Comment>;
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

export type CreateListingItemInput = {
  id?: Maybe<Scalars['String']>;
  owner: Scalars['String'];
  nft: Scalars['String'];
  tokenId: Scalars['Float'];
  quantity: Scalars['Float'];
  pricePerItem: Scalars['String'];
  startingTime: Scalars['Float'];
};

export type CreateListingItemType = {
  __typename?: 'CreateListingItemType';
  id: Maybe<Scalars['String']>;
  owner: Scalars['String'];
  nft: Scalars['String'];
  tokenId: Scalars['Float'];
  quantity: Scalars['Float'];
  pricePerItem: Scalars['String'];
  startingTime: Scalars['Float'];
};

export type CreateMintingRequestInput = {
  to: Scalars['String'];
  name: Scalars['String'];
  description: Scalars['String'];
  assetUrl: Scalars['String'];
  artUrl?: Maybe<Scalars['String']>;
};

export type CreatePostInput = {
  body: Scalars['String'];
  mediaLink?: Maybe<Scalars['String']>;
};

export type CreatePostPayload = {
  __typename?: 'CreatePostPayload';
  post: Post;
};

export type CreateProfileVerificationRequestInput = {
  soundcloud?: Maybe<Scalars['String']>;
  youtube?: Maybe<Scalars['String']>;
  bandcamp?: Maybe<Scalars['String']>;
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

export type CreateTrackInput = {
  title: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  assetUrl: Scalars['String'];
  artworkUrl?: Maybe<Scalars['String']>;
  artist?: Maybe<Scalars['String']>;
  artistId?: Maybe<Scalars['String']>;
  artistProfileId?: Maybe<Scalars['String']>;
  album?: Maybe<Scalars['String']>;
  releaseYear?: Maybe<Scalars['Float']>;
  copyright?: Maybe<Scalars['String']>;
  genres?: Maybe<Array<Genre>>;
  nftData?: Maybe<NftDataInput>;
};

export type CreateTrackPayload = {
  __typename?: 'CreateTrackPayload';
  track: Track;
};


export enum DefaultWallet {
  Soundchain = 'Soundchain',
  MetaMask = 'MetaMask'
}

export type DeleteCommentInput = {
  commentId: Scalars['String'];
};

export type DeleteCommentPayload = {
  __typename?: 'DeleteCommentPayload';
  comment: Comment;
};

export type DeletePostInput = {
  postId: Scalars['String'];
};

export type DeletePostPayload = {
  __typename?: 'DeletePostPayload';
  post: Post;
};

export type DeleteTrackInput = {
  trackId: Scalars['String'];
};

export type ExplorePayload = {
  __typename?: 'ExplorePayload';
  profiles: Array<Profile>;
  tracks: Array<Track>;
  totalProfiles: Scalars['Float'];
  totalTracks: Scalars['Float'];
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

export type FilterTrackInput = {
  profileId?: Maybe<Scalars['String']>;
};

export type Follow = {
  __typename?: 'Follow';
  id: Scalars['ID'];
  followedProfile: Profile;
  followerProfile: Profile;
};

export type FollowConnection = {
  __typename?: 'FollowConnection';
  pageInfo: PageInfo;
  nodes: Array<Follow>;
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

export enum Genre {
  Acoustic = 'ACOUSTIC',
  Alternative = 'ALTERNATIVE',
  Ambient = 'AMBIENT',
  Americana = 'AMERICANA',
  Blues = 'BLUES',
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
  Lofi = 'LOFI',
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


export type ListingItem = {
  __typename?: 'ListingItem';
  id: Scalars['ID'];
  owner: Scalars['String'];
  nft: Scalars['String'];
  tokenId: Scalars['Float'];
  startingTime: Scalars['Float'];
  quantity: Scalars['Float'];
  pricePerItem: Scalars['String'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  valid: Scalars['Boolean'];
};

export type ListingItemPayload = {
  __typename?: 'ListingItemPayload';
  listingItem: Maybe<ListingItem>;
};

export type LoginInput = {
  token: Scalars['String'];
};

export type Message = {
  __typename?: 'Message';
  id: Scalars['ID'];
  fromId: Scalars['String'];
  toId: Scalars['String'];
  message: Scalars['String'];
  readAt: Maybe<Scalars['DateTime']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  fromProfile: Profile;
};

export type MessageConnection = {
  __typename?: 'MessageConnection';
  pageInfo: PageInfo;
  nodes: Array<Message>;
};

export type MimeType = {
  __typename?: 'MimeType';
  value: Scalars['String'];
};

export type MintingRequest = {
  __typename?: 'MintingRequest';
  id: Scalars['ID'];
  to: Scalars['String'];
  name: Scalars['String'];
  description: Scalars['String'];
  assetKey: Scalars['String'];
  artKey: Maybe<Scalars['String']>;
  minted: Maybe<Scalars['Boolean']>;
  transactionId: Maybe<Scalars['Boolean']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
};

export type MintingRequestPayload = {
  __typename?: 'MintingRequestPayload';
  mintingRequest: MintingRequest;
};

export enum MusicianType {
  Singer = 'SINGER',
  Drummer = 'DRUMMER',
  Guitarist = 'GUITARIST',
  Producer = 'PRODUCER'
}

export type Mutation = {
  __typename?: 'Mutation';
  addComment: AddCommentPayload;
  deleteComment: DeleteCommentPayload;
  createListingItem: CreateListingItemType;
  setNotValid: CreateListingItemType;
  sendMessage: SendMessagePayload;
  resetUnreadMessageCount: Profile;
  createMintingRequest: MintingRequestPayload;
  resetNotificationCount: Profile;
  clearNotifications: ClearNotificationsPayload;
  pinToIPFS: PinningPayload;
  pinJsonToIPFS: PinningPayload;
  createPost: CreatePostPayload;
  updatePost: UpdatePostPayload;
  reactToPost: ReactToPostPayload;
  retractReaction: RetractReactionPayload;
  changeReaction: ChangeReactionPayload;
  createRepost: CreateRepostPayload;
  deletePost: DeletePostPayload;
  updateProfile: UpdateProfilePayload;
  followProfile: FollowProfilePayload;
  unfollowProfile: UnfollowProfilePayload;
  subscribeToProfile: SubscribeToProfilePayload;
  unsubscribeFromProfile: UnsubscribeFromProfilePayload;
  createProfileVerificationRequest: ProfileVerificationRequestPayload;
  createTrack: CreateTrackPayload;
  updateTrack: UpdateTrackPayload;
  deleteTrackOnError: UpdateTrackPayload;
  register: AuthPayload;
  login: AuthPayload;
  updateHandle: UpdateHandlePayload;
  updateDefaultWallet: UpdateDefaultWalletPayload;
};


export type MutationAddCommentArgs = {
  input: AddCommentInput;
};


export type MutationDeleteCommentArgs = {
  input: DeleteCommentInput;
};


export type MutationCreateListingItemArgs = {
  input: CreateListingItemInput;
};


export type MutationSetNotValidArgs = {
  tokenId: Scalars['Float'];
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationCreateMintingRequestArgs = {
  input: CreateMintingRequestInput;
};


export type MutationPinToIpfsArgs = {
  input: PinToIpfsInput;
};


export type MutationPinJsonToIpfsArgs = {
  input: PinJsonToIpfsInput;
};


export type MutationCreatePostArgs = {
  input: CreatePostInput;
};


export type MutationUpdatePostArgs = {
  input: UpdatePostInput;
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


export type MutationDeletePostArgs = {
  input: DeletePostInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationFollowProfileArgs = {
  input: FollowProfileInput;
};


export type MutationUnfollowProfileArgs = {
  input: UnfollowProfileInput;
};


export type MutationSubscribeToProfileArgs = {
  input: SubscribeToProfileInput;
};


export type MutationUnsubscribeFromProfileArgs = {
  input: UnsubscribeFromProfileInput;
};


export type MutationCreateProfileVerificationRequestArgs = {
  input: CreateProfileVerificationRequestInput;
};


export type MutationCreateTrackArgs = {
  input: CreateTrackInput;
};


export type MutationUpdateTrackArgs = {
  input: UpdateTrackInput;
};


export type MutationDeleteTrackOnErrorArgs = {
  input: DeleteTrackInput;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationUpdateHandleArgs = {
  input: UpdateHandleInput;
};


export type MutationUpdateDefaultWalletArgs = {
  input: UpdateDefaultWalletInput;
};

export type NftDataInput = {
  transactionHash?: Maybe<Scalars['String']>;
  pendingRequest?: Maybe<PendingRequest>;
  ipfsCid?: Maybe<Scalars['String']>;
  tokenId?: Maybe<Scalars['Float']>;
  contract?: Maybe<Scalars['String']>;
  minter?: Maybe<Scalars['String']>;
  quantity?: Maybe<Scalars['Float']>;
  owner?: Maybe<Scalars['String']>;
};

export type NftDataType = {
  __typename?: 'NFTDataType';
  transactionHash: Maybe<Scalars['String']>;
  pendingRequest: Maybe<PendingRequest>;
  ipfsCid: Maybe<Scalars['String']>;
  tokenId: Maybe<Scalars['Float']>;
  contract: Maybe<Scalars['String']>;
  minter: Maybe<Scalars['String']>;
  quantity: Maybe<Scalars['Float']>;
  owner: Maybe<Scalars['String']>;
};

export type NftSoldNotification = {
  __typename?: 'NFTSoldNotification';
  type: NotificationType;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  id: Scalars['String'];
  buyerName: Scalars['String'];
  buyerPicture: Scalars['String'];
  buyerProfileId: Scalars['String'];
  trackId: Scalars['String'];
  price: Scalars['String'];
  trackName: Scalars['String'];
  artist: Scalars['String'];
  artworkUrl: Scalars['String'];
};

export type NewPostNotification = {
  __typename?: 'NewPostNotification';
  type: NotificationType;
  createdAt: Scalars['DateTime'];
  id: Scalars['String'];
  authorName: Scalars['String'];
  authorPicture: Maybe<Scalars['String']>;
  body: Scalars['String'];
  previewBody: Scalars['String'];
  previewLink: Maybe<Scalars['String']>;
  link: Scalars['String'];
  track: Maybe<Track>;
};

export type Notification = CommentNotification | ReactionNotification | FollowerNotification | NewPostNotification | NftSoldNotification;

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  pageInfo: PageInfo;
  nodes: Array<Notification>;
};

export enum NotificationType {
  Comment = 'Comment',
  Reaction = 'Reaction',
  Follower = 'Follower',
  NewPost = 'NewPost',
  NftSold = 'NFTSold'
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
  inclusive?: Maybe<Scalars['Boolean']>;
};

export enum PendingRequest {
  Mint = 'Mint',
  List = 'List',
  Buy = 'Buy',
  CancelListing = 'CancelListing',
  UpdateListing = 'UpdateListing',
  None = 'None'
}

export type PinJsonToIpfsInput = {
  fileName: Scalars['String'];
  json: Scalars['JSON'];
};

export type PinToIpfsInput = {
  fileName: Scalars['String'];
  fileKey: Scalars['String'];
};

export type PinningPayload = {
  __typename?: 'PinningPayload';
  cid: Scalars['String'];
};

export type Post = {
  __typename?: 'Post';
  id: Scalars['ID'];
  body: Maybe<Scalars['String']>;
  mediaLink: Maybe<Scalars['String']>;
  repostId: Maybe<Scalars['String']>;
  deleted: Maybe<Scalars['Boolean']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  profile: Profile;
  comments: Array<Comment>;
  commentCount: Scalars['Float'];
  repostCount: Scalars['Float'];
  totalReactions: Scalars['Float'];
  topReactions: Array<ReactionType>;
  myReaction: Maybe<ReactionType>;
  track: Maybe<Track>;
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
  musicianTypes: Array<MusicianType>;
  bio: Maybe<Scalars['String']>;
  followerCount: Scalars['Float'];
  followingCount: Scalars['Float'];
  unreadNotificationCount: Scalars['Float'];
  unreadMessageCount: Scalars['Float'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  userHandle: Scalars['String'];
  isFollowed: Scalars['Boolean'];
  isSubscriber: Scalars['Boolean'];
};

export type ProfileConnection = {
  __typename?: 'ProfileConnection';
  pageInfo: PageInfo;
  nodes: Array<Profile>;
};

export type ProfileVerificationRequest = {
  __typename?: 'ProfileVerificationRequest';
  id: Scalars['ID'];
  profileId: Scalars['String'];
  soundcloud: Maybe<Scalars['String']>;
  youtube: Maybe<Scalars['String']>;
  bandcamp: Maybe<Scalars['String']>;
  status: Maybe<Scalars['String']>;
  reason: Maybe<Scalars['String']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
};

export type ProfileVerificationRequestPayload = {
  __typename?: 'ProfileVerificationRequestPayload';
  profileVerificationRequest: ProfileVerificationRequest;
};

export type Query = {
  __typename?: 'Query';
  chats: ChatConnection;
  chatHistory: MessageConnection;
  comment: Comment;
  comments: CommentConnection;
  explore: ExplorePayload;
  exploreTracks: TrackConnection;
  exploreUsers: ProfileConnection;
  feed: FeedConnection;
  followers: FollowConnection;
  following: FollowConnection;
  listingItem: ListingItemPayload;
  wasListedBefore: Scalars['Boolean'];
  message: Message;
  notifications: NotificationConnection;
  notification: Notification;
  post: Post;
  posts: PostConnection;
  reactions: ReactionConnection;
  bandcampLink: Scalars['String'];
  myProfile: Profile;
  profile: Profile;
  profileVerificationRequest: ProfileVerificationRequest;
  track: Track;
  tracks: TrackConnection;
  uploadUrl: UploadUrl;
  mimeType: MimeType;
  me: Maybe<User>;
  getUserByWallet: Maybe<User>;
};


export type QueryChatsArgs = {
  page?: Maybe<PageInput>;
};


export type QueryChatHistoryArgs = {
  page?: Maybe<PageInput>;
  profileId: Scalars['String'];
};


export type QueryCommentArgs = {
  id: Scalars['String'];
};


export type QueryCommentsArgs = {
  postId?: Maybe<Scalars['String']>;
  page?: Maybe<PageInput>;
};


export type QueryExploreArgs = {
  search?: Maybe<Scalars['String']>;
};


export type QueryExploreTracksArgs = {
  page?: Maybe<PageInput>;
  search?: Maybe<Scalars['String']>;
};


export type QueryExploreUsersArgs = {
  page?: Maybe<PageInput>;
  search?: Maybe<Scalars['String']>;
};


export type QueryFeedArgs = {
  page?: Maybe<PageInput>;
};


export type QueryFollowersArgs = {
  page?: Maybe<PageInput>;
  id: Scalars['String'];
};


export type QueryFollowingArgs = {
  page?: Maybe<PageInput>;
  id: Scalars['String'];
};


export type QueryListingItemArgs = {
  tokenId: Scalars['Float'];
};


export type QueryWasListedBeforeArgs = {
  tokenId: Scalars['Float'];
};


export type QueryMessageArgs = {
  id: Scalars['String'];
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


export type QueryPostsArgs = {
  page?: Maybe<PageInput>;
  sort?: Maybe<SortPostInput>;
  filter?: Maybe<FilterPostInput>;
};


export type QueryReactionsArgs = {
  page?: Maybe<PageInput>;
  postId: Scalars['String'];
};


export type QueryBandcampLinkArgs = {
  url: Scalars['String'];
};


export type QueryProfileArgs = {
  id: Scalars['String'];
};


export type QueryTrackArgs = {
  id: Scalars['String'];
};


export type QueryTracksArgs = {
  page?: Maybe<PageInput>;
  sort?: Maybe<SortTrackInput>;
  filter?: Maybe<FilterTrackInput>;
};


export type QueryUploadUrlArgs = {
  fileType: Scalars['String'];
};


export type QueryMimeTypeArgs = {
  url: Scalars['String'];
};


export type QueryGetUserByWalletArgs = {
  walletAddress: Scalars['String'];
};

export type ReactToPostInput = {
  postId: Scalars['String'];
  type: ReactionType;
};

export type ReactToPostPayload = {
  __typename?: 'ReactToPostPayload';
  post: Post;
};

export type Reaction = {
  __typename?: 'Reaction';
  id: Scalars['ID'];
  profileId: Scalars['String'];
  postId: Scalars['String'];
  type: Scalars['String'];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  profile: Profile;
};

export type ReactionConnection = {
  __typename?: 'ReactionConnection';
  pageInfo: PageInfo;
  nodes: Array<Reaction>;
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
  token: Scalars['String'];
  displayName: Scalars['String'];
  handle: Scalars['String'];
};

export type RetractReactionInput = {
  postId: Scalars['String'];
};

export type RetractReactionPayload = {
  __typename?: 'RetractReactionPayload';
  post: Post;
};

export enum Role {
  Admin = 'ADMIN',
  User = 'USER'
}

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

export type SocialMediasInput = {
  facebook?: Maybe<Scalars['String']>;
  instagram?: Maybe<Scalars['String']>;
  soundcloud?: Maybe<Scalars['String']>;
  twitter?: Maybe<Scalars['String']>;
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

export enum SortTrackField {
  CreatedAt = 'CREATED_AT'
}

export type SortTrackInput = {
  field: SortTrackField;
  order?: Maybe<SortOrder>;
};

export type SubscribeToProfileInput = {
  profileId: Scalars['String'];
};

export type SubscribeToProfilePayload = {
  __typename?: 'SubscribeToProfilePayload';
  profile: Profile;
};

export type Track = {
  __typename?: 'Track';
  id: Scalars['ID'];
  profileId: Scalars['String'];
  title: Maybe<Scalars['String']>;
  description: Maybe<Scalars['String']>;
  assetUrl: Scalars['String'];
  artworkUrl: Maybe<Scalars['String']>;
  artist: Maybe<Scalars['String']>;
  artistId: Maybe<Scalars['String']>;
  artistProfileId: Maybe<Scalars['String']>;
  album: Maybe<Scalars['String']>;
  copyright: Maybe<Scalars['String']>;
  releaseYear: Maybe<Scalars['Float']>;
  genres: Maybe<Array<Genre>>;
  nftData: Maybe<NftDataType>;
  deleted: Maybe<Scalars['Boolean']>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  playbackUrl: Scalars['String'];
};

export type TrackConnection = {
  __typename?: 'TrackConnection';
  pageInfo: PageInfo;
  nodes: Array<Track>;
};

export type UnfollowProfileInput = {
  followedId: Scalars['String'];
};

export type UnfollowProfilePayload = {
  __typename?: 'UnfollowProfilePayload';
  unfollowedProfile: Profile;
};

export type UnsubscribeFromProfileInput = {
  profileId: Scalars['String'];
};

export type UnsubscribeFromProfilePayload = {
  __typename?: 'UnsubscribeFromProfilePayload';
  profile: Profile;
};

export type UpdateDefaultWalletInput = {
  defaultWallet: Scalars['String'];
};

export type UpdateDefaultWalletPayload = {
  __typename?: 'UpdateDefaultWalletPayload';
  user: User;
};

export type UpdateHandleInput = {
  handle: Scalars['String'];
};

export type UpdateHandlePayload = {
  __typename?: 'UpdateHandlePayload';
  user: User;
};

export type UpdatePostInput = {
  postId: Scalars['String'];
  body: Scalars['String'];
  mediaLink?: Maybe<Scalars['String']>;
};

export type UpdatePostPayload = {
  __typename?: 'UpdatePostPayload';
  post: Post;
};

export type UpdateProfileInput = {
  displayName?: Maybe<Scalars['String']>;
  bio?: Maybe<Scalars['String']>;
  profilePicture?: Maybe<Scalars['String']>;
  coverPicture?: Maybe<Scalars['String']>;
  favoriteGenres?: Maybe<Array<Genre>>;
  musicianTypes?: Maybe<Array<MusicianType>>;
  socialMedias?: Maybe<SocialMediasInput>;
};

export type UpdateProfilePayload = {
  __typename?: 'UpdateProfilePayload';
  profile: Profile;
};

export type UpdateTrackInput = {
  trackId: Scalars['String'];
  profileId?: Maybe<Scalars['String']>;
  nftData?: Maybe<NftDataInput>;
};

export type UpdateTrackPayload = {
  __typename?: 'UpdateTrackPayload';
  track: Track;
};

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
  walletAddress: Maybe<Scalars['String']>;
  defaultWallet: DefaultWallet;
  isApprovedOnMarketplace: Scalars['Boolean'];
  roles: Array<Role>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  profile: Profile;
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

export type BandcampLinkQueryVariables = Exact<{
  url: Scalars['String'];
}>;


export type BandcampLinkQuery = (
  { __typename?: 'Query' }
  & Pick<Query, 'bandcampLink'>
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

export type ChatsQueryVariables = Exact<{
  page?: Maybe<PageInput>;
}>;


export type ChatsQuery = (
  { __typename?: 'Query' }
  & { chats: (
    { __typename?: 'ChatConnection' }
    & { nodes: Array<(
      { __typename?: 'Chat' }
      & Pick<Chat, 'id' | 'message' | 'unread' | 'createdAt'>
      & { profile: (
        { __typename?: 'Profile' }
        & Pick<Profile, 'displayName' | 'profilePicture'>
      ) }
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor'>
    ) }
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
  & Pick<Comment, 'id' | 'body' | 'createdAt' | 'deleted'>
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
  page?: Maybe<PageInput>;
}>;


export type CommentsQuery = (
  { __typename?: 'Query' }
  & { comments: (
    { __typename?: 'CommentConnection' }
    & { nodes: Array<(
      { __typename?: 'Comment' }
      & CommentComponentFieldsFragment
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasPreviousPage' | 'hasNextPage' | 'startCursor' | 'endCursor'>
    ) }
  ) }
);

export type CreateListingItemMutationVariables = Exact<{
  input: CreateListingItemInput;
}>;


export type CreateListingItemMutation = (
  { __typename?: 'Mutation' }
  & { createListingItem: (
    { __typename?: 'CreateListingItemType' }
    & Pick<CreateListingItemType, 'id' | 'owner' | 'nft' | 'tokenId' | 'quantity' | 'pricePerItem' | 'startingTime'>
  ) }
);

export type CreateMintingRequestMutationVariables = Exact<{
  input: CreateMintingRequestInput;
}>;


export type CreateMintingRequestMutation = (
  { __typename?: 'Mutation' }
  & { createMintingRequest: (
    { __typename?: 'MintingRequestPayload' }
    & { mintingRequest: (
      { __typename?: 'MintingRequest' }
      & Pick<MintingRequest, 'id' | 'transactionId'>
    ) }
  ) }
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

export type CreateProfileVerificationRequestMutationVariables = Exact<{
  input: CreateProfileVerificationRequestInput;
}>;


export type CreateProfileVerificationRequestMutation = (
  { __typename?: 'Mutation' }
  & { createProfileVerificationRequest: (
    { __typename?: 'ProfileVerificationRequestPayload' }
    & { profileVerificationRequest: (
      { __typename?: 'ProfileVerificationRequest' }
      & ProfileVerificationRequestComponentFieldsFragment
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

export type CreateTrackMutationVariables = Exact<{
  input: CreateTrackInput;
}>;


export type CreateTrackMutation = (
  { __typename?: 'Mutation' }
  & { createTrack: (
    { __typename?: 'CreateTrackPayload' }
    & { track: (
      { __typename?: 'Track' }
      & TrackComponentFieldsFragment
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

export type DeletePostMutationVariables = Exact<{
  input: DeletePostInput;
}>;


export type DeletePostMutation = (
  { __typename?: 'Mutation' }
  & { deletePost: (
    { __typename?: 'DeletePostPayload' }
    & { post: (
      { __typename?: 'Post' }
      & PostComponentFieldsFragment
    ) }
  ) }
);

export type DeleteTrackOnErrorMutationVariables = Exact<{
  input: DeleteTrackInput;
}>;


export type DeleteTrackOnErrorMutation = (
  { __typename?: 'Mutation' }
  & { deleteTrackOnError: (
    { __typename?: 'UpdateTrackPayload' }
    & { track: (
      { __typename?: 'Track' }
      & TrackComponentFieldsFragment
    ) }
  ) }
);

export type ExploreQueryVariables = Exact<{
  search?: Maybe<Scalars['String']>;
}>;


export type ExploreQuery = (
  { __typename?: 'Query' }
  & { explore: (
    { __typename?: 'ExplorePayload' }
    & Pick<ExplorePayload, 'totalTracks' | 'totalProfiles'>
    & { tracks: Array<(
      { __typename?: 'Track' }
      & TrackComponentFieldsFragment
    )>, profiles: Array<(
      { __typename?: 'Profile' }
      & ProfileComponentFieldsFragment
    )> }
  ) }
);

export type ExploreTracksQueryVariables = Exact<{
  search?: Maybe<Scalars['String']>;
  page?: Maybe<PageInput>;
}>;


export type ExploreTracksQuery = (
  { __typename?: 'Query' }
  & { exploreTracks: (
    { __typename?: 'TrackConnection' }
    & { nodes: Array<(
      { __typename?: 'Track' }
      & TrackComponentFieldsFragment
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor'>
    ) }
  ) }
);

export type ExploreUsersQueryVariables = Exact<{
  search?: Maybe<Scalars['String']>;
  page?: Maybe<PageInput>;
}>;


export type ExploreUsersQuery = (
  { __typename?: 'Query' }
  & { exploreUsers: (
    { __typename?: 'ProfileConnection' }
    & { nodes: Array<(
      { __typename?: 'Profile' }
      & ProfileComponentFieldsFragment
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor'>
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

export type FollowersQueryVariables = Exact<{
  profileId: Scalars['String'];
  page?: Maybe<PageInput>;
}>;


export type FollowersQuery = (
  { __typename?: 'Query' }
  & { followers: (
    { __typename?: 'FollowConnection' }
    & { nodes: Array<(
      { __typename?: 'Follow' }
      & Pick<Follow, 'id'>
      & { followerProfile: (
        { __typename?: 'Profile' }
        & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
      ) }
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor' | 'totalCount'>
    ) }
  ) }
);

export type FollowingQueryVariables = Exact<{
  profileId: Scalars['String'];
  page?: Maybe<PageInput>;
}>;


export type FollowingQuery = (
  { __typename?: 'Query' }
  & { following: (
    { __typename?: 'FollowConnection' }
    & { nodes: Array<(
      { __typename?: 'Follow' }
      & Pick<Follow, 'id'>
      & { followedProfile: (
        { __typename?: 'Profile' }
        & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
      ) }
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor' | 'totalCount'>
    ) }
  ) }
);

export type ListingItemQueryVariables = Exact<{
  tokenId: Scalars['Float'];
}>;


export type ListingItemQuery = (
  { __typename?: 'Query' }
  & { listingItem: (
    { __typename?: 'ListingItemPayload' }
    & { listingItem: Maybe<(
      { __typename?: 'ListingItem' }
      & Pick<ListingItem, 'id' | 'owner' | 'nft' | 'tokenId' | 'quantity' | 'pricePerItem' | 'startingTime'>
    )> }
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
    & Pick<User, 'id' | 'handle' | 'email' | 'walletAddress' | 'defaultWallet' | 'isApprovedOnMarketplace' | 'roles'>
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'displayName' | 'profilePicture' | 'coverPicture' | 'followerCount' | 'followingCount' | 'favoriteGenres' | 'musicianTypes' | 'bio'>
      & { socialMedias: (
        { __typename?: 'SocialMedias' }
        & Pick<SocialMedias, 'facebook' | 'instagram' | 'soundcloud' | 'twitter'>
      ) }
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

export type MimeTypeQueryVariables = Exact<{
  url: Scalars['String'];
}>;


export type MimeTypeQuery = (
  { __typename?: 'Query' }
  & { mimeType: (
    { __typename?: 'MimeType' }
    & Pick<MimeType, 'value'>
  ) }
);

export type NftSoldNotificationFieldsFragment = (
  { __typename?: 'NFTSoldNotification' }
  & Pick<NftSoldNotification, 'id' | 'type' | 'createdAt' | 'buyerName' | 'buyerPicture' | 'buyerProfileId' | 'trackId' | 'trackName' | 'artist' | 'artworkUrl' | 'price'>
);

export type NewPostNotificationFieldsFragment = (
  { __typename?: 'NewPostNotification' }
  & Pick<NewPostNotification, 'id' | 'type' | 'authorName' | 'authorPicture' | 'body' | 'link' | 'previewBody' | 'previewLink' | 'createdAt'>
  & { track: Maybe<(
    { __typename?: 'Track' }
    & Pick<Track, 'title' | 'playbackUrl'>
  )> }
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
  ) | (
    { __typename?: 'NewPostNotification' }
    & NewPostNotificationFieldsFragment
  ) | (
    { __typename?: 'NFTSoldNotification' }
    & NftSoldNotificationFieldsFragment
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
    ) | (
      { __typename?: 'NewPostNotification' }
      & NewPostNotificationFieldsFragment
    ) | (
      { __typename?: 'NFTSoldNotification' }
      & NftSoldNotificationFieldsFragment
    )> }
  ) }
);

export type PinJsonToIpfsMutationVariables = Exact<{
  input: PinJsonToIpfsInput;
}>;


export type PinJsonToIpfsMutation = (
  { __typename?: 'Mutation' }
  & { pinJsonToIPFS: (
    { __typename?: 'PinningPayload' }
    & Pick<PinningPayload, 'cid'>
  ) }
);

export type PinToIpfsMutationVariables = Exact<{
  input: PinToIpfsInput;
}>;


export type PinToIpfsMutation = (
  { __typename?: 'Mutation' }
  & { pinToIPFS: (
    { __typename?: 'PinningPayload' }
    & Pick<PinningPayload, 'cid'>
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
  & Pick<Post, 'id' | 'body' | 'mediaLink' | 'repostId' | 'createdAt' | 'updatedAt' | 'commentCount' | 'repostCount' | 'totalReactions' | 'topReactions' | 'myReaction' | 'deleted'>
  & { profile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
  ), track: Maybe<(
    { __typename?: 'Track' }
    & TrackComponentFieldsFragment
  )> }
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
    & ProfileComponentFieldsFragment
  ) }
);

export type ProfileComponentFieldsFragment = (
  { __typename?: 'Profile' }
  & Pick<Profile, 'id' | 'displayName' | 'profilePicture' | 'coverPicture' | 'favoriteGenres' | 'musicianTypes' | 'bio' | 'followerCount' | 'followingCount' | 'userHandle' | 'isFollowed' | 'isSubscriber' | 'unreadNotificationCount' | 'unreadMessageCount' | 'createdAt' | 'updatedAt'>
  & { socialMedias: (
    { __typename?: 'SocialMedias' }
    & Pick<SocialMedias, 'facebook' | 'instagram' | 'soundcloud' | 'twitter'>
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

export type ProfileVerificationRequestQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileVerificationRequestQuery = (
  { __typename?: 'Query' }
  & { profileVerificationRequest: (
    { __typename?: 'ProfileVerificationRequest' }
    & ProfileVerificationRequestComponentFieldsFragment
  ) }
);

export type ProfileVerificationRequestComponentFieldsFragment = (
  { __typename?: 'ProfileVerificationRequest' }
  & Pick<ProfileVerificationRequest, 'id' | 'profileId' | 'soundcloud' | 'youtube' | 'bandcamp' | 'status' | 'reason' | 'createdAt' | 'updatedAt'>
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

export type ReactionsQueryVariables = Exact<{
  postId: Scalars['String'];
  page?: Maybe<PageInput>;
}>;


export type ReactionsQuery = (
  { __typename?: 'Query' }
  & { reactions: (
    { __typename?: 'ReactionConnection' }
    & { nodes: Array<(
      { __typename?: 'Reaction' }
      & Pick<Reaction, 'id' | 'type'>
      & { profile: (
        { __typename?: 'Profile' }
        & Pick<Profile, 'id' | 'displayName' | 'profilePicture'>
      ) }
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor' | 'totalCount'>
    ) }
  ) }
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

export type ResetUnreadMessageCountMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetUnreadMessageCountMutation = (
  { __typename?: 'Mutation' }
  & { resetUnreadMessageCount: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'unreadMessageCount'>
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

export type SetNotValidMutationVariables = Exact<{
  tokenId: Scalars['Float'];
}>;


export type SetNotValidMutation = (
  { __typename?: 'Mutation' }
  & { setNotValid: (
    { __typename?: 'CreateListingItemType' }
    & Pick<CreateListingItemType, 'id' | 'owner' | 'nft' | 'tokenId' | 'quantity' | 'pricePerItem' | 'startingTime'>
  ) }
);

export type SubscribeToProfileMutationVariables = Exact<{
  input: SubscribeToProfileInput;
}>;


export type SubscribeToProfileMutation = (
  { __typename?: 'Mutation' }
  & { subscribeToProfile: (
    { __typename?: 'SubscribeToProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'isSubscriber'>
    ) }
  ) }
);

export type TrackQueryVariables = Exact<{
  id: Scalars['String'];
}>;


export type TrackQuery = (
  { __typename?: 'Query' }
  & { track: (
    { __typename?: 'Track' }
    & TrackComponentFieldsFragment
  ) }
);

export type TrackComponentFieldsFragment = (
  { __typename?: 'Track' }
  & Pick<Track, 'id' | 'profileId' | 'title' | 'assetUrl' | 'artworkUrl' | 'description' | 'artist' | 'artistId' | 'artistProfileId' | 'album' | 'releaseYear' | 'copyright' | 'genres' | 'playbackUrl' | 'createdAt' | 'updatedAt' | 'deleted'>
  & { nftData: Maybe<(
    { __typename?: 'NFTDataType' }
    & Pick<NftDataType, 'transactionHash' | 'tokenId' | 'contract' | 'minter' | 'ipfsCid' | 'pendingRequest' | 'owner'>
  )> }
);

export type TracksQueryVariables = Exact<{
  filter?: Maybe<FilterTrackInput>;
  sort?: Maybe<SortTrackInput>;
  page?: Maybe<PageInput>;
}>;


export type TracksQuery = (
  { __typename?: 'Query' }
  & { tracks: (
    { __typename?: 'TrackConnection' }
    & { nodes: Array<(
      { __typename?: 'Track' }
      & TrackComponentFieldsFragment
    )>, pageInfo: (
      { __typename?: 'PageInfo' }
      & Pick<PageInfo, 'hasNextPage' | 'endCursor'>
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

export type UnreadMessageCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadMessageCountQuery = (
  { __typename?: 'Query' }
  & { myProfile: (
    { __typename?: 'Profile' }
    & Pick<Profile, 'id' | 'unreadMessageCount'>
  ) }
);

export type UnsubscribeFromProfileMutationVariables = Exact<{
  input: UnsubscribeFromProfileInput;
}>;


export type UnsubscribeFromProfileMutation = (
  { __typename?: 'Mutation' }
  & { unsubscribeFromProfile: (
    { __typename?: 'UnsubscribeFromProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'isSubscriber'>
    ) }
  ) }
);

export type UpdateCoverPictureMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateCoverPictureMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'coverPicture'>
    ) }
  ) }
);

export type UpdateDefaultWalletMutationVariables = Exact<{
  input: UpdateDefaultWalletInput;
}>;


export type UpdateDefaultWalletMutation = (
  { __typename?: 'Mutation' }
  & { updateDefaultWallet: (
    { __typename?: 'UpdateDefaultWalletPayload' }
    & { user: (
      { __typename?: 'User' }
      & Pick<User, 'id' | 'defaultWallet'>
    ) }
  ) }
);

export type UpdateFavoriteGenresMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateFavoriteGenresMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'favoriteGenres'>
    ) }
  ) }
);

export type UpdateHandleMutationVariables = Exact<{
  input: UpdateHandleInput;
}>;


export type UpdateHandleMutation = (
  { __typename?: 'Mutation' }
  & { updateHandle: (
    { __typename?: 'UpdateHandlePayload' }
    & { user: (
      { __typename?: 'User' }
      & Pick<User, 'id' | 'handle'>
    ) }
  ) }
);

export type UpdateMusicianTypeMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateMusicianTypeMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'musicianTypes'>
    ) }
  ) }
);

export type UpdatePostMutationVariables = Exact<{
  input: UpdatePostInput;
}>;


export type UpdatePostMutation = (
  { __typename?: 'Mutation' }
  & { updatePost: (
    { __typename?: 'UpdatePostPayload' }
    & { post: (
      { __typename?: 'Post' }
      & Pick<Post, 'id'>
    ) }
  ) }
);

export type UpdateProfileBioMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileBioMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'bio'>
    ) }
  ) }
);

export type UpdateProfileDisplayNameMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileDisplayNameMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'displayName'>
    ) }
  ) }
);

export type UpdateProfilePictureMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfilePictureMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'profilePicture'>
    ) }
  ) }
);

export type UpdateSocialMediasMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateSocialMediasMutation = (
  { __typename?: 'Mutation' }
  & { updateProfile: (
    { __typename?: 'UpdateProfilePayload' }
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

export type UpdateTrackMutationVariables = Exact<{
  input: UpdateTrackInput;
}>;


export type UpdateTrackMutation = (
  { __typename?: 'Mutation' }
  & { updateTrack: (
    { __typename?: 'UpdateTrackPayload' }
    & { track: (
      { __typename?: 'Track' }
      & TrackComponentFieldsFragment
    ) }
  ) }
);

export type UploadUrlQueryVariables = Exact<{
  fileType: Scalars['String'];
}>;


export type UploadUrlQuery = (
  { __typename?: 'Query' }
  & { uploadUrl: (
    { __typename?: 'UploadUrl' }
    & Pick<UploadUrl, 'uploadUrl' | 'fileName' | 'readUrl'>
  ) }
);

export type UserByWalletQueryVariables = Exact<{
  walletAddress: Scalars['String'];
}>;


export type UserByWalletQuery = (
  { __typename?: 'Query' }
  & { getUserByWallet: Maybe<(
    { __typename?: 'User' }
    & Pick<User, 'id'>
    & { profile: (
      { __typename?: 'Profile' }
      & Pick<Profile, 'id' | 'displayName' | 'profilePicture' | 'userHandle' | 'followerCount' | 'followingCount'>
    ) }
  )> }
);

export type WasListedBeforeQueryVariables = Exact<{
  tokenId: Scalars['Float'];
}>;


export type WasListedBeforeQuery = (
  { __typename?: 'Query' }
  & Pick<Query, 'wasListedBefore'>
);

export const CommentComponentFieldsFragmentDoc = gql`
    fragment CommentComponentFields on Comment {
  id
  body
  createdAt
  deleted
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
export const NftSoldNotificationFieldsFragmentDoc = gql`
    fragment NFTSoldNotificationFields on NFTSoldNotification {
  id
  type
  createdAt
  buyerName
  buyerPicture
  buyerProfileId
  trackId
  trackName
  artist
  artworkUrl
  price
}
    `;
export const NewPostNotificationFieldsFragmentDoc = gql`
    fragment NewPostNotificationFields on NewPostNotification {
  id
  type
  authorName
  authorPicture
  body
  link
  previewBody
  previewLink
  createdAt
  track {
    title
    playbackUrl
  }
}
    `;
export const TrackComponentFieldsFragmentDoc = gql`
    fragment TrackComponentFields on Track {
  id
  profileId
  title
  assetUrl
  artworkUrl
  description
  artist
  artistId
  artistProfileId
  album
  releaseYear
  copyright
  genres
  playbackUrl
  createdAt
  updatedAt
  deleted
  nftData {
    transactionHash
    tokenId
    contract
    minter
    ipfsCid
    pendingRequest
    owner
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
  updatedAt
  commentCount
  repostCount
  totalReactions
  topReactions(top: 2)
  myReaction
  deleted
  profile {
    id
    displayName
    profilePicture
  }
  track {
    ...TrackComponentFields
  }
}
    ${TrackComponentFieldsFragmentDoc}`;
export const ProfileComponentFieldsFragmentDoc = gql`
    fragment ProfileComponentFields on Profile {
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
  favoriteGenres
  musicianTypes
  bio
  followerCount
  followingCount
  userHandle
  isFollowed
  isSubscriber
  unreadNotificationCount
  unreadMessageCount
  createdAt
  updatedAt
}
    `;
export const ProfileVerificationRequestComponentFieldsFragmentDoc = gql`
    fragment ProfileVerificationRequestComponentFields on ProfileVerificationRequest {
  id
  profileId
  soundcloud
  youtube
  bandcamp
  status
  reason
  createdAt
  updatedAt
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
export const BandcampLinkDocument = gql`
    query BandcampLink($url: String!) {
  bandcampLink(url: $url)
}
    `;

/**
 * __useBandcampLinkQuery__
 *
 * To run a query within a React component, call `useBandcampLinkQuery` and pass it any options that fit your needs.
 * When your component renders, `useBandcampLinkQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBandcampLinkQuery({
 *   variables: {
 *      url: // value for 'url'
 *   },
 * });
 */
export function useBandcampLinkQuery(baseOptions: Apollo.QueryHookOptions<BandcampLinkQuery, BandcampLinkQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BandcampLinkQuery, BandcampLinkQueryVariables>(BandcampLinkDocument, options);
      }
export function useBandcampLinkLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BandcampLinkQuery, BandcampLinkQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BandcampLinkQuery, BandcampLinkQueryVariables>(BandcampLinkDocument, options);
        }
export type BandcampLinkQueryHookResult = ReturnType<typeof useBandcampLinkQuery>;
export type BandcampLinkLazyQueryHookResult = ReturnType<typeof useBandcampLinkLazyQuery>;
export type BandcampLinkQueryResult = Apollo.QueryResult<BandcampLinkQuery, BandcampLinkQueryVariables>;
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
export const ChatsDocument = gql`
    query Chats($page: PageInput) {
  chats(page: $page) {
    nodes {
      id
      profile {
        displayName
        profilePicture
      }
      message
      unread
      createdAt
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    `;

/**
 * __useChatsQuery__
 *
 * To run a query within a React component, call `useChatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useChatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useChatsQuery({
 *   variables: {
 *      page: // value for 'page'
 *   },
 * });
 */
export function useChatsQuery(baseOptions?: Apollo.QueryHookOptions<ChatsQuery, ChatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatsQuery, ChatsQueryVariables>(ChatsDocument, options);
      }
export function useChatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatsQuery, ChatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatsQuery, ChatsQueryVariables>(ChatsDocument, options);
        }
export type ChatsQueryHookResult = ReturnType<typeof useChatsQuery>;
export type ChatsLazyQueryHookResult = ReturnType<typeof useChatsLazyQuery>;
export type ChatsQueryResult = Apollo.QueryResult<ChatsQuery, ChatsQueryVariables>;
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
    query Comments($postId: String!, $page: PageInput) {
  comments(postId: $postId, page: $page) {
    nodes {
      ...CommentComponentFields
    }
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
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
 *      page: // value for 'page'
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
export const CreateListingItemDocument = gql`
    mutation CreateListingItem($input: CreateListingItemInput!) {
  createListingItem(input: $input) {
    id
    owner
    nft
    tokenId
    quantity
    pricePerItem
    startingTime
  }
}
    `;
export type CreateListingItemMutationFn = Apollo.MutationFunction<CreateListingItemMutation, CreateListingItemMutationVariables>;

/**
 * __useCreateListingItemMutation__
 *
 * To run a mutation, you first call `useCreateListingItemMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateListingItemMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createListingItemMutation, { data, loading, error }] = useCreateListingItemMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateListingItemMutation(baseOptions?: Apollo.MutationHookOptions<CreateListingItemMutation, CreateListingItemMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateListingItemMutation, CreateListingItemMutationVariables>(CreateListingItemDocument, options);
      }
export type CreateListingItemMutationHookResult = ReturnType<typeof useCreateListingItemMutation>;
export type CreateListingItemMutationResult = Apollo.MutationResult<CreateListingItemMutation>;
export type CreateListingItemMutationOptions = Apollo.BaseMutationOptions<CreateListingItemMutation, CreateListingItemMutationVariables>;
export const CreateMintingRequestDocument = gql`
    mutation createMintingRequest($input: CreateMintingRequestInput!) {
  createMintingRequest(input: $input) {
    mintingRequest {
      id
      transactionId
    }
  }
}
    `;
export type CreateMintingRequestMutationFn = Apollo.MutationFunction<CreateMintingRequestMutation, CreateMintingRequestMutationVariables>;

/**
 * __useCreateMintingRequestMutation__
 *
 * To run a mutation, you first call `useCreateMintingRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMintingRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMintingRequestMutation, { data, loading, error }] = useCreateMintingRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMintingRequestMutation(baseOptions?: Apollo.MutationHookOptions<CreateMintingRequestMutation, CreateMintingRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateMintingRequestMutation, CreateMintingRequestMutationVariables>(CreateMintingRequestDocument, options);
      }
export type CreateMintingRequestMutationHookResult = ReturnType<typeof useCreateMintingRequestMutation>;
export type CreateMintingRequestMutationResult = Apollo.MutationResult<CreateMintingRequestMutation>;
export type CreateMintingRequestMutationOptions = Apollo.BaseMutationOptions<CreateMintingRequestMutation, CreateMintingRequestMutationVariables>;
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
export const CreateProfileVerificationRequestDocument = gql`
    mutation CreateProfileVerificationRequest($input: CreateProfileVerificationRequestInput!) {
  createProfileVerificationRequest(input: $input) {
    profileVerificationRequest {
      ...ProfileVerificationRequestComponentFields
    }
  }
}
    ${ProfileVerificationRequestComponentFieldsFragmentDoc}`;
export type CreateProfileVerificationRequestMutationFn = Apollo.MutationFunction<CreateProfileVerificationRequestMutation, CreateProfileVerificationRequestMutationVariables>;

/**
 * __useCreateProfileVerificationRequestMutation__
 *
 * To run a mutation, you first call `useCreateProfileVerificationRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateProfileVerificationRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createProfileVerificationRequestMutation, { data, loading, error }] = useCreateProfileVerificationRequestMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateProfileVerificationRequestMutation(baseOptions?: Apollo.MutationHookOptions<CreateProfileVerificationRequestMutation, CreateProfileVerificationRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateProfileVerificationRequestMutation, CreateProfileVerificationRequestMutationVariables>(CreateProfileVerificationRequestDocument, options);
      }
export type CreateProfileVerificationRequestMutationHookResult = ReturnType<typeof useCreateProfileVerificationRequestMutation>;
export type CreateProfileVerificationRequestMutationResult = Apollo.MutationResult<CreateProfileVerificationRequestMutation>;
export type CreateProfileVerificationRequestMutationOptions = Apollo.BaseMutationOptions<CreateProfileVerificationRequestMutation, CreateProfileVerificationRequestMutationVariables>;
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
export const CreateTrackDocument = gql`
    mutation CreateTrack($input: CreateTrackInput!) {
  createTrack(input: $input) {
    track {
      ...TrackComponentFields
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;
export type CreateTrackMutationFn = Apollo.MutationFunction<CreateTrackMutation, CreateTrackMutationVariables>;

/**
 * __useCreateTrackMutation__
 *
 * To run a mutation, you first call `useCreateTrackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTrackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTrackMutation, { data, loading, error }] = useCreateTrackMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTrackMutation(baseOptions?: Apollo.MutationHookOptions<CreateTrackMutation, CreateTrackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTrackMutation, CreateTrackMutationVariables>(CreateTrackDocument, options);
      }
export type CreateTrackMutationHookResult = ReturnType<typeof useCreateTrackMutation>;
export type CreateTrackMutationResult = Apollo.MutationResult<CreateTrackMutation>;
export type CreateTrackMutationOptions = Apollo.BaseMutationOptions<CreateTrackMutation, CreateTrackMutationVariables>;
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
export const DeletePostDocument = gql`
    mutation DeletePost($input: DeletePostInput!) {
  deletePost(input: $input) {
    post {
      ...PostComponentFields
    }
  }
}
    ${PostComponentFieldsFragmentDoc}`;
export type DeletePostMutationFn = Apollo.MutationFunction<DeletePostMutation, DeletePostMutationVariables>;

/**
 * __useDeletePostMutation__
 *
 * To run a mutation, you first call `useDeletePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeletePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deletePostMutation, { data, loading, error }] = useDeletePostMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeletePostMutation(baseOptions?: Apollo.MutationHookOptions<DeletePostMutation, DeletePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeletePostMutation, DeletePostMutationVariables>(DeletePostDocument, options);
      }
export type DeletePostMutationHookResult = ReturnType<typeof useDeletePostMutation>;
export type DeletePostMutationResult = Apollo.MutationResult<DeletePostMutation>;
export type DeletePostMutationOptions = Apollo.BaseMutationOptions<DeletePostMutation, DeletePostMutationVariables>;
export const DeleteTrackOnErrorDocument = gql`
    mutation deleteTrackOnError($input: DeleteTrackInput!) {
  deleteTrackOnError(input: $input) {
    track {
      ...TrackComponentFields
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;
export type DeleteTrackOnErrorMutationFn = Apollo.MutationFunction<DeleteTrackOnErrorMutation, DeleteTrackOnErrorMutationVariables>;

/**
 * __useDeleteTrackOnErrorMutation__
 *
 * To run a mutation, you first call `useDeleteTrackOnErrorMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTrackOnErrorMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTrackOnErrorMutation, { data, loading, error }] = useDeleteTrackOnErrorMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteTrackOnErrorMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTrackOnErrorMutation, DeleteTrackOnErrorMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTrackOnErrorMutation, DeleteTrackOnErrorMutationVariables>(DeleteTrackOnErrorDocument, options);
      }
export type DeleteTrackOnErrorMutationHookResult = ReturnType<typeof useDeleteTrackOnErrorMutation>;
export type DeleteTrackOnErrorMutationResult = Apollo.MutationResult<DeleteTrackOnErrorMutation>;
export type DeleteTrackOnErrorMutationOptions = Apollo.BaseMutationOptions<DeleteTrackOnErrorMutation, DeleteTrackOnErrorMutationVariables>;
export const ExploreDocument = gql`
    query Explore($search: String) {
  explore(search: $search) {
    tracks {
      ...TrackComponentFields
    }
    profiles {
      ...ProfileComponentFields
    }
    totalTracks
    totalProfiles
  }
}
    ${TrackComponentFieldsFragmentDoc}
${ProfileComponentFieldsFragmentDoc}`;

/**
 * __useExploreQuery__
 *
 * To run a query within a React component, call `useExploreQuery` and pass it any options that fit your needs.
 * When your component renders, `useExploreQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExploreQuery({
 *   variables: {
 *      search: // value for 'search'
 *   },
 * });
 */
export function useExploreQuery(baseOptions?: Apollo.QueryHookOptions<ExploreQuery, ExploreQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExploreQuery, ExploreQueryVariables>(ExploreDocument, options);
      }
export function useExploreLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExploreQuery, ExploreQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExploreQuery, ExploreQueryVariables>(ExploreDocument, options);
        }
export type ExploreQueryHookResult = ReturnType<typeof useExploreQuery>;
export type ExploreLazyQueryHookResult = ReturnType<typeof useExploreLazyQuery>;
export type ExploreQueryResult = Apollo.QueryResult<ExploreQuery, ExploreQueryVariables>;
export const ExploreTracksDocument = gql`
    query ExploreTracks($search: String, $page: PageInput) {
  exploreTracks(search: $search, page: $page) {
    nodes {
      ...TrackComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;

/**
 * __useExploreTracksQuery__
 *
 * To run a query within a React component, call `useExploreTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useExploreTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExploreTracksQuery({
 *   variables: {
 *      search: // value for 'search'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useExploreTracksQuery(baseOptions?: Apollo.QueryHookOptions<ExploreTracksQuery, ExploreTracksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExploreTracksQuery, ExploreTracksQueryVariables>(ExploreTracksDocument, options);
      }
export function useExploreTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExploreTracksQuery, ExploreTracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExploreTracksQuery, ExploreTracksQueryVariables>(ExploreTracksDocument, options);
        }
export type ExploreTracksQueryHookResult = ReturnType<typeof useExploreTracksQuery>;
export type ExploreTracksLazyQueryHookResult = ReturnType<typeof useExploreTracksLazyQuery>;
export type ExploreTracksQueryResult = Apollo.QueryResult<ExploreTracksQuery, ExploreTracksQueryVariables>;
export const ExploreUsersDocument = gql`
    query ExploreUsers($search: String, $page: PageInput) {
  exploreUsers(search: $search, page: $page) {
    nodes {
      ...ProfileComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    ${ProfileComponentFieldsFragmentDoc}`;

/**
 * __useExploreUsersQuery__
 *
 * To run a query within a React component, call `useExploreUsersQuery` and pass it any options that fit your needs.
 * When your component renders, `useExploreUsersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useExploreUsersQuery({
 *   variables: {
 *      search: // value for 'search'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useExploreUsersQuery(baseOptions?: Apollo.QueryHookOptions<ExploreUsersQuery, ExploreUsersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ExploreUsersQuery, ExploreUsersQueryVariables>(ExploreUsersDocument, options);
      }
export function useExploreUsersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ExploreUsersQuery, ExploreUsersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ExploreUsersQuery, ExploreUsersQueryVariables>(ExploreUsersDocument, options);
        }
export type ExploreUsersQueryHookResult = ReturnType<typeof useExploreUsersQuery>;
export type ExploreUsersLazyQueryHookResult = ReturnType<typeof useExploreUsersLazyQuery>;
export type ExploreUsersQueryResult = Apollo.QueryResult<ExploreUsersQuery, ExploreUsersQueryVariables>;
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
export const FollowersDocument = gql`
    query Followers($profileId: String!, $page: PageInput) {
  followers(id: $profileId, page: $page) {
    nodes {
      id
      followerProfile {
        id
        displayName
        profilePicture
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    `;

/**
 * __useFollowersQuery__
 *
 * To run a query within a React component, call `useFollowersQuery` and pass it any options that fit your needs.
 * When your component renders, `useFollowersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFollowersQuery({
 *   variables: {
 *      profileId: // value for 'profileId'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useFollowersQuery(baseOptions: Apollo.QueryHookOptions<FollowersQuery, FollowersQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FollowersQuery, FollowersQueryVariables>(FollowersDocument, options);
      }
export function useFollowersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FollowersQuery, FollowersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FollowersQuery, FollowersQueryVariables>(FollowersDocument, options);
        }
export type FollowersQueryHookResult = ReturnType<typeof useFollowersQuery>;
export type FollowersLazyQueryHookResult = ReturnType<typeof useFollowersLazyQuery>;
export type FollowersQueryResult = Apollo.QueryResult<FollowersQuery, FollowersQueryVariables>;
export const FollowingDocument = gql`
    query Following($profileId: String!, $page: PageInput) {
  following(id: $profileId, page: $page) {
    nodes {
      id
      followedProfile {
        id
        displayName
        profilePicture
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    `;

/**
 * __useFollowingQuery__
 *
 * To run a query within a React component, call `useFollowingQuery` and pass it any options that fit your needs.
 * When your component renders, `useFollowingQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFollowingQuery({
 *   variables: {
 *      profileId: // value for 'profileId'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useFollowingQuery(baseOptions: Apollo.QueryHookOptions<FollowingQuery, FollowingQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FollowingQuery, FollowingQueryVariables>(FollowingDocument, options);
      }
export function useFollowingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FollowingQuery, FollowingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FollowingQuery, FollowingQueryVariables>(FollowingDocument, options);
        }
export type FollowingQueryHookResult = ReturnType<typeof useFollowingQuery>;
export type FollowingLazyQueryHookResult = ReturnType<typeof useFollowingLazyQuery>;
export type FollowingQueryResult = Apollo.QueryResult<FollowingQuery, FollowingQueryVariables>;
export const ListingItemDocument = gql`
    query ListingItem($tokenId: Float!) {
  listingItem(tokenId: $tokenId) {
    listingItem {
      id
      owner
      nft
      tokenId
      quantity
      pricePerItem
      startingTime
    }
  }
}
    `;

/**
 * __useListingItemQuery__
 *
 * To run a query within a React component, call `useListingItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useListingItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListingItemQuery({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useListingItemQuery(baseOptions: Apollo.QueryHookOptions<ListingItemQuery, ListingItemQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListingItemQuery, ListingItemQueryVariables>(ListingItemDocument, options);
      }
export function useListingItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListingItemQuery, ListingItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListingItemQuery, ListingItemQueryVariables>(ListingItemDocument, options);
        }
export type ListingItemQueryHookResult = ReturnType<typeof useListingItemQuery>;
export type ListingItemLazyQueryHookResult = ReturnType<typeof useListingItemLazyQuery>;
export type ListingItemQueryResult = Apollo.QueryResult<ListingItemQuery, ListingItemQueryVariables>;
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
    walletAddress
    defaultWallet
    isApprovedOnMarketplace
    roles
    profile {
      id
      displayName
      profilePicture
      coverPicture
      followerCount
      followingCount
      favoriteGenres
      musicianTypes
      bio
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
export const MimeTypeDocument = gql`
    query MimeType($url: String!) {
  mimeType(url: $url) {
    value
  }
}
    `;

/**
 * __useMimeTypeQuery__
 *
 * To run a query within a React component, call `useMimeTypeQuery` and pass it any options that fit your needs.
 * When your component renders, `useMimeTypeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMimeTypeQuery({
 *   variables: {
 *      url: // value for 'url'
 *   },
 * });
 */
export function useMimeTypeQuery(baseOptions: Apollo.QueryHookOptions<MimeTypeQuery, MimeTypeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MimeTypeQuery, MimeTypeQueryVariables>(MimeTypeDocument, options);
      }
export function useMimeTypeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MimeTypeQuery, MimeTypeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MimeTypeQuery, MimeTypeQueryVariables>(MimeTypeDocument, options);
        }
export type MimeTypeQueryHookResult = ReturnType<typeof useMimeTypeQuery>;
export type MimeTypeLazyQueryHookResult = ReturnType<typeof useMimeTypeLazyQuery>;
export type MimeTypeQueryResult = Apollo.QueryResult<MimeTypeQuery, MimeTypeQueryVariables>;
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
    ... on NewPostNotification {
      ...NewPostNotificationFields
    }
    ... on NFTSoldNotification {
      ...NFTSoldNotificationFields
    }
  }
}
    ${CommentNotificationFieldsFragmentDoc}
${ReactionNotificationFieldsFragmentDoc}
${FollowerNotificationFieldsFragmentDoc}
${NewPostNotificationFieldsFragmentDoc}
${NftSoldNotificationFieldsFragmentDoc}`;

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
      ... on NewPostNotification {
        ...NewPostNotificationFields
      }
      ... on NFTSoldNotification {
        ...NFTSoldNotificationFields
      }
    }
  }
}
    ${CommentNotificationFieldsFragmentDoc}
${ReactionNotificationFieldsFragmentDoc}
${FollowerNotificationFieldsFragmentDoc}
${NewPostNotificationFieldsFragmentDoc}
${NftSoldNotificationFieldsFragmentDoc}`;

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
export const PinJsonToIpfsDocument = gql`
    mutation pinJsonToIPFS($input: PinJsonToIPFSInput!) {
  pinJsonToIPFS(input: $input) {
    cid
  }
}
    `;
export type PinJsonToIpfsMutationFn = Apollo.MutationFunction<PinJsonToIpfsMutation, PinJsonToIpfsMutationVariables>;

/**
 * __usePinJsonToIpfsMutation__
 *
 * To run a mutation, you first call `usePinJsonToIpfsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinJsonToIpfsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinJsonToIpfsMutation, { data, loading, error }] = usePinJsonToIpfsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePinJsonToIpfsMutation(baseOptions?: Apollo.MutationHookOptions<PinJsonToIpfsMutation, PinJsonToIpfsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinJsonToIpfsMutation, PinJsonToIpfsMutationVariables>(PinJsonToIpfsDocument, options);
      }
export type PinJsonToIpfsMutationHookResult = ReturnType<typeof usePinJsonToIpfsMutation>;
export type PinJsonToIpfsMutationResult = Apollo.MutationResult<PinJsonToIpfsMutation>;
export type PinJsonToIpfsMutationOptions = Apollo.BaseMutationOptions<PinJsonToIpfsMutation, PinJsonToIpfsMutationVariables>;
export const PinToIpfsDocument = gql`
    mutation pinToIPFS($input: PinToIPFSInput!) {
  pinToIPFS(input: $input) {
    cid
  }
}
    `;
export type PinToIpfsMutationFn = Apollo.MutationFunction<PinToIpfsMutation, PinToIpfsMutationVariables>;

/**
 * __usePinToIpfsMutation__
 *
 * To run a mutation, you first call `usePinToIpfsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePinToIpfsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pinToIpfsMutation, { data, loading, error }] = usePinToIpfsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function usePinToIpfsMutation(baseOptions?: Apollo.MutationHookOptions<PinToIpfsMutation, PinToIpfsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PinToIpfsMutation, PinToIpfsMutationVariables>(PinToIpfsDocument, options);
      }
export type PinToIpfsMutationHookResult = ReturnType<typeof usePinToIpfsMutation>;
export type PinToIpfsMutationResult = Apollo.MutationResult<PinToIpfsMutation>;
export type PinToIpfsMutationOptions = Apollo.BaseMutationOptions<PinToIpfsMutation, PinToIpfsMutationVariables>;
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
    ...ProfileComponentFields
  }
}
    ${ProfileComponentFieldsFragmentDoc}`;

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
export const ProfileVerificationRequestDocument = gql`
    query ProfileVerificationRequest {
  profileVerificationRequest {
    ...ProfileVerificationRequestComponentFields
  }
}
    ${ProfileVerificationRequestComponentFieldsFragmentDoc}`;

/**
 * __useProfileVerificationRequestQuery__
 *
 * To run a query within a React component, call `useProfileVerificationRequestQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileVerificationRequestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileVerificationRequestQuery({
 *   variables: {
 *   },
 * });
 */
export function useProfileVerificationRequestQuery(baseOptions?: Apollo.QueryHookOptions<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>(ProfileVerificationRequestDocument, options);
      }
export function useProfileVerificationRequestLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>(ProfileVerificationRequestDocument, options);
        }
export type ProfileVerificationRequestQueryHookResult = ReturnType<typeof useProfileVerificationRequestQuery>;
export type ProfileVerificationRequestLazyQueryHookResult = ReturnType<typeof useProfileVerificationRequestLazyQuery>;
export type ProfileVerificationRequestQueryResult = Apollo.QueryResult<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>;
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
export const ReactionsDocument = gql`
    query Reactions($postId: String!, $page: PageInput) {
  reactions(postId: $postId, page: $page) {
    nodes {
      id
      type
      profile {
        id
        displayName
        profilePicture
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    `;

/**
 * __useReactionsQuery__
 *
 * To run a query within a React component, call `useReactionsQuery` and pass it any options that fit your needs.
 * When your component renders, `useReactionsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useReactionsQuery({
 *   variables: {
 *      postId: // value for 'postId'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useReactionsQuery(baseOptions: Apollo.QueryHookOptions<ReactionsQuery, ReactionsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReactionsQuery, ReactionsQueryVariables>(ReactionsDocument, options);
      }
export function useReactionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReactionsQuery, ReactionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReactionsQuery, ReactionsQueryVariables>(ReactionsDocument, options);
        }
export type ReactionsQueryHookResult = ReturnType<typeof useReactionsQuery>;
export type ReactionsLazyQueryHookResult = ReturnType<typeof useReactionsLazyQuery>;
export type ReactionsQueryResult = Apollo.QueryResult<ReactionsQuery, ReactionsQueryVariables>;
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
export const ResetUnreadMessageCountDocument = gql`
    mutation ResetUnreadMessageCount {
  resetUnreadMessageCount {
    id
    unreadMessageCount
  }
}
    `;
export type ResetUnreadMessageCountMutationFn = Apollo.MutationFunction<ResetUnreadMessageCountMutation, ResetUnreadMessageCountMutationVariables>;

/**
 * __useResetUnreadMessageCountMutation__
 *
 * To run a mutation, you first call `useResetUnreadMessageCountMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResetUnreadMessageCountMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resetUnreadMessageCountMutation, { data, loading, error }] = useResetUnreadMessageCountMutation({
 *   variables: {
 *   },
 * });
 */
export function useResetUnreadMessageCountMutation(baseOptions?: Apollo.MutationHookOptions<ResetUnreadMessageCountMutation, ResetUnreadMessageCountMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ResetUnreadMessageCountMutation, ResetUnreadMessageCountMutationVariables>(ResetUnreadMessageCountDocument, options);
      }
export type ResetUnreadMessageCountMutationHookResult = ReturnType<typeof useResetUnreadMessageCountMutation>;
export type ResetUnreadMessageCountMutationResult = Apollo.MutationResult<ResetUnreadMessageCountMutation>;
export type ResetUnreadMessageCountMutationOptions = Apollo.BaseMutationOptions<ResetUnreadMessageCountMutation, ResetUnreadMessageCountMutationVariables>;
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
export const SetNotValidDocument = gql`
    mutation SetNotValid($tokenId: Float!) {
  setNotValid(tokenId: $tokenId) {
    id
    owner
    nft
    tokenId
    quantity
    pricePerItem
    startingTime
  }
}
    `;
export type SetNotValidMutationFn = Apollo.MutationFunction<SetNotValidMutation, SetNotValidMutationVariables>;

/**
 * __useSetNotValidMutation__
 *
 * To run a mutation, you first call `useSetNotValidMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetNotValidMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setNotValidMutation, { data, loading, error }] = useSetNotValidMutation({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useSetNotValidMutation(baseOptions?: Apollo.MutationHookOptions<SetNotValidMutation, SetNotValidMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SetNotValidMutation, SetNotValidMutationVariables>(SetNotValidDocument, options);
      }
export type SetNotValidMutationHookResult = ReturnType<typeof useSetNotValidMutation>;
export type SetNotValidMutationResult = Apollo.MutationResult<SetNotValidMutation>;
export type SetNotValidMutationOptions = Apollo.BaseMutationOptions<SetNotValidMutation, SetNotValidMutationVariables>;
export const SubscribeToProfileDocument = gql`
    mutation SubscribeToProfile($input: SubscribeToProfileInput!) {
  subscribeToProfile(input: $input) {
    profile {
      id
      isSubscriber
    }
  }
}
    `;
export type SubscribeToProfileMutationFn = Apollo.MutationFunction<SubscribeToProfileMutation, SubscribeToProfileMutationVariables>;

/**
 * __useSubscribeToProfileMutation__
 *
 * To run a mutation, you first call `useSubscribeToProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSubscribeToProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [subscribeToProfileMutation, { data, loading, error }] = useSubscribeToProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSubscribeToProfileMutation(baseOptions?: Apollo.MutationHookOptions<SubscribeToProfileMutation, SubscribeToProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SubscribeToProfileMutation, SubscribeToProfileMutationVariables>(SubscribeToProfileDocument, options);
      }
export type SubscribeToProfileMutationHookResult = ReturnType<typeof useSubscribeToProfileMutation>;
export type SubscribeToProfileMutationResult = Apollo.MutationResult<SubscribeToProfileMutation>;
export type SubscribeToProfileMutationOptions = Apollo.BaseMutationOptions<SubscribeToProfileMutation, SubscribeToProfileMutationVariables>;
export const TrackDocument = gql`
    query Track($id: String!) {
  track(id: $id) {
    ...TrackComponentFields
  }
}
    ${TrackComponentFieldsFragmentDoc}`;

/**
 * __useTrackQuery__
 *
 * To run a query within a React component, call `useTrackQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrackQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrackQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTrackQuery(baseOptions: Apollo.QueryHookOptions<TrackQuery, TrackQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrackQuery, TrackQueryVariables>(TrackDocument, options);
      }
export function useTrackLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrackQuery, TrackQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrackQuery, TrackQueryVariables>(TrackDocument, options);
        }
export type TrackQueryHookResult = ReturnType<typeof useTrackQuery>;
export type TrackLazyQueryHookResult = ReturnType<typeof useTrackLazyQuery>;
export type TrackQueryResult = Apollo.QueryResult<TrackQuery, TrackQueryVariables>;
export const TracksDocument = gql`
    query Tracks($filter: FilterTrackInput, $sort: SortTrackInput, $page: PageInput) {
  tracks(filter: $filter, sort: $sort, page: $page) {
    nodes {
      ...TrackComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;

/**
 * __useTracksQuery__
 *
 * To run a query within a React component, call `useTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTracksQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      sort: // value for 'sort'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useTracksQuery(baseOptions?: Apollo.QueryHookOptions<TracksQuery, TracksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TracksQuery, TracksQueryVariables>(TracksDocument, options);
      }
export function useTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TracksQuery, TracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TracksQuery, TracksQueryVariables>(TracksDocument, options);
        }
export type TracksQueryHookResult = ReturnType<typeof useTracksQuery>;
export type TracksLazyQueryHookResult = ReturnType<typeof useTracksLazyQuery>;
export type TracksQueryResult = Apollo.QueryResult<TracksQuery, TracksQueryVariables>;
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
export const UnreadMessageCountDocument = gql`
    query UnreadMessageCount {
  myProfile {
    id
    unreadMessageCount
  }
}
    `;

/**
 * __useUnreadMessageCountQuery__
 *
 * To run a query within a React component, call `useUnreadMessageCountQuery` and pass it any options that fit your needs.
 * When your component renders, `useUnreadMessageCountQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUnreadMessageCountQuery({
 *   variables: {
 *   },
 * });
 */
export function useUnreadMessageCountQuery(baseOptions?: Apollo.QueryHookOptions<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>(UnreadMessageCountDocument, options);
      }
export function useUnreadMessageCountLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>(UnreadMessageCountDocument, options);
        }
export type UnreadMessageCountQueryHookResult = ReturnType<typeof useUnreadMessageCountQuery>;
export type UnreadMessageCountLazyQueryHookResult = ReturnType<typeof useUnreadMessageCountLazyQuery>;
export type UnreadMessageCountQueryResult = Apollo.QueryResult<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>;
export const UnsubscribeFromProfileDocument = gql`
    mutation UnsubscribeFromProfile($input: UnsubscribeFromProfileInput!) {
  unsubscribeFromProfile(input: $input) {
    profile {
      id
      isSubscriber
    }
  }
}
    `;
export type UnsubscribeFromProfileMutationFn = Apollo.MutationFunction<UnsubscribeFromProfileMutation, UnsubscribeFromProfileMutationVariables>;

/**
 * __useUnsubscribeFromProfileMutation__
 *
 * To run a mutation, you first call `useUnsubscribeFromProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnsubscribeFromProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unsubscribeFromProfileMutation, { data, loading, error }] = useUnsubscribeFromProfileMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUnsubscribeFromProfileMutation(baseOptions?: Apollo.MutationHookOptions<UnsubscribeFromProfileMutation, UnsubscribeFromProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UnsubscribeFromProfileMutation, UnsubscribeFromProfileMutationVariables>(UnsubscribeFromProfileDocument, options);
      }
export type UnsubscribeFromProfileMutationHookResult = ReturnType<typeof useUnsubscribeFromProfileMutation>;
export type UnsubscribeFromProfileMutationResult = Apollo.MutationResult<UnsubscribeFromProfileMutation>;
export type UnsubscribeFromProfileMutationOptions = Apollo.BaseMutationOptions<UnsubscribeFromProfileMutation, UnsubscribeFromProfileMutationVariables>;
export const UpdateCoverPictureDocument = gql`
    mutation UpdateCoverPicture($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
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
export const UpdateDefaultWalletDocument = gql`
    mutation UpdateDefaultWallet($input: UpdateDefaultWalletInput!) {
  updateDefaultWallet(input: $input) {
    user {
      id
      defaultWallet
    }
  }
}
    `;
export type UpdateDefaultWalletMutationFn = Apollo.MutationFunction<UpdateDefaultWalletMutation, UpdateDefaultWalletMutationVariables>;

/**
 * __useUpdateDefaultWalletMutation__
 *
 * To run a mutation, you first call `useUpdateDefaultWalletMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateDefaultWalletMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateDefaultWalletMutation, { data, loading, error }] = useUpdateDefaultWalletMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateDefaultWalletMutation(baseOptions?: Apollo.MutationHookOptions<UpdateDefaultWalletMutation, UpdateDefaultWalletMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateDefaultWalletMutation, UpdateDefaultWalletMutationVariables>(UpdateDefaultWalletDocument, options);
      }
export type UpdateDefaultWalletMutationHookResult = ReturnType<typeof useUpdateDefaultWalletMutation>;
export type UpdateDefaultWalletMutationResult = Apollo.MutationResult<UpdateDefaultWalletMutation>;
export type UpdateDefaultWalletMutationOptions = Apollo.BaseMutationOptions<UpdateDefaultWalletMutation, UpdateDefaultWalletMutationVariables>;
export const UpdateFavoriteGenresDocument = gql`
    mutation UpdateFavoriteGenres($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
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
export const UpdateHandleDocument = gql`
    mutation UpdateHandle($input: UpdateHandleInput!) {
  updateHandle(input: $input) {
    user {
      id
      handle
    }
  }
}
    `;
export type UpdateHandleMutationFn = Apollo.MutationFunction<UpdateHandleMutation, UpdateHandleMutationVariables>;

/**
 * __useUpdateHandleMutation__
 *
 * To run a mutation, you first call `useUpdateHandleMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateHandleMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateHandleMutation, { data, loading, error }] = useUpdateHandleMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateHandleMutation(baseOptions?: Apollo.MutationHookOptions<UpdateHandleMutation, UpdateHandleMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateHandleMutation, UpdateHandleMutationVariables>(UpdateHandleDocument, options);
      }
export type UpdateHandleMutationHookResult = ReturnType<typeof useUpdateHandleMutation>;
export type UpdateHandleMutationResult = Apollo.MutationResult<UpdateHandleMutation>;
export type UpdateHandleMutationOptions = Apollo.BaseMutationOptions<UpdateHandleMutation, UpdateHandleMutationVariables>;
export const UpdateMusicianTypeDocument = gql`
    mutation UpdateMusicianType($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    profile {
      id
      musicianTypes
    }
  }
}
    `;
export type UpdateMusicianTypeMutationFn = Apollo.MutationFunction<UpdateMusicianTypeMutation, UpdateMusicianTypeMutationVariables>;

/**
 * __useUpdateMusicianTypeMutation__
 *
 * To run a mutation, you first call `useUpdateMusicianTypeMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMusicianTypeMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMusicianTypeMutation, { data, loading, error }] = useUpdateMusicianTypeMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMusicianTypeMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMusicianTypeMutation, UpdateMusicianTypeMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMusicianTypeMutation, UpdateMusicianTypeMutationVariables>(UpdateMusicianTypeDocument, options);
      }
export type UpdateMusicianTypeMutationHookResult = ReturnType<typeof useUpdateMusicianTypeMutation>;
export type UpdateMusicianTypeMutationResult = Apollo.MutationResult<UpdateMusicianTypeMutation>;
export type UpdateMusicianTypeMutationOptions = Apollo.BaseMutationOptions<UpdateMusicianTypeMutation, UpdateMusicianTypeMutationVariables>;
export const UpdatePostDocument = gql`
    mutation UpdatePost($input: UpdatePostInput!) {
  updatePost(input: $input) {
    post {
      id
    }
  }
}
    `;
export type UpdatePostMutationFn = Apollo.MutationFunction<UpdatePostMutation, UpdatePostMutationVariables>;

/**
 * __useUpdatePostMutation__
 *
 * To run a mutation, you first call `useUpdatePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdatePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updatePostMutation, { data, loading, error }] = useUpdatePostMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdatePostMutation(baseOptions?: Apollo.MutationHookOptions<UpdatePostMutation, UpdatePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdatePostMutation, UpdatePostMutationVariables>(UpdatePostDocument, options);
      }
export type UpdatePostMutationHookResult = ReturnType<typeof useUpdatePostMutation>;
export type UpdatePostMutationResult = Apollo.MutationResult<UpdatePostMutation>;
export type UpdatePostMutationOptions = Apollo.BaseMutationOptions<UpdatePostMutation, UpdatePostMutationVariables>;
export const UpdateProfileBioDocument = gql`
    mutation updateProfileBio($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    profile {
      id
      bio
    }
  }
}
    `;
export type UpdateProfileBioMutationFn = Apollo.MutationFunction<UpdateProfileBioMutation, UpdateProfileBioMutationVariables>;

/**
 * __useUpdateProfileBioMutation__
 *
 * To run a mutation, you first call `useUpdateProfileBioMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfileBioMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfileBioMutation, { data, loading, error }] = useUpdateProfileBioMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfileBioMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProfileBioMutation, UpdateProfileBioMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProfileBioMutation, UpdateProfileBioMutationVariables>(UpdateProfileBioDocument, options);
      }
export type UpdateProfileBioMutationHookResult = ReturnType<typeof useUpdateProfileBioMutation>;
export type UpdateProfileBioMutationResult = Apollo.MutationResult<UpdateProfileBioMutation>;
export type UpdateProfileBioMutationOptions = Apollo.BaseMutationOptions<UpdateProfileBioMutation, UpdateProfileBioMutationVariables>;
export const UpdateProfileDisplayNameDocument = gql`
    mutation updateProfileDisplayName($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
    profile {
      id
      displayName
    }
  }
}
    `;
export type UpdateProfileDisplayNameMutationFn = Apollo.MutationFunction<UpdateProfileDisplayNameMutation, UpdateProfileDisplayNameMutationVariables>;

/**
 * __useUpdateProfileDisplayNameMutation__
 *
 * To run a mutation, you first call `useUpdateProfileDisplayNameMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfileDisplayNameMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfileDisplayNameMutation, { data, loading, error }] = useUpdateProfileDisplayNameMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfileDisplayNameMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProfileDisplayNameMutation, UpdateProfileDisplayNameMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProfileDisplayNameMutation, UpdateProfileDisplayNameMutationVariables>(UpdateProfileDisplayNameDocument, options);
      }
export type UpdateProfileDisplayNameMutationHookResult = ReturnType<typeof useUpdateProfileDisplayNameMutation>;
export type UpdateProfileDisplayNameMutationResult = Apollo.MutationResult<UpdateProfileDisplayNameMutation>;
export type UpdateProfileDisplayNameMutationOptions = Apollo.BaseMutationOptions<UpdateProfileDisplayNameMutation, UpdateProfileDisplayNameMutationVariables>;
export const UpdateProfilePictureDocument = gql`
    mutation UpdateProfilePicture($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
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
    mutation updateSocialMedias($input: UpdateProfileInput!) {
  updateProfile(input: $input) {
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
export const UpdateTrackDocument = gql`
    mutation updateTrack($input: UpdateTrackInput!) {
  updateTrack(input: $input) {
    track {
      ...TrackComponentFields
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;
export type UpdateTrackMutationFn = Apollo.MutationFunction<UpdateTrackMutation, UpdateTrackMutationVariables>;

/**
 * __useUpdateTrackMutation__
 *
 * To run a mutation, you first call `useUpdateTrackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTrackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTrackMutation, { data, loading, error }] = useUpdateTrackMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateTrackMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTrackMutation, UpdateTrackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTrackMutation, UpdateTrackMutationVariables>(UpdateTrackDocument, options);
      }
export type UpdateTrackMutationHookResult = ReturnType<typeof useUpdateTrackMutation>;
export type UpdateTrackMutationResult = Apollo.MutationResult<UpdateTrackMutation>;
export type UpdateTrackMutationOptions = Apollo.BaseMutationOptions<UpdateTrackMutation, UpdateTrackMutationVariables>;
export const UploadUrlDocument = gql`
    query UploadUrl($fileType: String!) {
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
export const UserByWalletDocument = gql`
    query UserByWallet($walletAddress: String!) {
  getUserByWallet(walletAddress: $walletAddress) {
    id
    profile {
      id
      displayName
      profilePicture
      userHandle
      followerCount
      followingCount
    }
  }
}
    `;

/**
 * __useUserByWalletQuery__
 *
 * To run a query within a React component, call `useUserByWalletQuery` and pass it any options that fit your needs.
 * When your component renders, `useUserByWalletQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useUserByWalletQuery({
 *   variables: {
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useUserByWalletQuery(baseOptions: Apollo.QueryHookOptions<UserByWalletQuery, UserByWalletQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserByWalletQuery, UserByWalletQueryVariables>(UserByWalletDocument, options);
      }
export function useUserByWalletLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserByWalletQuery, UserByWalletQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserByWalletQuery, UserByWalletQueryVariables>(UserByWalletDocument, options);
        }
export type UserByWalletQueryHookResult = ReturnType<typeof useUserByWalletQuery>;
export type UserByWalletLazyQueryHookResult = ReturnType<typeof useUserByWalletLazyQuery>;
export type UserByWalletQueryResult = Apollo.QueryResult<UserByWalletQuery, UserByWalletQueryVariables>;
export const WasListedBeforeDocument = gql`
    query WasListedBefore($tokenId: Float!) {
  wasListedBefore(tokenId: $tokenId)
}
    `;

/**
 * __useWasListedBeforeQuery__
 *
 * To run a query within a React component, call `useWasListedBeforeQuery` and pass it any options that fit your needs.
 * When your component renders, `useWasListedBeforeQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWasListedBeforeQuery({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useWasListedBeforeQuery(baseOptions: Apollo.QueryHookOptions<WasListedBeforeQuery, WasListedBeforeQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WasListedBeforeQuery, WasListedBeforeQueryVariables>(WasListedBeforeDocument, options);
      }
export function useWasListedBeforeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WasListedBeforeQuery, WasListedBeforeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WasListedBeforeQuery, WasListedBeforeQueryVariables>(WasListedBeforeDocument, options);
        }
export type WasListedBeforeQueryHookResult = ReturnType<typeof useWasListedBeforeQuery>;
export type WasListedBeforeLazyQueryHookResult = ReturnType<typeof useWasListedBeforeLazyQuery>;
export type WasListedBeforeQueryResult = Apollo.QueryResult<WasListedBeforeQuery, WasListedBeforeQueryVariables>;
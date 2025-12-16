import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
};

export type AddCommentInput = {
  body: Scalars['String']['input'];
  postId: Scalars['String']['input'];
};

export type AddCommentPayload = {
  __typename?: 'AddCommentPayload';
  comment: Comment;
};

export type AuctionEndedNotification = {
  __typename?: 'AuctionEndedNotification';
  artist: Scalars['String']['output'];
  artworkUrl: Scalars['String']['output'];
  auctionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  trackId: Scalars['String']['output'];
  trackName: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type AuctionIsEndingNotification = {
  __typename?: 'AuctionIsEndingNotification';
  artist: Scalars['String']['output'];
  artworkUrl: Scalars['String']['output'];
  auctionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  trackId: Scalars['String']['output'];
  trackName: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type AuctionItem = {
  __typename?: 'AuctionItem';
  contract: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  endingTime: Scalars['Float']['output'];
  highestBid: Scalars['String']['output'];
  highestBidToShow: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isPaymentOGUN: Scalars['Boolean']['output'];
  nft: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  reservePrice: Scalars['String']['output'];
  reservePriceToShow: Scalars['Float']['output'];
  startingTime: Scalars['Float']['output'];
  tokenId: Scalars['Float']['output'];
  trackEditionId: Maybe<Scalars['String']['output']>;
  trackId: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  valid: Scalars['Boolean']['output'];
};

export type AuctionItemPayload = {
  __typename?: 'AuctionItemPayload';
  auctionItem: Maybe<AuctionItem>;
};

export type AudioHolder = {
  __typename?: 'AudioHolder';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  ogunClaimed: Maybe<Scalars['Boolean']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  walletAddress: Scalars['String']['output'];
};

export enum AuthMethod {
  Discord = 'discord',
  Google = 'google',
  MagicLink = 'magicLink',
  Twitch = 'twitch'
}

export type AuthPayload = {
  __typename?: 'AuthPayload';
  jwt: Scalars['String']['output'];
};

export enum Badge {
  SupporterFirstEventAeSc = 'SUPPORTER_FIRST_EVENT_AE_SC'
}

export type Bided = {
  __typename?: 'Bided';
  bided: Maybe<Scalars['Boolean']['output']>;
};

export type BidsWithInfo = {
  __typename?: 'BidsWithInfo';
  amount: Scalars['String']['output'];
  amountToShow: Scalars['Float']['output'];
  auctionId: Scalars['String']['output'];
  bidder: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  nft: Scalars['String']['output'];
  profile: Profile;
  profileId: Scalars['String']['output'];
  tokenId: Scalars['Float']['output'];
  userId: Scalars['String']['output'];
};

export type BidsWithInfoPayload = {
  __typename?: 'BidsWithInfoPayload';
  bids: Maybe<Array<BidsWithInfo>>;
};

export type BuyNowItem = {
  __typename?: 'BuyNowItem';
  OGUNPricePerItem: Scalars['String']['output'];
  OGUNPricePerItemToShow: Scalars['Float']['output'];
  acceptsMATIC: Scalars['Boolean']['output'];
  acceptsOGUN: Scalars['Boolean']['output'];
  contract: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  nft: Scalars['String']['output'];
  owner: Scalars['String']['output'];
  pricePerItem: Scalars['String']['output'];
  pricePerItemToShow: Scalars['Float']['output'];
  selectedCurrency: Maybe<Scalars['String']['output']>;
  startingTime: Scalars['Float']['output'];
  tokenId: Scalars['Float']['output'];
  trackEditionId: Maybe<Scalars['String']['output']>;
  trackId: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  valid: Scalars['Boolean']['output'];
};

export type BuyNowPayload = {
  __typename?: 'BuyNowPayload';
  buyNowItem: Maybe<BuyNowItem>;
};

export type ChangeReactionInput = {
  postId: Scalars['String']['input'];
  type: ReactionType;
};

export type ChangeReactionPayload = {
  __typename?: 'ChangeReactionPayload';
  post: Post;
};

export type Chat = {
  __typename?: 'Chat';
  createdAt: Scalars['DateTime']['output'];
  fromId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  profile: Profile;
  readAt: Scalars['DateTime']['output'];
  unread: Scalars['Boolean']['output'];
};

export type ChatConnection = {
  __typename?: 'ChatConnection';
  nodes: Array<Chat>;
  pageInfo: PageInfo;
};

export type ClearNotificationsPayload = {
  __typename?: 'ClearNotificationsPayload';
  ok: Scalars['Boolean']['output'];
};

export type Comment = {
  __typename?: 'Comment';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  deleted: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  isGuest: Maybe<Scalars['Boolean']['output']>;
  post: Post;
  postId: Scalars['ID']['output'];
  profile: Maybe<Profile>;
  profileId: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  walletAddress: Maybe<Scalars['String']['output']>;
};

export type CommentConnection = {
  __typename?: 'CommentConnection';
  nodes: Array<Comment>;
  pageInfo: PageInfo;
};

export type CommentNotification = {
  __typename?: 'CommentNotification';
  authorName: Scalars['String']['output'];
  authorPicture: Maybe<Scalars['String']['output']>;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  previewBody: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type CountBidsPayload = {
  __typename?: 'CountBidsPayload';
  numberOfBids: Maybe<Scalars['Float']['output']>;
};

export type CreateMultipleTracksInput = {
  batchSize: Scalars['Float']['input'];
  createPost: Scalars['Boolean']['input'];
  track: CreateTrackInput;
};

export type CreateMultipleTracksPayload = {
  __typename?: 'CreateMultipleTracksPayload';
  firstTrack: Track;
  trackIds: Array<Scalars['String']['output']>;
};

export type CreatePlaylistData = {
  artworkUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  title: Scalars['String']['input'];
  trackIds?: InputMaybe<Array<Scalars['String']['input']>>;
};

export type CreatePlaylistPayload = {
  __typename?: 'CreatePlaylistPayload';
  playlist: Playlist;
};

export type CreatePlaylistTracks = {
  playlistId: Scalars['String']['input'];
  trackIds: Array<Scalars['String']['input']>;
};

export type CreatePostInput = {
  body: Scalars['String']['input'];
  mediaLink?: InputMaybe<Scalars['String']['input']>;
  originalMediaLink?: InputMaybe<Scalars['String']['input']>;
  trackEditionId?: InputMaybe<Scalars['String']['input']>;
  trackId?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePostPayload = {
  __typename?: 'CreatePostPayload';
  post: Post;
};

export type CreateProfileVerificationRequestInput = {
  bandcamp?: InputMaybe<Scalars['String']['input']>;
  reason?: InputMaybe<Scalars['String']['input']>;
  reviewerProfileId?: InputMaybe<Scalars['String']['input']>;
  soundcloud?: InputMaybe<Scalars['String']['input']>;
  status?: InputMaybe<ProfileVerificationStatusType>;
  youtube?: InputMaybe<Scalars['String']['input']>;
};

export type CreateRepostInput = {
  body: Scalars['String']['input'];
  repostId: Scalars['String']['input'];
};

export type CreateRepostPayload = {
  __typename?: 'CreateRepostPayload';
  originalPost: Post;
  post: Post;
};

export type CreateTrackEditionInput = {
  editionData?: InputMaybe<EditionDataInput>;
  editionId: Scalars['Float']['input'];
  editionSize: Scalars['Int']['input'];
  transactionHash: Scalars['String']['input'];
};

export type CreateTrackEditionPayload = {
  __typename?: 'CreateTrackEditionPayload';
  trackEdition: TrackEdition;
};

export type CreateTrackInput = {
  ISRC?: InputMaybe<Scalars['String']['input']>;
  album?: InputMaybe<Scalars['String']['input']>;
  artist?: InputMaybe<Scalars['String']['input']>;
  artistId?: InputMaybe<Scalars['String']['input']>;
  artistProfileId?: InputMaybe<Scalars['String']['input']>;
  artworkUrl?: InputMaybe<Scalars['String']['input']>;
  assetUrl: Scalars['String']['input'];
  copyright?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  genres?: InputMaybe<Array<Genre>>;
  nftData?: InputMaybe<NftDataInput>;
  releaseYear?: InputMaybe<Scalars['Float']['input']>;
  title: Scalars['String']['input'];
  trackEditionId: Scalars['String']['input'];
  utilityInfo?: InputMaybe<Scalars['String']['input']>;
};

export type CreateWhitelistEntryInput = {
  emailAddress: Scalars['String']['input'];
  walletAddress: Scalars['String']['input'];
};

export type CreateWhitelistEntryPayload = {
  __typename?: 'CreateWhitelistEntryPayload';
  whitelistEntry: WhitelistEntry;
};

export enum CurrencyType {
  Matic = 'MATIC',
  Ogun = 'OGUN'
}

export enum DefaultWallet {
  MetaMask = 'MetaMask',
  Soundchain = 'Soundchain'
}

export type DeleteCommentInput = {
  commentId: Scalars['String']['input'];
};

export type DeleteCommentPayload = {
  __typename?: 'DeleteCommentPayload';
  comment: Comment;
};

export type DeletePlaylistPayload = {
  __typename?: 'DeletePlaylistPayload';
  playlist: Playlist;
};

export type DeletePlaylistTracks = {
  playlistId: Scalars['String']['input'];
  trackIds: Array<Scalars['String']['input']>;
};

export type DeletePostInput = {
  postId: Scalars['String']['input'];
};

export type DeletePostPayload = {
  __typename?: 'DeletePostPayload';
  post: Post;
};

export type DeleteTrackInput = {
  trackId: Scalars['String']['input'];
};

export type DeletedCommentNotification = {
  __typename?: 'DeletedCommentNotification';
  authorName: Scalars['String']['output'];
  authorPicture: Maybe<Scalars['String']['output']>;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  previewBody: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type DeletedPostNotification = {
  __typename?: 'DeletedPostNotification';
  authorName: Scalars['String']['output'];
  authorPicture: Maybe<Scalars['String']['output']>;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  mediaLink: Maybe<Scalars['String']['output']>;
  previewBody: Scalars['String']['output'];
  track: Maybe<Track>;
  type: NotificationType;
};

export type EditPlaylistData = {
  artworkUrl?: InputMaybe<Scalars['String']['input']>;
  description?: InputMaybe<Scalars['String']['input']>;
  playlistId: Scalars['String']['input'];
  title: Scalars['String']['input'];
};

export type EditPlaylistPlayload = {
  __typename?: 'EditPlaylistPlayload';
  playlist: Playlist;
};

export type EditionDataInput = {
  contract?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<Scalars['String']['input']>;
  pendingRequest?: InputMaybe<PendingRequest>;
  pendingTime?: InputMaybe<Scalars['DateTime']['input']>;
  pendingTrackCount?: InputMaybe<Scalars['Float']['input']>;
  transactionHash?: InputMaybe<Scalars['String']['input']>;
};

export type EditionDataType = {
  __typename?: 'EditionDataType';
  contract: Maybe<Scalars['String']['output']>;
  owner: Maybe<Scalars['String']['output']>;
  pendingRequest: Maybe<PendingRequest>;
  pendingTime: Maybe<Scalars['DateTime']['output']>;
  pendingTrackCount: Maybe<Scalars['Float']['output']>;
  transactionHash: Maybe<Scalars['String']['output']>;
};

export type ExplorePayload = {
  __typename?: 'ExplorePayload';
  profiles: Array<Profile>;
  totalProfiles: Scalars['Float']['output'];
  totalTracks: Scalars['Float']['output'];
  tracks: Array<Track>;
};

export type FavoritePlaylist = {
  __typename?: 'FavoritePlaylist';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  playlistId: Scalars['ID']['output'];
  profileId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type FavoriteProfileTrack = {
  __typename?: 'FavoriteProfileTrack';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  profileId: Scalars['ID']['output'];
  trackEditionId: Maybe<Scalars['ID']['output']>;
  trackId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type FeedConnection = {
  __typename?: 'FeedConnection';
  nodes: Array<FeedItem>;
  pageInfo: PageInfo;
};

export type FeedItem = {
  __typename?: 'FeedItem';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  post: Post;
  postId: Scalars['ID']['output'];
  postedAt: Scalars['DateTime']['output'];
  profileId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type FilterBuyNowItemInput = {
  nftData?: InputMaybe<NftDataInput>;
  trackEdition: Scalars['String']['input'];
};

export type FilterListingItemInput = {
  contractAddress: Scalars['String']['input'];
  tokenId: Scalars['Float']['input'];
};

export type FilterOwnedBuyNowItemInput = {
  owner: Scalars['String']['input'];
  trackEditionId: Scalars['String']['input'];
};

export type FilterOwnedTracksInput = {
  owner: Scalars['String']['input'];
  trackEditionId: Scalars['String']['input'];
};

export type FilterPostInput = {
  profileId?: InputMaybe<Scalars['String']['input']>;
};

export type FilterTrackInput = {
  nftData?: InputMaybe<NftDataInput>;
  profileId?: InputMaybe<Scalars['String']['input']>;
  trackEditionId?: InputMaybe<Scalars['String']['input']>;
};

export type FilterTrackMarketplace = {
  genres?: InputMaybe<Array<Genre>>;
  listingItem?: InputMaybe<ListingItemInput>;
};

export type Follow = {
  __typename?: 'Follow';
  createdAt: Scalars['DateTime']['output'];
  followedId: Scalars['String']['output'];
  followedProfile: Profile;
  followerId: Scalars['String']['output'];
  followerProfile: Profile;
  id: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type FollowConnection = {
  __typename?: 'FollowConnection';
  nodes: Array<Follow>;
  pageInfo: PageInfo;
};

export type FollowProfileInput = {
  followedId: Scalars['String']['input'];
};

export type FollowProfilePayload = {
  __typename?: 'FollowProfilePayload';
  followedProfile: Profile;
};

export type FollowedArtistsConnection = {
  __typename?: 'FollowedArtistsConnection';
  nodes: Array<Profile>;
  pageInfo: PageInfo;
};

export type FollowerNotification = {
  __typename?: 'FollowerNotification';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  followerName: Scalars['String']['output'];
  followerPicture: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  type: NotificationType;
};

export enum Genre {
  Acoustic = 'ACOUSTIC',
  Alternative = 'ALTERNATIVE',
  Ambient = 'AMBIENT',
  Americana = 'AMERICANA',
  Blues = 'BLUES',
  Bpm = 'BPM',
  Cannabis = 'CANNABIS',
  Christian = 'CHRISTIAN',
  Classical = 'CLASSICAL',
  ClassicRock = 'CLASSIC_ROCK',
  Country = 'COUNTRY',
  CPop = 'C_POP',
  Dance = 'DANCE',
  DeepHouse = 'DEEP_HOUSE',
  Devotional = 'DEVOTIONAL',
  Electronic = 'ELECTRONIC',
  Experimental = 'EXPERIMENTAL',
  Gospel = 'GOSPEL',
  HardRock = 'HARD_ROCK',
  HipHop = 'HIP_HOP',
  House = 'HOUSE',
  Indie = 'INDIE',
  Instrumental = 'INSTRUMENTAL',
  Jazz = 'JAZZ',
  Jungle = 'JUNGLE',
  KidsAndFamily = 'KIDS_AND_FAMILY',
  KPop = 'K_POP',
  Latin = 'LATIN',
  Lofi = 'LOFI',
  Metal = 'METAL',
  MusicaMexicana = 'MUSICA_MEXICANA',
  MusicaTropical = 'MUSICA_TROPICAL',
  Podcasts = 'PODCASTS',
  Pop = 'POP',
  PopLatino = 'POP_LATINO',
  Punk = 'PUNK',
  Reggae = 'REGGAE',
  Reggaeton = 'REGGAETON',
  RAndB = 'R_AND_B',
  Salsa = 'SALSA',
  Samples = 'SAMPLES',
  SoulFunk = 'SOUL_FUNK',
  Soundbath = 'SOUNDBATH',
  Soundtrack = 'SOUNDTRACK',
  Spoken = 'SPOKEN',
  Techno = 'TECHNO',
  UrbanLatino = 'URBAN_LATINO',
  World = 'WORLD'
}

export type GenreTracks = {
  __typename?: 'GenreTracks';
  genre: Scalars['String']['output'];
  tracks: Array<Track>;
};

export type GetPlaylistPayload = {
  __typename?: 'GetPlaylistPayload';
  nodes: Array<Playlist>;
  pageInfo: PageInfo;
};

export type GetTracksFromPlaylist = {
  __typename?: 'GetTracksFromPlaylist';
  nodes: Maybe<Array<PlaylistTrack>>;
  pageInfo: PageInfo;
};

export type ListingItem = {
  __typename?: 'ListingItem';
  OGUNPricePerItem: Maybe<Scalars['String']['output']>;
  OGUNPricePerItemToShow: Maybe<Scalars['Float']['output']>;
  acceptsMATIC: Maybe<Scalars['Boolean']['output']>;
  acceptsOGUN: Maybe<Scalars['Boolean']['output']>;
  contract: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  endingTime: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  isPaymentOGUN: Maybe<Scalars['Boolean']['output']>;
  nft: Maybe<Scalars['String']['output']>;
  owner: Maybe<Scalars['String']['output']>;
  pricePerItem: Maybe<Scalars['String']['output']>;
  pricePerItemToShow: Maybe<Scalars['Float']['output']>;
  reservePrice: Maybe<Scalars['String']['output']>;
  reservePriceToShow: Maybe<Scalars['Float']['output']>;
  selectedCurrency: Maybe<Scalars['String']['output']>;
  startingTime: Maybe<Scalars['Float']['output']>;
  tokenId: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ListingItemConnection = {
  __typename?: 'ListingItemConnection';
  nodes: Array<TrackWithListingItem>;
  pageInfo: PageInfo;
};

export type ListingItemInput = {
  acceptsMATIC?: InputMaybe<Scalars['Boolean']['input']>;
  acceptsOGUN?: InputMaybe<Scalars['Boolean']['input']>;
  saleType?: InputMaybe<SaleType>;
};

export type ListingItemWithPrice = {
  __typename?: 'ListingItemWithPrice';
  OGUNPricePerItem: Maybe<Scalars['String']['output']>;
  OGUNPricePerItemToShow: Maybe<Scalars['Float']['output']>;
  acceptsMATIC: Maybe<Scalars['Boolean']['output']>;
  acceptsOGUN: Maybe<Scalars['Boolean']['output']>;
  contract: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  endingTime: Maybe<Scalars['Float']['output']>;
  id: Scalars['ID']['output'];
  isPaymentOGUN: Maybe<Scalars['Boolean']['output']>;
  nft: Maybe<Scalars['String']['output']>;
  owner: Maybe<Scalars['String']['output']>;
  pricePerItem: Maybe<Scalars['String']['output']>;
  pricePerItemToShow: Maybe<Scalars['Float']['output']>;
  priceToShow: Maybe<Scalars['Float']['output']>;
  reservePrice: Maybe<Scalars['String']['output']>;
  reservePriceToShow: Maybe<Scalars['Float']['output']>;
  selectedCurrency: Maybe<Scalars['String']['output']>;
  startingTime: Maybe<Scalars['Float']['output']>;
  tokenId: Maybe<Scalars['Float']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type LoginInput = {
  token: Scalars['String']['input'];
};

export type Message = {
  __typename?: 'Message';
  createdAt: Scalars['DateTime']['output'];
  fromId: Scalars['ID']['output'];
  fromProfile: Profile;
  id: Scalars['ID']['output'];
  message: Scalars['String']['output'];
  readAt: Maybe<Scalars['DateTime']['output']>;
  toId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type MessageConnection = {
  __typename?: 'MessageConnection';
  nodes: Array<Message>;
  pageInfo: PageInfo;
};

export type MimeType = {
  __typename?: 'MimeType';
  value: Scalars['String']['output'];
};

export enum MusicianType {
  BeatMaker = 'BEAT_MAKER',
  Dj = 'DJ',
  Drummer = 'DRUMMER',
  Emcee = 'EMCEE',
  Engineer = 'ENGINEER',
  Guitarist = 'GUITARIST',
  Instrumentalist = 'INSTRUMENTALIST',
  NotAnArtist = 'NOT_AN_ARTIST',
  Producer = 'PRODUCER',
  Singer = 'SINGER'
}

export type Mutation = {
  __typename?: 'Mutation';
  addComment: AddCommentPayload;
  changeReaction: ChangeReactionPayload;
  claimBadgeProfile: UpdateProfilePayload;
  clearNotifications: ClearNotificationsPayload;
  createMultipleTracks: CreateMultipleTracksPayload;
  createPlaylist: CreatePlaylistPayload;
  createPlaylistTracks: CreatePlaylistPayload;
  createPost: CreatePostPayload;
  createProfileVerificationRequest: ProfileVerificationRequestPayload;
  createRepost: CreateRepostPayload;
  createTrackEdition: CreateTrackEditionPayload;
  createWhitelistEntry: CreateWhitelistEntryPayload;
  deleteComment: DeleteCommentPayload;
  deletePlaylistTracks: DeletePlaylistPayload;
  deletePost: DeletePostPayload;
  deleteTrack: Track;
  deleteTrackEdition: Array<Track>;
  deleteTrackOnError: UpdateTrackPayload;
  followProfile: FollowProfilePayload;
  guestAddComment: AddCommentPayload;
  guestCreatePost: CreatePostPayload;
  guestDeletePost: DeletePostPayload;
  guestReactToPost: ReactToPostPayload;
  guestRetractReaction: RetractReactionPayload;
  login: AuthPayload;
  pinJsonToIPFS: PinningPayload;
  pinToIPFS: PinningPayload;
  reactToPost: ReactToPostPayload;
  register: AuthPayload;
  removeProfileVerificationRequest: ProfileVerificationRequestPayload;
  resetNotificationCount: Profile;
  resetUnreadMessageCount: Profile;
  retractReaction: RetractReactionPayload;
  sendMessage: SendMessagePayload;
  subscribeToProfile: SubscribeToProfilePayload;
  toggleFavorite: ToggleFavoritePayload;
  togglePlaylistFavorite: FavoritePlaylist;
  togglePlaylistFollow: FavoritePlaylist;
  unfollowProfile: UnfollowProfilePayload;
  unsubscribeFromProfile: UnsubscribeFromProfilePayload;
  updateComment: UpdateCommentPayload;
  updateDefaultWallet: UpdateDefaultWalletPayload;
  updateEditionOwnedTracks: UpdateEditionOwnedTracksPayload;
  updateHandle: UpdateHandlePayload;
  updateMetaMaskAddresses: UpdateDefaultWalletPayload;
  updateOTP: UpdateOtpPayload;
  updateOgunClaimedAudioHolder: UpdateOgunClaimedAudioHolderPayload;
  updateOgunClaimedWhitelist: UpdateWhitelistEntryPayload;
  updatePlaylist: EditPlaylistPlayload;
  updatePost: UpdatePostPayload;
  updateProfile: UpdateProfilePayload;
  updateProfileVerificationRequest: ProfileVerificationRequestPayload;
  updateTrack: UpdateTrackPayload;
  validateOTPRecoveryPhrase: Scalars['Boolean']['output'];
};


export type MutationAddCommentArgs = {
  input: AddCommentInput;
};


export type MutationChangeReactionArgs = {
  input: ChangeReactionInput;
};


export type MutationCreateMultipleTracksArgs = {
  input: CreateMultipleTracksInput;
};


export type MutationCreatePlaylistArgs = {
  input: CreatePlaylistData;
};


export type MutationCreatePlaylistTracksArgs = {
  input: CreatePlaylistTracks;
};


export type MutationCreatePostArgs = {
  input: CreatePostInput;
};


export type MutationCreateProfileVerificationRequestArgs = {
  input: CreateProfileVerificationRequestInput;
};


export type MutationCreateRepostArgs = {
  input: CreateRepostInput;
};


export type MutationCreateTrackEditionArgs = {
  input: CreateTrackEditionInput;
};


export type MutationCreateWhitelistEntryArgs = {
  input: CreateWhitelistEntryInput;
};


export type MutationDeleteCommentArgs = {
  input: DeleteCommentInput;
};


export type MutationDeletePlaylistTracksArgs = {
  input: DeletePlaylistTracks;
};


export type MutationDeletePostArgs = {
  input: DeletePostInput;
};


export type MutationDeleteTrackArgs = {
  trackId: Scalars['String']['input'];
};


export type MutationDeleteTrackEditionArgs = {
  trackEditionId: Scalars['String']['input'];
};


export type MutationDeleteTrackOnErrorArgs = {
  input: DeleteTrackInput;
};


export type MutationFollowProfileArgs = {
  input: FollowProfileInput;
};


export type MutationGuestAddCommentArgs = {
  input: AddCommentInput;
  walletAddress: Scalars['String']['input'];
};


export type MutationGuestCreatePostArgs = {
  input: CreatePostInput;
  walletAddress: Scalars['String']['input'];
};


export type MutationGuestDeletePostArgs = {
  postId: Scalars['String']['input'];
  walletAddress: Scalars['String']['input'];
};


export type MutationGuestReactToPostArgs = {
  input: ReactToPostInput;
  walletAddress: Scalars['String']['input'];
};


export type MutationGuestRetractReactionArgs = {
  postId: Scalars['String']['input'];
  walletAddress: Scalars['String']['input'];
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationPinJsonToIpfsArgs = {
  input: PinJsonToIpfsInput;
};


export type MutationPinToIpfsArgs = {
  input: PinToIpfsInput;
};


export type MutationReactToPostArgs = {
  input: ReactToPostInput;
};


export type MutationRegisterArgs = {
  input: RegisterInput;
};


export type MutationRemoveProfileVerificationRequestArgs = {
  id: Scalars['String']['input'];
};


export type MutationRetractReactionArgs = {
  input: RetractReactionInput;
};


export type MutationSendMessageArgs = {
  input: SendMessageInput;
};


export type MutationSubscribeToProfileArgs = {
  input: SubscribeToProfileInput;
};


export type MutationToggleFavoriteArgs = {
  trackId: Scalars['String']['input'];
};


export type MutationTogglePlaylistFavoriteArgs = {
  playlistId: Scalars['String']['input'];
};


export type MutationTogglePlaylistFollowArgs = {
  playlistId: Scalars['String']['input'];
};


export type MutationUnfollowProfileArgs = {
  input: UnfollowProfileInput;
};


export type MutationUnsubscribeFromProfileArgs = {
  input: UnsubscribeFromProfileInput;
};


export type MutationUpdateCommentArgs = {
  input: UpdateCommentInput;
};


export type MutationUpdateDefaultWalletArgs = {
  input: UpdateDefaultWalletInput;
};


export type MutationUpdateEditionOwnedTracksArgs = {
  input: UpdateEditionOwnedTracksInput;
};


export type MutationUpdateHandleArgs = {
  input: UpdateHandleInput;
};


export type MutationUpdateMetaMaskAddressesArgs = {
  input: UpdateWalletInput;
};


export type MutationUpdateOtpArgs = {
  input: UpdateOtpInput;
};


export type MutationUpdateOgunClaimedAudioHolderArgs = {
  input: UpdateOgunClaimedInput;
};


export type MutationUpdateOgunClaimedWhitelistArgs = {
  input: UpdateOgunClaimedInput;
};


export type MutationUpdatePlaylistArgs = {
  input: EditPlaylistData;
};


export type MutationUpdatePostArgs = {
  input: UpdatePostInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateProfileVerificationRequestArgs = {
  id: Scalars['String']['input'];
  input: CreateProfileVerificationRequestInput;
};


export type MutationUpdateTrackArgs = {
  input: UpdateTrackInput;
};


export type MutationValidateOtpRecoveryPhraseArgs = {
  input: ValidateOtpRecoveryPhraseInput;
};

export type NftDataInput = {
  contract?: InputMaybe<Scalars['String']['input']>;
  ipfsCid?: InputMaybe<Scalars['String']['input']>;
  minter?: InputMaybe<Scalars['String']['input']>;
  owner?: InputMaybe<Scalars['String']['input']>;
  pendingRequest?: InputMaybe<PendingRequest>;
  pendingTime?: InputMaybe<Scalars['DateTime']['input']>;
  tokenId?: InputMaybe<Scalars['Float']['input']>;
  transactionHash?: InputMaybe<Scalars['String']['input']>;
};

export type NftDataType = {
  __typename?: 'NFTDataType';
  contract: Maybe<Scalars['String']['output']>;
  ipfsCid: Maybe<Scalars['String']['output']>;
  minter: Maybe<Scalars['String']['output']>;
  owner: Maybe<Scalars['String']['output']>;
  pendingRequest: Maybe<PendingRequest>;
  pendingTime: Maybe<Scalars['DateTime']['output']>;
  tokenId: Maybe<Scalars['Float']['output']>;
  transactionHash: Maybe<Scalars['String']['output']>;
};

export type NftSoldNotification = {
  __typename?: 'NFTSoldNotification';
  artist: Scalars['String']['output'];
  artworkUrl: Scalars['String']['output'];
  buyerName: Scalars['String']['output'];
  buyerPicture: Scalars['String']['output'];
  buyerProfileId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  isPaymentOgun: Maybe<Scalars['Boolean']['output']>;
  price: Scalars['Float']['output'];
  sellType: SellType;
  trackId: Scalars['String']['output'];
  trackName: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type NewBidNotification = {
  __typename?: 'NewBidNotification';
  artist: Scalars['String']['output'];
  artworkUrl: Scalars['String']['output'];
  auctionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  trackId: Scalars['String']['output'];
  trackName: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type NewPostNotification = {
  __typename?: 'NewPostNotification';
  authorName: Scalars['String']['output'];
  authorPicture: Maybe<Scalars['String']['output']>;
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  previewBody: Scalars['String']['output'];
  previewLink: Maybe<Scalars['String']['output']>;
  track: Maybe<Track>;
  type: NotificationType;
};

export type NewVerificationRequestNotification = {
  __typename?: 'NewVerificationRequestNotification';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
  verificationRequestId: Scalars['String']['output'];
};

export type Notification = AuctionEndedNotification | AuctionIsEndingNotification | CommentNotification | DeletedCommentNotification | DeletedPostNotification | FollowerNotification | NftSoldNotification | NewBidNotification | NewPostNotification | NewVerificationRequestNotification | OutbidNotification | ReactionNotification | VerificationRequestNotification | WonAuctionNotification;

export type NotificationConnection = {
  __typename?: 'NotificationConnection';
  nodes: Array<Notification>;
  pageInfo: PageInfo;
};

export enum NotificationType {
  AuctionEnded = 'AuctionEnded',
  AuctionIsEnding = 'AuctionIsEnding',
  Comment = 'Comment',
  DeletedComment = 'DeletedComment',
  DeletedPost = 'DeletedPost',
  Follower = 'Follower',
  NftSold = 'NFTSold',
  NewBid = 'NewBid',
  NewPost = 'NewPost',
  NewVerificationRequest = 'NewVerificationRequest',
  Outbid = 'Outbid',
  Reaction = 'Reaction',
  VerificationRequestUpdate = 'VerificationRequestUpdate',
  WonAuction = 'WonAuction'
}

export type OutbidNotification = {
  __typename?: 'OutbidNotification';
  artist: Scalars['String']['output'];
  artworkUrl: Scalars['String']['output'];
  auctionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  trackId: Scalars['String']['output'];
  trackName: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type PageInfo = {
  __typename?: 'PageInfo';
  endCursor: Maybe<Scalars['String']['output']>;
  hasNextPage: Scalars['Boolean']['output'];
  hasPreviousPage: Scalars['Boolean']['output'];
  startCursor: Maybe<Scalars['String']['output']>;
  totalCount: Scalars['Float']['output'];
};

export type PageInput = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  inclusive?: InputMaybe<Scalars['Boolean']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};

export enum PendingRequest {
  Buy = 'Buy',
  CancelAuction = 'CancelAuction',
  CancelListing = 'CancelListing',
  CompleteAuction = 'CompleteAuction',
  List = 'List',
  Mint = 'Mint',
  None = 'None',
  PlaceBid = 'PlaceBid',
  UpdateListing = 'UpdateListing'
}

export type PinJsonToIpfsInput = {
  fileName: Scalars['String']['input'];
  json: Scalars['JSON']['input'];
};

export type PinToIpfsInput = {
  fileKey: Scalars['String']['input'];
  fileName: Scalars['String']['input'];
};

export type PinningPayload = {
  __typename?: 'PinningPayload';
  cid: Scalars['String']['output'];
};

export type Playlist = {
  __typename?: 'Playlist';
  artworkUrl: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deleted: Maybe<Scalars['Boolean']['output']>;
  description: Maybe<Scalars['String']['output']>;
  favoriteCount: Scalars['Float']['output'];
  followCount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
  isFollowed: Scalars['Boolean']['output'];
  profileId: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  tracks: Maybe<GetTracksFromPlaylist>;
  updatedAt: Scalars['DateTime']['output'];
};

export type PlaylistTrack = {
  __typename?: 'PlaylistTrack';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  playlistId: Scalars['ID']['output'];
  profileId: Scalars['ID']['output'];
  trackId: Scalars['ID']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type PolygonscanResult = {
  __typename?: 'PolygonscanResult';
  nextPage: Maybe<Scalars['String']['output']>;
  result: Array<PolygonscanResultObj>;
};

export type PolygonscanResultObj = {
  __typename?: 'PolygonscanResultObj';
  blockHash: Scalars['String']['output'];
  blockNumber: Scalars['String']['output'];
  confirmations: Scalars['String']['output'];
  contractAddress: Scalars['String']['output'];
  cumulativeGasUsed: Scalars['String']['output'];
  date: Scalars['String']['output'];
  from: Scalars['String']['output'];
  gas: Scalars['String']['output'];
  gasPrice: Scalars['String']['output'];
  gasUsed: Scalars['String']['output'];
  hash: Scalars['String']['output'];
  input: Scalars['String']['output'];
  isError: Scalars['String']['output'];
  method: Maybe<Scalars['String']['output']>;
  nonce: Scalars['String']['output'];
  timeStamp: Scalars['String']['output'];
  to: Scalars['String']['output'];
  transactionIndex: Scalars['String']['output'];
  txreceipt_status: Scalars['String']['output'];
  value: Scalars['String']['output'];
};

export type Post = {
  __typename?: 'Post';
  body: Maybe<Scalars['String']['output']>;
  commentCount: Scalars['Float']['output'];
  comments: Array<Comment>;
  createdAt: Scalars['DateTime']['output'];
  deleted: Maybe<Scalars['Boolean']['output']>;
  id: Scalars['ID']['output'];
  isGuest: Scalars['Boolean']['output'];
  mediaLink: Maybe<Scalars['String']['output']>;
  mediaThumbnail: Maybe<Scalars['String']['output']>;
  myReaction: Maybe<ReactionType>;
  originalMediaLink: Maybe<Scalars['String']['output']>;
  profile: Maybe<Profile>;
  profileId: Maybe<Scalars['ID']['output']>;
  repostCount: Scalars['Float']['output'];
  repostId: Maybe<Scalars['ID']['output']>;
  topReactions: Array<ReactionType>;
  totalReactions: Scalars['Float']['output'];
  track: Maybe<Track>;
  trackEditionId: Maybe<Scalars['ID']['output']>;
  trackId: Maybe<Scalars['ID']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  walletAddress: Maybe<Scalars['String']['output']>;
};


export type PostTopReactionsArgs = {
  top: Scalars['Float']['input'];
};

export type PostConnection = {
  __typename?: 'PostConnection';
  nodes: Array<Post>;
  pageInfo: PageInfo;
};

export type Profile = {
  __typename?: 'Profile';
  badges: Maybe<Array<Badge>>;
  bio: Maybe<Scalars['String']['output']>;
  coverPicture: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  displayName: Scalars['String']['output'];
  favoriteGenres: Maybe<Array<Genre>>;
  followerCount: Scalars['Float']['output'];
  followingCount: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  isFollowed: Scalars['Boolean']['output'];
  isSubscriber: Scalars['Boolean']['output'];
  magicWalletAddress: Maybe<Scalars['String']['output']>;
  musicianTypes: Maybe<Array<MusicianType>>;
  profilePicture: Maybe<Scalars['String']['output']>;
  socialMedias: SocialMedias;
  teamMember: Scalars['Boolean']['output'];
  unreadMessageCount: Scalars['Float']['output'];
  unreadNotificationCount: Scalars['Float']['output'];
  updatedAt: Scalars['DateTime']['output'];
  userHandle: Scalars['String']['output'];
  verified: Maybe<Scalars['Boolean']['output']>;
};

export type ProfileConnection = {
  __typename?: 'ProfileConnection';
  nodes: Array<Profile>;
  pageInfo: PageInfo;
};

export type ProfileVerificationRequest = {
  __typename?: 'ProfileVerificationRequest';
  bandcamp: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  profileId: Scalars['ID']['output'];
  reason: Maybe<Scalars['String']['output']>;
  reviewerProfileId: Maybe<Scalars['ID']['output']>;
  soundcloud: Maybe<Scalars['String']['output']>;
  status: Maybe<ProfileVerificationStatusType>;
  updatedAt: Scalars['DateTime']['output'];
  youtube: Maybe<Scalars['String']['output']>;
};

export type ProfileVerificationRequestConnection = {
  __typename?: 'ProfileVerificationRequestConnection';
  nodes: Array<ProfileVerificationRequest>;
  pageInfo: PageInfo;
};

export type ProfileVerificationRequestPayload = {
  __typename?: 'ProfileVerificationRequestPayload';
  profileVerificationRequest: ProfileVerificationRequest;
};

export enum ProfileVerificationStatusType {
  Approved = 'APPROVED',
  Denied = 'DENIED',
  Pending = 'PENDING'
}

export type ProofBookItem = {
  __typename?: 'ProofBookItem';
  address: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  merkleProof: Array<Scalars['String']['output']>;
  root: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
  value: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  auctionItem: AuctionItemPayload;
  audioHolderByWallet: AudioHolder;
  bandcampLink: Scalars['String']['output'];
  bidsWithInfo: BidsWithInfoPayload;
  buyNowItem: BuyNowPayload;
  buyNowListingItems: ListingItemConnection;
  chatHistory: MessageConnection;
  chats: ChatConnection;
  cheapestListingItem: Maybe<TrackPrice>;
  comment: Comment;
  comments: CommentConnection;
  countBids: CountBidsPayload;
  explore: ExplorePayload;
  exploreTracks: TrackConnection;
  exploreUsers: ProfileConnection;
  favoriteTracks: TrackConnection;
  feed: FeedConnection;
  followedArtists: FollowedArtistsConnection;
  followers: FollowConnection;
  following: FollowConnection;
  getInternalTransactionHistory: PolygonscanResult;
  getOriginalPostFromTrack: Post;
  getProofBookByWallet: Maybe<ProofBookItem>;
  getTransactionHistory: PolygonscanResult;
  getUserByWallet: Maybe<User>;
  getUserPlaylists: GetPlaylistPayload;
  groupedTracks: TrackConnection;
  haveBided: Bided;
  listableOwnedTracks: TrackConnection;
  listingItem: Maybe<ListingItem>;
  listingItems: ListingItemConnection;
  maticUsd: Scalars['String']['output'];
  me: Maybe<User>;
  message: Message;
  mimeType: MimeType;
  myProfile: Profile;
  notification: Notification;
  notifications: NotificationConnection;
  ownedBuyNowListingItems: ListingItemConnection;
  ownedTracks: TrackConnection;
  pendingRequestsBadgeNumber: Scalars['Float']['output'];
  post: Post;
  posts: PostConnection;
  profile: Profile;
  profileByHandle: Profile;
  profileVerificationRequest: ProfileVerificationRequest;
  profileVerificationRequests: ProfileVerificationRequestConnection;
  reactions: ReactionConnection;
  track: Track;
  trackEdition: TrackEdition;
  tracks: TrackConnection;
  tracksByGenre: Array<GenreTracks>;
  uploadUrl: UploadUrl;
  whitelistEntryByWallet: WhitelistEntry;
};


export type QueryAuctionItemArgs = {
  tokenId: Scalars['Float']['input'];
};


export type QueryAudioHolderByWalletArgs = {
  walletAdress: Scalars['String']['input'];
};


export type QueryBandcampLinkArgs = {
  url: Scalars['String']['input'];
};


export type QueryBidsWithInfoArgs = {
  auctionId: Scalars['String']['input'];
};


export type QueryBuyNowItemArgs = {
  input: FilterListingItemInput;
};


export type QueryBuyNowListingItemsArgs = {
  filter?: InputMaybe<FilterBuyNowItemInput>;
  page?: InputMaybe<PageInput>;
};


export type QueryChatHistoryArgs = {
  page?: InputMaybe<PageInput>;
  profileId: Scalars['String']['input'];
};


export type QueryChatsArgs = {
  page?: InputMaybe<PageInput>;
};


export type QueryCheapestListingItemArgs = {
  trackEditionId: Scalars['String']['input'];
};


export type QueryCommentArgs = {
  id: Scalars['String']['input'];
};


export type QueryCommentsArgs = {
  page?: InputMaybe<PageInput>;
  postId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryCountBidsArgs = {
  tokenId: Scalars['Float']['input'];
};


export type QueryExploreArgs = {
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryExploreTracksArgs = {
  page?: InputMaybe<PageInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<SortExploreTracks>;
};


export type QueryExploreUsersArgs = {
  page?: InputMaybe<PageInput>;
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFavoriteTracksArgs = {
  page?: InputMaybe<PageInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  sort?: InputMaybe<SortTrackInput>;
};


export type QueryFeedArgs = {
  page?: InputMaybe<PageInput>;
};


export type QueryFollowedArtistsArgs = {
  page?: InputMaybe<PageInput>;
  profileId: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
};


export type QueryFollowersArgs = {
  id: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
};


export type QueryFollowingArgs = {
  id: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
};


export type QueryGetInternalTransactionHistoryArgs = {
  page?: InputMaybe<PageInput>;
  wallet: Scalars['String']['input'];
};


export type QueryGetOriginalPostFromTrackArgs = {
  trackId: Scalars['String']['input'];
};


export type QueryGetProofBookByWalletArgs = {
  walletAddress: Scalars['String']['input'];
};


export type QueryGetTransactionHistoryArgs = {
  page?: InputMaybe<PageInput>;
  wallet: Scalars['String']['input'];
};


export type QueryGetUserByWalletArgs = {
  walletAddress: Scalars['String']['input'];
};


export type QueryGetUserPlaylistsArgs = {
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<SortPlaylistInput>;
};


export type QueryGroupedTracksArgs = {
  filter?: InputMaybe<FilterTrackInput>;
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<SortTrackInput>;
};


export type QueryHaveBidedArgs = {
  auctionId: Scalars['String']['input'];
  bidder: Scalars['String']['input'];
};


export type QueryListableOwnedTracksArgs = {
  filter: FilterOwnedTracksInput;
};


export type QueryListingItemArgs = {
  input: FilterListingItemInput;
};


export type QueryListingItemsArgs = {
  filter?: InputMaybe<FilterTrackMarketplace>;
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<SortListingItemInput>;
};


export type QueryMessageArgs = {
  id: Scalars['String']['input'];
};


export type QueryMimeTypeArgs = {
  url: Scalars['String']['input'];
};


export type QueryNotificationArgs = {
  id: Scalars['String']['input'];
};


export type QueryNotificationsArgs = {
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<SortNotificationInput>;
};


export type QueryOwnedBuyNowListingItemsArgs = {
  filter?: InputMaybe<FilterOwnedBuyNowItemInput>;
};


export type QueryOwnedTracksArgs = {
  filter: FilterOwnedTracksInput;
  page?: InputMaybe<PageInput>;
};


export type QueryPostArgs = {
  id: Scalars['String']['input'];
};


export type QueryPostsArgs = {
  filter?: InputMaybe<FilterPostInput>;
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<SortPostInput>;
};


export type QueryProfileArgs = {
  id: Scalars['String']['input'];
};


export type QueryProfileByHandleArgs = {
  handle: Scalars['String']['input'];
};


export type QueryProfileVerificationRequestArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
  profileId?: InputMaybe<Scalars['String']['input']>;
};


export type QueryProfileVerificationRequestsArgs = {
  page?: InputMaybe<PageInput>;
  status?: InputMaybe<ProfileVerificationStatusType>;
};


export type QueryReactionsArgs = {
  page?: InputMaybe<PageInput>;
  postId: Scalars['String']['input'];
};


export type QueryTrackArgs = {
  id: Scalars['String']['input'];
};


export type QueryTrackEditionArgs = {
  id: Scalars['String']['input'];
};


export type QueryTracksArgs = {
  filter?: InputMaybe<FilterTrackInput>;
  page?: InputMaybe<PageInput>;
  sort?: InputMaybe<SortTrackInput>;
};


export type QueryTracksByGenreArgs = {
  limit?: InputMaybe<Scalars['Float']['input']>;
};


export type QueryUploadUrlArgs = {
  fileType: Scalars['String']['input'];
};


export type QueryWhitelistEntryByWalletArgs = {
  walletAdress: Scalars['String']['input'];
};

export type ReactToPostInput = {
  postId: Scalars['String']['input'];
  type: ReactionType;
};

export type ReactToPostPayload = {
  __typename?: 'ReactToPostPayload';
  post: Post;
};

export type Reaction = {
  __typename?: 'Reaction';
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  isGuest: Scalars['Boolean']['output'];
  postId: Scalars['ID']['output'];
  profile: Profile;
  profileId: Maybe<Scalars['ID']['output']>;
  type: ReactionType;
  updatedAt: Scalars['DateTime']['output'];
  walletAddress: Maybe<Scalars['String']['output']>;
};

export type ReactionConnection = {
  __typename?: 'ReactionConnection';
  nodes: Array<Reaction>;
  pageInfo: PageInfo;
};

export type ReactionNotification = {
  __typename?: 'ReactionNotification';
  authorName: Scalars['String']['output'];
  authorPicture: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  link: Scalars['String']['output'];
  postId: Scalars['String']['output'];
  reactionType: ReactionType;
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export enum ReactionType {
  Happy = 'HAPPY',
  Heart = 'HEART',
  Horns = 'HORNS',
  Sad = 'SAD',
  Sunglasses = 'SUNGLASSES'
}

export type RegisterInput = {
  displayName: Scalars['String']['input'];
  handle: Scalars['String']['input'];
  token: Scalars['String']['input'];
};

export type RetractReactionInput = {
  postId: Scalars['String']['input'];
};

export type RetractReactionPayload = {
  __typename?: 'RetractReactionPayload';
  post: Post;
};

export enum Role {
  Admin = 'ADMIN',
  SoundchainAccount = 'SOUNDCHAIN_ACCOUNT',
  System = 'SYSTEM',
  TeamMember = 'TEAM_MEMBER',
  User = 'USER'
}

export enum SaleType {
  Auction = 'AUCTION',
  BuyNow = 'BUY_NOW'
}

export enum SellType {
  Auction = 'Auction',
  BuyNow = 'BuyNow'
}

export type SendMessageInput = {
  message: Scalars['String']['input'];
  toId: Scalars['String']['input'];
};

export type SendMessagePayload = {
  __typename?: 'SendMessagePayload';
  message: Message;
};

export type SocialMedias = {
  __typename?: 'SocialMedias';
  bandcamp: Maybe<Scalars['String']['output']>;
  discord: Maybe<Scalars['String']['output']>;
  facebook: Maybe<Scalars['String']['output']>;
  instagram: Maybe<Scalars['String']['output']>;
  linktree: Maybe<Scalars['String']['output']>;
  soundcloud: Maybe<Scalars['String']['output']>;
  spotify: Maybe<Scalars['String']['output']>;
  telegram: Maybe<Scalars['String']['output']>;
  twitter: Maybe<Scalars['String']['output']>;
};

export type SocialMediasInput = {
  bandcamp?: InputMaybe<Scalars['String']['input']>;
  discord?: InputMaybe<Scalars['String']['input']>;
  facebook?: InputMaybe<Scalars['String']['input']>;
  instagram?: InputMaybe<Scalars['String']['input']>;
  linktree?: InputMaybe<Scalars['String']['input']>;
  soundcloud?: InputMaybe<Scalars['String']['input']>;
  spotify?: InputMaybe<Scalars['String']['input']>;
  telegram?: InputMaybe<Scalars['String']['input']>;
  twitter?: InputMaybe<Scalars['String']['input']>;
};

export type SortExploreTracks = {
  field: SortExploreTracksField;
  order?: InputMaybe<SortOrder>;
};

export enum SortExploreTracksField {
  CreatedAt = 'CREATED_AT',
  PlaybackCount = 'PLAYBACK_COUNT'
}

export enum SortListingItemField {
  CreatedAt = 'CREATED_AT',
  PlaybackCount = 'PLAYBACK_COUNT',
  Price = 'PRICE'
}

export type SortListingItemInput = {
  field: SortListingItemField;
  order?: InputMaybe<SortOrder>;
};

export enum SortNotificationField {
  CreatedAt = 'CREATED_AT'
}

export type SortNotificationInput = {
  field: SortNotificationField;
  order?: InputMaybe<SortOrder>;
};

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum SortPlaylistField {
  CreatedAt = 'CREATED_AT'
}

export type SortPlaylistInput = {
  field: SortPlaylistField;
  order?: InputMaybe<SortOrder>;
};

export enum SortPostField {
  CreatedAt = 'CREATED_AT'
}

export type SortPostInput = {
  field: SortPostField;
  order?: InputMaybe<SortOrder>;
};

export enum SortTrackField {
  CreatedAt = 'CREATED_AT',
  PlaybackCount = 'PLAYBACK_COUNT'
}

export type SortTrackInput = {
  field: SortTrackField;
  order?: InputMaybe<SortOrder>;
};

export type SubscribeToProfileInput = {
  profileId: Scalars['String']['input'];
};

export type SubscribeToProfilePayload = {
  __typename?: 'SubscribeToProfilePayload';
  profile: Profile;
};

export type ToggleFavoritePayload = {
  __typename?: 'ToggleFavoritePayload';
  favoriteProfileTrack: FavoriteProfileTrack;
};

export type Track = {
  __typename?: 'Track';
  ISRC: Maybe<Scalars['String']['output']>;
  album: Maybe<Scalars['String']['output']>;
  artist: Maybe<Scalars['String']['output']>;
  artistId: Maybe<Scalars['String']['output']>;
  artistProfileId: Maybe<Scalars['String']['output']>;
  artworkUrl: Maybe<Scalars['String']['output']>;
  assetUrl: Scalars['String']['output'];
  copyright: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deleted: Maybe<Scalars['Boolean']['output']>;
  description: Maybe<Scalars['String']['output']>;
  editionSize: Scalars['Float']['output'];
  favoriteCount: Scalars['Float']['output'];
  genres: Maybe<Array<Genre>>;
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
  listingCount: Scalars['Float']['output'];
  listingItem: Maybe<ListingItem>;
  nftData: Maybe<NftDataType>;
  playbackCount: Scalars['Float']['output'];
  playbackCountFormatted: Scalars['String']['output'];
  playbackUrl: Scalars['String']['output'];
  price: TrackPrice;
  profileId: Scalars['ID']['output'];
  releaseYear: Maybe<Scalars['Float']['output']>;
  saleType: Scalars['String']['output'];
  title: Maybe<Scalars['String']['output']>;
  trackEdition: Maybe<TrackEdition>;
  trackEditionId: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  utilityInfo: Maybe<Scalars['String']['output']>;
};

export type TrackConnection = {
  __typename?: 'TrackConnection';
  nodes: Array<Track>;
  pageInfo: PageInfo;
};

export type TrackEdition = {
  __typename?: 'TrackEdition';
  contract: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deleted: Maybe<Scalars['Boolean']['output']>;
  editionData: Maybe<EditionDataType>;
  editionId: Scalars['Float']['output'];
  editionSize: Scalars['Float']['output'];
  id: Scalars['ID']['output'];
  listed: Scalars['Boolean']['output'];
  marketplace: Maybe<Scalars['String']['output']>;
  transactionHash: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TrackPrice = {
  __typename?: 'TrackPrice';
  currency: CurrencyType;
  value: Scalars['Float']['output'];
};

export type TrackWithListingItem = {
  __typename?: 'TrackWithListingItem';
  ISRC: Maybe<Scalars['String']['output']>;
  album: Maybe<Scalars['String']['output']>;
  artist: Maybe<Scalars['String']['output']>;
  artistId: Maybe<Scalars['String']['output']>;
  artistProfileId: Maybe<Scalars['String']['output']>;
  artworkUrl: Maybe<Scalars['String']['output']>;
  assetUrl: Scalars['String']['output'];
  copyright: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['DateTime']['output'];
  deleted: Maybe<Scalars['Boolean']['output']>;
  description: Maybe<Scalars['String']['output']>;
  editionSize: Scalars['Float']['output'];
  favoriteCount: Scalars['Float']['output'];
  genres: Maybe<Array<Genre>>;
  id: Scalars['ID']['output'];
  isFavorite: Scalars['Boolean']['output'];
  listingCount: Scalars['Float']['output'];
  listingItem: Maybe<ListingItemWithPrice>;
  nftData: Maybe<NftDataType>;
  playbackCount: Scalars['Float']['output'];
  playbackCountFormatted: Scalars['String']['output'];
  playbackUrl: Scalars['String']['output'];
  price: TrackPrice;
  profileId: Scalars['ID']['output'];
  releaseYear: Maybe<Scalars['Float']['output']>;
  saleType: Scalars['String']['output'];
  title: Maybe<Scalars['String']['output']>;
  trackEdition: Maybe<TrackEdition>;
  trackEditionId: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  utilityInfo: Maybe<Scalars['String']['output']>;
};

export type UnfollowProfileInput = {
  followedId: Scalars['String']['input'];
};

export type UnfollowProfilePayload = {
  __typename?: 'UnfollowProfilePayload';
  unfollowedProfile: Profile;
};

export type UnsubscribeFromProfileInput = {
  profileId: Scalars['String']['input'];
};

export type UnsubscribeFromProfilePayload = {
  __typename?: 'UnsubscribeFromProfilePayload';
  profile: Profile;
};

export type UpdateCommentInput = {
  body: Scalars['String']['input'];
  commentId: Scalars['String']['input'];
};

export type UpdateCommentPayload = {
  __typename?: 'UpdateCommentPayload';
  comment: Comment;
};

export type UpdateDefaultWalletInput = {
  defaultWallet: DefaultWallet;
};

export type UpdateDefaultWalletPayload = {
  __typename?: 'UpdateDefaultWalletPayload';
  user: User;
};

export type UpdateEditionOwnedTracksInput = {
  nftData?: InputMaybe<NftDataInput>;
  owner: Scalars['String']['input'];
  trackEditionId: Scalars['String']['input'];
  trackIds: Array<Scalars['String']['input']>;
};

export type UpdateEditionOwnedTracksPayload = {
  __typename?: 'UpdateEditionOwnedTracksPayload';
  tracks: Array<Track>;
};

export type UpdateHandleInput = {
  handle: Scalars['String']['input'];
};

export type UpdateHandlePayload = {
  __typename?: 'UpdateHandlePayload';
  user: User;
};

export type UpdateOtpInput = {
  otpRecoveryPhrase: Scalars['String']['input'];
  otpSecret: Scalars['String']['input'];
};

export type UpdateOtpPayload = {
  __typename?: 'UpdateOTPPayload';
  user: User;
};

export type UpdateOgunClaimedAudioHolderPayload = {
  __typename?: 'UpdateOgunClaimedAudioHolderPayload';
  audioHolder: AudioHolder;
};

export type UpdateOgunClaimedInput = {
  id: Scalars['String']['input'];
  ogunClaimed: Scalars['Boolean']['input'];
};

export type UpdatePostInput = {
  body: Scalars['String']['input'];
  mediaLink?: InputMaybe<Scalars['String']['input']>;
  postId: Scalars['String']['input'];
};

export type UpdatePostPayload = {
  __typename?: 'UpdatePostPayload';
  post: Post;
};

export type UpdateProfileInput = {
  bio?: InputMaybe<Scalars['String']['input']>;
  coverPicture?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  favoriteGenres?: InputMaybe<Array<Genre>>;
  musicianTypes?: InputMaybe<Array<MusicianType>>;
  profilePicture?: InputMaybe<Scalars['String']['input']>;
  socialMedias?: InputMaybe<SocialMediasInput>;
};

export type UpdateProfilePayload = {
  __typename?: 'UpdateProfilePayload';
  profile: Profile;
};

export type UpdateTrackInput = {
  nftData?: InputMaybe<NftDataInput>;
  playbackCount?: InputMaybe<Scalars['Float']['input']>;
  profileId?: InputMaybe<Scalars['String']['input']>;
  trackId: Scalars['String']['input'];
};

export type UpdateTrackPayload = {
  __typename?: 'UpdateTrackPayload';
  track: Track;
};

export type UpdateWalletInput = {
  wallet: Scalars['String']['input'];
};

export type UpdateWhitelistEntryPayload = {
  __typename?: 'UpdateWhitelistEntryPayload';
  whitelistEntry: WhitelistEntry;
};

export type UploadUrl = {
  __typename?: 'UploadUrl';
  fileName: Scalars['String']['output'];
  readUrl: Scalars['String']['output'];
  uploadUrl: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  authMethod: AuthMethod;
  createdAt: Scalars['DateTime']['output'];
  defaultWallet: DefaultWallet;
  discordWalletAddress: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  emailWalletAddress: Maybe<Scalars['String']['output']>;
  googleWalletAddress: Maybe<Scalars['String']['output']>;
  handle: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isApprovedOnMarketplace: Scalars['Boolean']['output'];
  magicWalletAddress: Maybe<Scalars['String']['output']>;
  metaMaskWalletAddressees: Maybe<Array<Scalars['String']['output']>>;
  profile: Profile;
  profileId: Scalars['ID']['output'];
  roles: Array<Role>;
  twitchWalletAddress: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type ValidateOtpRecoveryPhraseInput = {
  otpRecoveryPhrase: Scalars['String']['input'];
};

export type VerificationRequestNotification = {
  __typename?: 'VerificationRequestNotification';
  body: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type WhitelistEntry = {
  __typename?: 'WhitelistEntry';
  createdAt: Scalars['DateTime']['output'];
  emailAddress: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  ogunClaimed: Maybe<Scalars['Boolean']['output']>;
  updatedAt: Scalars['DateTime']['output'];
  walletAddress: Scalars['String']['output'];
};

export type WonAuctionNotification = {
  __typename?: 'WonAuctionNotification';
  artist: Scalars['String']['output'];
  artworkUrl: Scalars['String']['output'];
  auctionId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['String']['output'];
  price: Scalars['Float']['output'];
  trackId: Scalars['String']['output'];
  trackName: Scalars['String']['output'];
  type: NotificationType;
  updatedAt: Scalars['DateTime']['output'];
};

export type AddCommentMutationVariables = Exact<{
  input: AddCommentInput;
}>;


export type AddCommentMutation = { __typename?: 'Mutation', addComment: { __typename?: 'AddCommentPayload', comment: { __typename?: 'Comment', id: string, body: string, createdAt: string, deleted: boolean | null, isGuest: boolean | null, walletAddress: string | null, post: { __typename?: 'Post', id: string, commentCount: number }, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null } } };

export type AuctionEndedNotificationFieldsFragment = { __typename?: 'AuctionEndedNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number };

export type AuctionIsEndingNotificationFieldsFragment = { __typename?: 'AuctionIsEndingNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number };

export type AuctionItemQueryVariables = Exact<{
  tokenId: Scalars['Float']['input'];
}>;


export type AuctionItemQuery = { __typename?: 'Query', auctionItem: { __typename?: 'AuctionItemPayload', auctionItem: { __typename?: 'AuctionItem', id: string, owner: string, nft: string, tokenId: number, contract: string | null, startingTime: number, endingTime: number, reservePrice: string, reservePriceToShow: number } | null } };

export type AudioHolderByWalletQueryVariables = Exact<{
  walletAdress: Scalars['String']['input'];
}>;


export type AudioHolderByWalletQuery = { __typename?: 'Query', audioHolderByWallet: { __typename?: 'AudioHolder', id: string, amount: number, ogunClaimed: boolean | null } };

export type BandcampLinkQueryVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type BandcampLinkQuery = { __typename?: 'Query', bandcampLink: string };

export type BidsWithInfoQueryVariables = Exact<{
  auctionId: Scalars['String']['input'];
}>;


export type BidsWithInfoQuery = { __typename?: 'Query', bidsWithInfo: { __typename?: 'BidsWithInfoPayload', bids: Array<{ __typename?: 'BidsWithInfo', amount: string, amountToShow: number, userId: string, profileId: string, createdAt: string, profile: { __typename?: 'Profile', profilePicture: string | null, displayName: string, userHandle: string, verified: boolean | null, teamMember: boolean, badges: Array<Badge> | null } }> | null } };

export type BuyNowItemQueryVariables = Exact<{
  input: FilterListingItemInput;
}>;


export type BuyNowItemQuery = { __typename?: 'Query', buyNowItem: { __typename?: 'BuyNowPayload', buyNowItem: { __typename?: 'BuyNowItem', id: string, owner: string, nft: string, tokenId: number, contract: string | null, pricePerItem: string, selectedCurrency: string | null, pricePerItemToShow: number, OGUNPricePerItem: string, OGUNPricePerItemToShow: number, acceptsMATIC: boolean, acceptsOGUN: boolean, startingTime: number } | null } };

export type BuyNowListingItemsQueryVariables = Exact<{
  filter?: InputMaybe<FilterBuyNowItemInput>;
  page?: InputMaybe<PageInput>;
}>;


export type BuyNowListingItemsQuery = { __typename?: 'Query', buyNowListingItems: { __typename?: 'ListingItemConnection', nodes: Array<{ __typename?: 'TrackWithListingItem', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, playbackCount: number, listingCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null, listingItem: { __typename?: 'ListingItemWithPrice', id: string, owner: string | null, nft: string | null, tokenId: number | null, contract: string, pricePerItem: string | null, pricePerItemToShow: number | null, OGUNPricePerItem: string | null, OGUNPricePerItemToShow: number | null, isPaymentOGUN: boolean | null, startingTime: number | null, endingTime: number | null, reservePrice: string | null, reservePriceToShow: number | null, createdAt: string, updatedAt: string, priceToShow: number | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type ChangeReactionMutationVariables = Exact<{
  input: ChangeReactionInput;
}>;


export type ChangeReactionMutation = { __typename?: 'Mutation', changeReaction: { __typename?: 'ChangeReactionPayload', post: { __typename?: 'Post', id: string, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null } } };

export type ChatHistoryQueryVariables = Exact<{
  profileId: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type ChatHistoryQuery = { __typename?: 'Query', chatHistory: { __typename?: 'MessageConnection', pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, startCursor: string | null }, nodes: Array<{ __typename?: 'Message', id: string, message: string, fromId: string, toId: string, createdAt: string, fromProfile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, userHandle: string, badges: Array<Badge> | null } }> } };

export type ChatsQueryVariables = Exact<{
  page?: InputMaybe<PageInput>;
}>;


export type ChatsQuery = { __typename?: 'Query', chats: { __typename?: 'ChatConnection', nodes: Array<{ __typename?: 'Chat', id: string, message: string, unread: boolean, createdAt: string, profile: { __typename?: 'Profile', displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null } } };

export type CheapestListingItemQueryVariables = Exact<{
  trackEditionId: Scalars['String']['input'];
}>;


export type CheapestListingItemQuery = { __typename?: 'Query', cheapestListingItem: { __typename?: 'TrackPrice', currency: CurrencyType, value: number } | null };

export type ClaimBadgeProfileMutationVariables = Exact<{ [key: string]: never; }>;


export type ClaimBadgeProfileMutation = { __typename?: 'Mutation', claimBadgeProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } } } };

export type ClearNotificationsMutationVariables = Exact<{ [key: string]: never; }>;


export type ClearNotificationsMutation = { __typename?: 'Mutation', clearNotifications: { __typename?: 'ClearNotificationsPayload', ok: boolean } };

export type CommentQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type CommentQuery = { __typename?: 'Query', comment: { __typename?: 'Comment', id: string, body: string, createdAt: string, deleted: boolean | null, isGuest: boolean | null, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null } };

export type CommentComponentFieldsFragment = { __typename?: 'Comment', id: string, body: string, createdAt: string, deleted: boolean | null, isGuest: boolean | null, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null };

export type CommentNotificationFieldsFragment = { __typename?: 'CommentNotification', id: string, type: NotificationType, body: string, previewBody: string, link: string, createdAt: string, authorName: string, authorPicture: string | null };

export type CommentsQueryVariables = Exact<{
  postId: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type CommentsQuery = { __typename?: 'Query', comments: { __typename?: 'CommentConnection', nodes: Array<{ __typename?: 'Comment', id: string, body: string, createdAt: string, deleted: boolean | null, isGuest: boolean | null, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasPreviousPage: boolean, hasNextPage: boolean, startCursor: string | null, endCursor: string | null } } };

export type CountBidsQueryVariables = Exact<{
  tokenId: Scalars['Float']['input'];
}>;


export type CountBidsQuery = { __typename?: 'Query', countBids: { __typename?: 'CountBidsPayload', numberOfBids: number | null } };

export type CreateMultipleTracksMutationVariables = Exact<{
  input: CreateMultipleTracksInput;
}>;


export type CreateMultipleTracksMutation = { __typename?: 'Mutation', createMultipleTracks: { __typename?: 'CreateMultipleTracksPayload', trackIds: Array<string>, firstTrack: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } } };

export type CreatePostMutationVariables = Exact<{
  input: CreatePostInput;
}>;


export type CreatePostMutation = { __typename?: 'Mutation', createPost: { __typename?: 'CreatePostPayload', post: { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, originalMediaLink: string | null, mediaThumbnail: string | null, createdAt: string, updatedAt: string, isGuest: boolean, walletAddress: string | null, uploadedMediaUrl: string | null, uploadedMediaType: string | null, mediaExpiresAt: string | null, isEphemeral: boolean | null } } };

export type CreateProfileVerificationRequestMutationVariables = Exact<{
  input: CreateProfileVerificationRequestInput;
}>;


export type CreateProfileVerificationRequestMutation = { __typename?: 'Mutation', createProfileVerificationRequest: { __typename?: 'ProfileVerificationRequestPayload', profileVerificationRequest: { __typename?: 'ProfileVerificationRequest', id: string, profileId: string, soundcloud: string | null, youtube: string | null, bandcamp: string | null, status: ProfileVerificationStatusType | null, reason: string | null, reviewerProfileId: string | null, createdAt: string, updatedAt: string } } };

export type CreateRepostMutationVariables = Exact<{
  input: CreateRepostInput;
}>;


export type CreateRepostMutation = { __typename?: 'Mutation', createRepost: { __typename?: 'CreateRepostPayload', post: { __typename?: 'Post', id: string }, originalPost: { __typename?: 'Post', id: string, repostCount: number } } };

export type CreateTrackEditionMutationVariables = Exact<{
  input: CreateTrackEditionInput;
}>;


export type CreateTrackEditionMutation = { __typename?: 'Mutation', createTrackEdition: { __typename?: 'CreateTrackEditionPayload', trackEdition: { __typename?: 'TrackEdition', id: string } } };

export type CreateWhitelistEntryMutationVariables = Exact<{
  input: CreateWhitelistEntryInput;
}>;


export type CreateWhitelistEntryMutation = { __typename?: 'Mutation', createWhitelistEntry: { __typename?: 'CreateWhitelistEntryPayload', whitelistEntry: { __typename?: 'WhitelistEntry', id: string } } };

export type DeleteCommentMutationVariables = Exact<{
  input: DeleteCommentInput;
}>;


export type DeleteCommentMutation = { __typename?: 'Mutation', deleteComment: { __typename?: 'DeleteCommentPayload', comment: { __typename?: 'Comment', id: string, body: string, createdAt: string, deleted: boolean | null, isGuest: boolean | null, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null } } };

export type DeletePostMutationVariables = Exact<{
  input: DeletePostInput;
}>;


export type DeletePostMutation = { __typename?: 'Mutation', deletePost: { __typename?: 'DeletePostPayload', post: { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, mediaThumbnail: string | null, repostId: string | null, createdAt: string, updatedAt: string, commentCount: number, repostCount: number, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null, deleted: boolean | null, isGuest: boolean, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null, track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } | null } } };

export type DeleteTrackMutationVariables = Exact<{
  trackId: Scalars['String']['input'];
}>;


export type DeleteTrackMutation = { __typename?: 'Mutation', deleteTrack: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } };

export type DeleteTrackEditionMutationVariables = Exact<{
  trackEditionId: Scalars['String']['input'];
}>;


export type DeleteTrackEditionMutation = { __typename?: 'Mutation', deleteTrackEdition: Array<{ __typename?: 'Track', id: string }> };

export type DeleteTrackOnErrorMutationVariables = Exact<{
  input: DeleteTrackInput;
}>;


export type DeleteTrackOnErrorMutation = { __typename?: 'Mutation', deleteTrackOnError: { __typename?: 'UpdateTrackPayload', track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } } };

export type DeletedCommentNotificationFieldsFragment = { __typename?: 'DeletedCommentNotification', id: string, type: NotificationType, body: string, previewBody: string, link: string, createdAt: string, authorName: string, authorPicture: string | null };

export type DeletedPostNotificationFieldsFragment = { __typename?: 'DeletedPostNotification', id: string, type: NotificationType, authorName: string, authorPicture: string | null, body: string, previewBody: string, mediaLink: string | null, createdAt: string, track: { __typename?: 'Track', title: string | null, playbackUrl: string } | null };

export type ExploreQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
}>;


export type ExploreQuery = { __typename?: 'Query', explore: { __typename?: 'ExplorePayload', totalTracks: number, totalProfiles: number, tracks: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }>, profiles: Array<{ __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } }> } };

export type ExploreTracksQueryVariables = Exact<{
  sort?: InputMaybe<SortExploreTracks>;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<PageInput>;
}>;


export type ExploreTracksQuery = { __typename?: 'Query', exploreTracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type ExploreUsersQueryVariables = Exact<{
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<PageInput>;
}>;


export type ExploreUsersQuery = { __typename?: 'Query', exploreUsers: { __typename?: 'ProfileConnection', nodes: Array<{ __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null } } };

export type FavoriteTracksQueryVariables = Exact<{
  sort?: InputMaybe<SortTrackInput>;
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<PageInput>;
}>;


export type FavoriteTracksQuery = { __typename?: 'Query', favoriteTracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type FeedQueryVariables = Exact<{
  page?: InputMaybe<PageInput>;
}>;


export type FeedQuery = { __typename?: 'Query', feed: { __typename?: 'FeedConnection', nodes: Array<{ __typename?: 'FeedItem', id: string, post: { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, mediaThumbnail: string | null, repostId: string | null, createdAt: string, updatedAt: string, commentCount: number, repostCount: number, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null, deleted: boolean | null, isGuest: boolean, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null, track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null } } };

export type FollowProfileMutationVariables = Exact<{
  input: FollowProfileInput;
}>;


export type FollowProfileMutation = { __typename?: 'Mutation', followProfile: { __typename?: 'FollowProfilePayload', followedProfile: { __typename?: 'Profile', id: string, followerCount: number, isFollowed: boolean } } };

export type FollowedArtistsQueryVariables = Exact<{
  profileId: Scalars['String']['input'];
  search?: InputMaybe<Scalars['String']['input']>;
  page?: InputMaybe<PageInput>;
}>;


export type FollowedArtistsQuery = { __typename?: 'Query', followedArtists: { __typename?: 'FollowedArtistsConnection', nodes: Array<{ __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type FollowerNotificationFieldsFragment = { __typename?: 'FollowerNotification', id: string, type: NotificationType, link: string, createdAt: string, followerName: string, followerPicture: string | null };

export type FollowersQueryVariables = Exact<{
  profileId: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type FollowersQuery = { __typename?: 'Query', followers: { __typename?: 'FollowConnection', nodes: Array<{ __typename?: 'Follow', id: string, followerProfile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, userHandle: string, teamMember: boolean, badges: Array<Badge> | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type FollowingQueryVariables = Exact<{
  profileId: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type FollowingQuery = { __typename?: 'Query', following: { __typename?: 'FollowConnection', nodes: Array<{ __typename?: 'Follow', id: string, followedProfile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, userHandle: string, teamMember: boolean, badges: Array<Badge> | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type GetOriginalPostFromTrackQueryVariables = Exact<{
  trackId: Scalars['String']['input'];
}>;


export type GetOriginalPostFromTrackQuery = { __typename?: 'Query', getOriginalPostFromTrack: { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, mediaThumbnail: string | null, repostId: string | null, createdAt: string, updatedAt: string, commentCount: number, repostCount: number, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null, deleted: boolean | null, isGuest: boolean, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null, track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } | null } };

export type GroupedTracksQueryVariables = Exact<{
  filter?: InputMaybe<FilterTrackInput>;
  sort?: InputMaybe<SortTrackInput>;
  page?: InputMaybe<PageInput>;
}>;


export type GroupedTracksQuery = { __typename?: 'Query', groupedTracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type GuestAddCommentMutationVariables = Exact<{
  input: AddCommentInput;
  walletAddress: Scalars['String']['input'];
}>;


export type GuestAddCommentMutation = { __typename?: 'Mutation', guestAddComment: { __typename?: 'AddCommentPayload', comment: { __typename?: 'Comment', id: string, body: string, isGuest: boolean | null, walletAddress: string | null, createdAt: string, updatedAt: string, post: { __typename?: 'Post', id: string } } } };

export type GuestCreatePostMutationVariables = Exact<{
  input: CreatePostInput;
  walletAddress: Scalars['String']['input'];
}>;


export type GuestCreatePostMutation = { __typename?: 'Mutation', guestCreatePost: { __typename?: 'CreatePostPayload', post: { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, originalMediaLink: string | null, mediaThumbnail: string | null, createdAt: string, updatedAt: string, isGuest: boolean, walletAddress: string | null, uploadedMediaUrl: string | null, uploadedMediaType: string | null, mediaExpiresAt: string | null, isEphemeral: boolean | null } } };

export type GuestDeletePostMutationVariables = Exact<{
  postId: Scalars['String']['input'];
  walletAddress: Scalars['String']['input'];
}>;


export type GuestDeletePostMutation = { __typename?: 'Mutation', guestDeletePost: { __typename?: 'DeletePostPayload', post: { __typename?: 'Post', id: string, deleted: boolean | null } } };

export type GuestReactToPostMutationVariables = Exact<{
  input: ReactToPostInput;
  walletAddress: Scalars['String']['input'];
}>;


export type GuestReactToPostMutation = { __typename?: 'Mutation', guestReactToPost: { __typename?: 'ReactToPostPayload', post: { __typename?: 'Post', id: string, totalReactions: number, topReactions: Array<ReactionType> } } };

export type GuestRetractReactionMutationVariables = Exact<{
  postId: Scalars['String']['input'];
  walletAddress: Scalars['String']['input'];
}>;


export type GuestRetractReactionMutation = { __typename?: 'Mutation', guestRetractReaction: { __typename?: 'RetractReactionPayload', post: { __typename?: 'Post', id: string, totalReactions: number, topReactions: Array<ReactionType> } } };

export type HaveBidedQueryVariables = Exact<{
  auctionId: Scalars['String']['input'];
  bidder: Scalars['String']['input'];
}>;


export type HaveBidedQuery = { __typename?: 'Query', haveBided: { __typename?: 'Bided', bided: boolean | null } };

export type ListableOwnedTrackIdsQueryVariables = Exact<{
  filter: FilterOwnedTracksInput;
}>;


export type ListableOwnedTrackIdsQuery = { __typename?: 'Query', listableOwnedTracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, nftData: { __typename?: 'NFTDataType', tokenId: number | null } | null }> } };

export type ListingItemQueryVariables = Exact<{
  input: FilterListingItemInput;
}>;


export type ListingItemQuery = { __typename?: 'Query', listingItem: { __typename?: 'ListingItem', id: string, owner: string | null, nft: string | null, tokenId: number | null, contract: string, pricePerItem: string | null, pricePerItemToShow: number | null, OGUNPricePerItem: string | null, OGUNPricePerItemToShow: number | null, isPaymentOGUN: boolean | null, startingTime: number | null, endingTime: number | null, reservePrice: string | null, reservePriceToShow: number | null, createdAt: string, updatedAt: string } | null };

export type ListingItemComponentFieldsFragment = { __typename?: 'TrackWithListingItem', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, playbackCount: number, listingCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null, listingItem: { __typename?: 'ListingItemWithPrice', id: string, owner: string | null, nft: string | null, tokenId: number | null, contract: string, pricePerItem: string | null, pricePerItemToShow: number | null, OGUNPricePerItem: string | null, OGUNPricePerItemToShow: number | null, isPaymentOGUN: boolean | null, startingTime: number | null, endingTime: number | null, reservePrice: string | null, reservePriceToShow: number | null, createdAt: string, updatedAt: string, priceToShow: number | null } | null };

export type ListingItemViewComponentFieldsFragment = { __typename?: 'ListingItem', id: string, owner: string | null, nft: string | null, tokenId: number | null, contract: string, pricePerItem: string | null, pricePerItemToShow: number | null, OGUNPricePerItem: string | null, OGUNPricePerItemToShow: number | null, isPaymentOGUN: boolean | null, startingTime: number | null, endingTime: number | null, reservePrice: string | null, reservePriceToShow: number | null, createdAt: string, updatedAt: string };

export type ListingItemsQueryVariables = Exact<{
  filter?: InputMaybe<FilterTrackMarketplace>;
  sort?: InputMaybe<SortListingItemInput>;
  page?: InputMaybe<PageInput>;
}>;


export type ListingItemsQuery = { __typename?: 'Query', listingItems: { __typename?: 'ListingItemConnection', nodes: Array<{ __typename?: 'TrackWithListingItem', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, playbackCount: number, listingCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null, listingItem: { __typename?: 'ListingItemWithPrice', id: string, owner: string | null, nft: string | null, tokenId: number | null, contract: string, pricePerItem: string | null, pricePerItemToShow: number | null, OGUNPricePerItem: string | null, OGUNPricePerItemToShow: number | null, isPaymentOGUN: boolean | null, startingTime: number | null, endingTime: number | null, reservePrice: string | null, reservePriceToShow: number | null, createdAt: string, updatedAt: string, priceToShow: number | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { __typename?: 'Mutation', login: { __typename?: 'AuthPayload', jwt: string } };

export type MaticUsdQueryVariables = Exact<{ [key: string]: never; }>;


export type MaticUsdQuery = { __typename?: 'Query', maticUsd: string };

export type MeQueryVariables = Exact<{ [key: string]: never; }>;


export type MeQuery = { __typename?: 'Query', me: { __typename?: 'User', id: string, handle: string, email: string, magicWalletAddress: string | null, googleWalletAddress: string | null, discordWalletAddress: string | null, twitchWalletAddress: string | null, emailWalletAddress: string | null, metaMaskWalletAddressees: Array<string> | null, defaultWallet: DefaultWallet, authMethod: AuthMethod, isApprovedOnMarketplace: boolean, roles: Array<Role>, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } } } | null };

export type MessageQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type MessageQuery = { __typename?: 'Query', message: { __typename?: 'Message', id: string, message: string, fromId: string, toId: string, createdAt: string, fromProfile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, userHandle: string, badges: Array<Badge> | null } } };

export type MessageComponentFieldsFragment = { __typename?: 'Message', id: string, message: string, fromId: string, toId: string, createdAt: string, fromProfile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, userHandle: string, badges: Array<Badge> | null } };

export type MimeTypeQueryVariables = Exact<{
  url: Scalars['String']['input'];
}>;


export type MimeTypeQuery = { __typename?: 'Query', mimeType: { __typename?: 'MimeType', value: string } };

export type NftSoldNotificationFieldsFragment = { __typename?: 'NFTSoldNotification', id: string, type: NotificationType, createdAt: string, buyerName: string, buyerPicture: string, buyerProfileId: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number, sellType: SellType, isPaymentOgun: boolean | null };

export type NewBidNotificationFieldsFragment = { __typename?: 'NewBidNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number };

export type NewPostNotificationFieldsFragment = { __typename?: 'NewPostNotification', id: string, type: NotificationType, authorName: string, authorPicture: string | null, body: string, link: string, previewBody: string, previewLink: string | null, createdAt: string, track: { __typename?: 'Track', id: string, title: string | null, playbackUrl: string, artworkUrl: string | null, artist: string | null, isFavorite: boolean, playbackCountFormatted: string, favoriteCount: number, saleType: string, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType } } | null };

export type NewVerificationRequestNotificationFieldsFragment = { __typename?: 'NewVerificationRequestNotification', id: string, type: NotificationType, verificationRequestId: string, createdAt: string };

export type NotificationQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type NotificationQuery = { __typename?: 'Query', notification: { __typename?: 'AuctionEndedNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'AuctionIsEndingNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'CommentNotification', id: string, type: NotificationType, body: string, previewBody: string, link: string, createdAt: string, authorName: string, authorPicture: string | null } | { __typename?: 'DeletedCommentNotification', id: string, type: NotificationType, body: string, previewBody: string, link: string, createdAt: string, authorName: string, authorPicture: string | null } | { __typename?: 'DeletedPostNotification', id: string, type: NotificationType, authorName: string, authorPicture: string | null, body: string, previewBody: string, mediaLink: string | null, createdAt: string, track: { __typename?: 'Track', title: string | null, playbackUrl: string } | null } | { __typename?: 'FollowerNotification', id: string, type: NotificationType, link: string, createdAt: string, followerName: string, followerPicture: string | null } | { __typename?: 'NFTSoldNotification', id: string, type: NotificationType, createdAt: string, buyerName: string, buyerPicture: string, buyerProfileId: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number, sellType: SellType, isPaymentOgun: boolean | null } | { __typename?: 'NewBidNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'NewPostNotification', id: string, type: NotificationType, authorName: string, authorPicture: string | null, body: string, link: string, previewBody: string, previewLink: string | null, createdAt: string, track: { __typename?: 'Track', id: string, title: string | null, playbackUrl: string, artworkUrl: string | null, artist: string | null, isFavorite: boolean, playbackCountFormatted: string, favoriteCount: number, saleType: string, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType } } | null } | { __typename?: 'NewVerificationRequestNotification', id: string, type: NotificationType, verificationRequestId: string, createdAt: string } | { __typename?: 'OutbidNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'ReactionNotification', id: string, type: NotificationType, reactionType: ReactionType, link: string, authorName: string, authorPicture: string | null, createdAt: string, postId: string } | { __typename?: 'VerificationRequestNotification', id: string, type: NotificationType, body: string, createdAt: string } | { __typename?: 'WonAuctionNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } };

export type NotificationCountQueryVariables = Exact<{ [key: string]: never; }>;


export type NotificationCountQuery = { __typename?: 'Query', myProfile: { __typename?: 'Profile', id: string, unreadNotificationCount: number } };

export type NotificationsQueryVariables = Exact<{
  sort?: InputMaybe<SortNotificationInput>;
}>;


export type NotificationsQuery = { __typename?: 'Query', notifications: { __typename?: 'NotificationConnection', nodes: Array<{ __typename?: 'AuctionEndedNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'AuctionIsEndingNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'CommentNotification', id: string, type: NotificationType, body: string, previewBody: string, link: string, createdAt: string, authorName: string, authorPicture: string | null } | { __typename?: 'DeletedCommentNotification', id: string, type: NotificationType, body: string, previewBody: string, link: string, createdAt: string, authorName: string, authorPicture: string | null } | { __typename?: 'DeletedPostNotification', id: string, type: NotificationType, authorName: string, authorPicture: string | null, body: string, previewBody: string, mediaLink: string | null, createdAt: string, track: { __typename?: 'Track', title: string | null, playbackUrl: string } | null } | { __typename?: 'FollowerNotification', id: string, type: NotificationType, link: string, createdAt: string, followerName: string, followerPicture: string | null } | { __typename?: 'NFTSoldNotification', id: string, type: NotificationType, createdAt: string, buyerName: string, buyerPicture: string, buyerProfileId: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number, sellType: SellType, isPaymentOgun: boolean | null } | { __typename?: 'NewBidNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'NewPostNotification', id: string, type: NotificationType, authorName: string, authorPicture: string | null, body: string, link: string, previewBody: string, previewLink: string | null, createdAt: string, track: { __typename?: 'Track', id: string, title: string | null, playbackUrl: string, artworkUrl: string | null, artist: string | null, isFavorite: boolean, playbackCountFormatted: string, favoriteCount: number, saleType: string, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType } } | null } | { __typename?: 'NewVerificationRequestNotification', id: string, type: NotificationType, verificationRequestId: string, createdAt: string } | { __typename?: 'OutbidNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number } | { __typename?: 'ReactionNotification', id: string, type: NotificationType, reactionType: ReactionType, link: string, authorName: string, authorPicture: string | null, createdAt: string, postId: string } | { __typename?: 'VerificationRequestNotification', id: string, type: NotificationType, body: string, createdAt: string } | { __typename?: 'WonAuctionNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number }> } };

export type OutbidNotificationFieldsFragment = { __typename?: 'OutbidNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number };

export type OwnedBuyNowTrackIdsQueryVariables = Exact<{
  filter: FilterOwnedBuyNowItemInput;
}>;


export type OwnedBuyNowTrackIdsQuery = { __typename?: 'Query', ownedBuyNowListingItems: { __typename?: 'ListingItemConnection', nodes: Array<{ __typename?: 'TrackWithListingItem', id: string, nftData: { __typename?: 'NFTDataType', tokenId: number | null } | null }> } };

export type OwnedTrackIdsQueryVariables = Exact<{
  filter: FilterOwnedTracksInput;
}>;


export type OwnedTrackIdsQuery = { __typename?: 'Query', ownedTracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, nftData: { __typename?: 'NFTDataType', tokenId: number | null } | null }> } };

export type OwnedTracksQueryVariables = Exact<{
  filter: FilterOwnedTracksInput;
  page?: InputMaybe<PageInput>;
}>;


export type OwnedTracksQuery = { __typename?: 'Query', ownedTracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, listingItem: { __typename?: 'ListingItem', id: string, owner: string | null, nft: string | null, tokenId: number | null, contract: string, pricePerItem: string | null, pricePerItemToShow: number | null, OGUNPricePerItem: string | null, OGUNPricePerItemToShow: number | null, isPaymentOGUN: boolean | null, startingTime: number | null, endingTime: number | null, reservePrice: string | null, reservePriceToShow: number | null, createdAt: string, updatedAt: string } | null, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type PendingRequestsBadgeNumberQueryVariables = Exact<{ [key: string]: never; }>;


export type PendingRequestsBadgeNumberQuery = { __typename?: 'Query', pendingRequestsBadgeNumber: number };

export type PinJsonToIpfsMutationVariables = Exact<{
  input: PinJsonToIpfsInput;
}>;


export type PinJsonToIpfsMutation = { __typename?: 'Mutation', pinJsonToIPFS: { __typename?: 'PinningPayload', cid: string } };

export type PinToIpfsMutationVariables = Exact<{
  input: PinToIpfsInput;
}>;


export type PinToIpfsMutation = { __typename?: 'Mutation', pinToIPFS: { __typename?: 'PinningPayload', cid: string } };

export type PolygonscanQueryVariables = Exact<{
  wallet: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type PolygonscanQuery = { __typename?: 'Query', getTransactionHistory: { __typename?: 'PolygonscanResult', nextPage: string | null, result: Array<{ __typename?: 'PolygonscanResultObj', blockNumber: string, timeStamp: string, hash: string, nonce: string, blockHash: string, transactionIndex: string, from: string, to: string, value: string, gas: string, gasPrice: string, isError: string, txreceipt_status: string, input: string, contractAddress: string, cumulativeGasUsed: string, gasUsed: string, confirmations: string, method: string | null, date: string }> } };

export type PolygonscanInternalTrxQueryVariables = Exact<{
  wallet: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type PolygonscanInternalTrxQuery = { __typename?: 'Query', getInternalTransactionHistory: { __typename?: 'PolygonscanResult', nextPage: string | null, result: Array<{ __typename?: 'PolygonscanResultObj', blockNumber: string, timeStamp: string, hash: string, from: string, to: string, value: string, gas: string, isError: string, input: string, contractAddress: string, gasUsed: string, date: string }> } };

export type PostQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type PostQuery = { __typename?: 'Query', post: { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, mediaThumbnail: string | null, repostId: string | null, createdAt: string, updatedAt: string, commentCount: number, repostCount: number, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null, deleted: boolean | null, isGuest: boolean, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null, track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } | null } };

export type PostComponentFieldsFragment = { __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, mediaThumbnail: string | null, repostId: string | null, createdAt: string, updatedAt: string, commentCount: number, repostCount: number, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null, deleted: boolean | null, isGuest: boolean, walletAddress: string | null, uploadedMediaUrl: string | null, uploadedMediaType: string | null, mediaExpiresAt: string | null, isEphemeral: boolean | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null, track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } | null };

export type PostsQueryVariables = Exact<{
  filter?: InputMaybe<FilterPostInput>;
  sort?: InputMaybe<SortPostInput>;
  page?: InputMaybe<PageInput>;
}>;


export type PostsQuery = { __typename?: 'Query', posts: { __typename?: 'PostConnection', nodes: Array<{ __typename?: 'Post', id: string, body: string | null, mediaLink: string | null, mediaThumbnail: string | null, repostId: string | null, createdAt: string, updatedAt: string, commentCount: number, repostCount: number, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null, deleted: boolean | null, isGuest: boolean, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null, track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null } } };

export type ProfileQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ProfileQuery = { __typename?: 'Query', profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } } };

export type ProfileByHandleQueryVariables = Exact<{
  handle: Scalars['String']['input'];
}>;


export type ProfileByHandleQuery = { __typename?: 'Query', profileByHandle: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } } };

export type ProfileComponentFieldsFragment = { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, coverPicture: string | null, favoriteGenres: Array<Genre> | null, musicianTypes: Array<MusicianType> | null, bio: string | null, followerCount: number, followingCount: number, userHandle: string, isFollowed: boolean, isSubscriber: boolean, unreadNotificationCount: number, unreadMessageCount: number, verified: boolean | null, teamMember: boolean, magicWalletAddress: string | null, badges: Array<Badge> | null, createdAt: string, updatedAt: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } };

export type ProfileDisplayNameQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type ProfileDisplayNameQuery = { __typename?: 'Query', profile: { __typename?: 'Profile', displayName: string, verified: boolean | null } };

export type ProfileVerificationRequestQueryVariables = Exact<{
  id?: InputMaybe<Scalars['String']['input']>;
  profileId?: InputMaybe<Scalars['String']['input']>;
}>;


export type ProfileVerificationRequestQuery = { __typename?: 'Query', profileVerificationRequest: { __typename?: 'ProfileVerificationRequest', id: string, profileId: string, soundcloud: string | null, youtube: string | null, bandcamp: string | null, status: ProfileVerificationStatusType | null, reason: string | null, reviewerProfileId: string | null, createdAt: string, updatedAt: string } };

export type ProfileVerificationRequestComponentFieldsFragment = { __typename?: 'ProfileVerificationRequest', id: string, profileId: string, soundcloud: string | null, youtube: string | null, bandcamp: string | null, status: ProfileVerificationStatusType | null, reason: string | null, reviewerProfileId: string | null, createdAt: string, updatedAt: string };

export type ProfileVerificationRequestsQueryVariables = Exact<{
  status?: InputMaybe<ProfileVerificationStatusType>;
  page?: InputMaybe<PageInput>;
}>;


export type ProfileVerificationRequestsQuery = { __typename?: 'Query', profileVerificationRequests: { __typename?: 'ProfileVerificationRequestConnection', nodes: Array<{ __typename?: 'ProfileVerificationRequest', id: string, profileId: string, soundcloud: string | null, youtube: string | null, bandcamp: string | null, status: ProfileVerificationStatusType | null, reason: string | null, reviewerProfileId: string | null, createdAt: string, updatedAt: string }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null } } };

export type ProofBookByWalletQueryVariables = Exact<{
  walletAddress: Scalars['String']['input'];
}>;


export type ProofBookByWalletQuery = { __typename?: 'Query', getProofBookByWallet: { __typename?: 'ProofBookItem', root: string, address: string, value: string, merkleProof: Array<string> } | null };

export type ReactToPostMutationVariables = Exact<{
  input: ReactToPostInput;
}>;


export type ReactToPostMutation = { __typename?: 'Mutation', reactToPost: { __typename?: 'ReactToPostPayload', post: { __typename?: 'Post', id: string, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null } } };

export type ReactionNotificationFieldsFragment = { __typename?: 'ReactionNotification', id: string, type: NotificationType, reactionType: ReactionType, link: string, authorName: string, authorPicture: string | null, createdAt: string, postId: string };

export type ReactionsQueryVariables = Exact<{
  postId: Scalars['String']['input'];
  page?: InputMaybe<PageInput>;
}>;


export type ReactionsQuery = { __typename?: 'Query', reactions: { __typename?: 'ReactionConnection', nodes: Array<{ __typename?: 'Reaction', id: string, type: ReactionType, profile: { __typename?: 'Profile', id: string, userHandle: string, displayName: string, profilePicture: string | null, verified: boolean | null, badges: Array<Badge> | null } }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { __typename?: 'Mutation', register: { __typename?: 'AuthPayload', jwt: string } };

export type RemoveProfileVerificationRequestMutationVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type RemoveProfileVerificationRequestMutation = { __typename?: 'Mutation', removeProfileVerificationRequest: { __typename?: 'ProfileVerificationRequestPayload', profileVerificationRequest: { __typename?: 'ProfileVerificationRequest', id: string } } };

export type ResetNotificationCountMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetNotificationCountMutation = { __typename?: 'Mutation', resetNotificationCount: { __typename?: 'Profile', id: string, unreadNotificationCount: number } };

export type ResetUnreadMessageCountMutationVariables = Exact<{ [key: string]: never; }>;


export type ResetUnreadMessageCountMutation = { __typename?: 'Mutation', resetUnreadMessageCount: { __typename?: 'Profile', id: string, unreadMessageCount: number } };

export type RetractReactionMutationVariables = Exact<{
  input: RetractReactionInput;
}>;


export type RetractReactionMutation = { __typename?: 'Mutation', retractReaction: { __typename?: 'RetractReactionPayload', post: { __typename?: 'Post', id: string, totalReactions: number, topReactions: Array<ReactionType>, myReaction: ReactionType | null } } };

export type SendMessageMutationVariables = Exact<{
  input: SendMessageInput;
}>;


export type SendMessageMutation = { __typename?: 'Mutation', sendMessage: { __typename?: 'SendMessagePayload', message: { __typename?: 'Message', id: string, message: string, fromId: string, toId: string, createdAt: string, fromProfile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, userHandle: string, badges: Array<Badge> | null } } } };

export type SubscribeToProfileMutationVariables = Exact<{
  input: SubscribeToProfileInput;
}>;


export type SubscribeToProfileMutation = { __typename?: 'Mutation', subscribeToProfile: { __typename?: 'SubscribeToProfilePayload', profile: { __typename?: 'Profile', id: string, isSubscriber: boolean } } };

export type ToggleFavoriteMutationVariables = Exact<{
  trackId: Scalars['String']['input'];
}>;


export type ToggleFavoriteMutation = { __typename?: 'Mutation', toggleFavorite: { __typename?: 'ToggleFavoritePayload', favoriteProfileTrack: { __typename?: 'FavoriteProfileTrack', id: string, trackId: string, profileId: string } } };

export type TrackQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type TrackQuery = { __typename?: 'Query', track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } };

export type TrackComponentFieldsFragment = { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null };

export type TrackEditionQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type TrackEditionQuery = { __typename?: 'Query', trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } };

export type TrackEditionFieldsFragment = { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null };

export type TracksQueryVariables = Exact<{
  filter?: InputMaybe<FilterTrackInput>;
  sort?: InputMaybe<SortTrackInput>;
  page?: InputMaybe<PageInput>;
}>;


export type TracksQuery = { __typename?: 'Query', tracks: { __typename?: 'TrackConnection', nodes: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }>, pageInfo: { __typename?: 'PageInfo', hasNextPage: boolean, endCursor: string | null, totalCount: number } } };

export type TracksByGenreQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Float']['input']>;
}>;


export type TracksByGenreQuery = { __typename?: 'Query', tracksByGenre: Array<{ __typename?: 'GenreTracks', genre: string, tracks: Array<{ __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }> }> };

export type UnfollowProfileMutationVariables = Exact<{
  input: UnfollowProfileInput;
}>;


export type UnfollowProfileMutation = { __typename?: 'Mutation', unfollowProfile: { __typename?: 'UnfollowProfilePayload', unfollowedProfile: { __typename?: 'Profile', id: string, followerCount: number, isFollowed: boolean } } };

export type UnreadMessageCountQueryVariables = Exact<{ [key: string]: never; }>;


export type UnreadMessageCountQuery = { __typename?: 'Query', myProfile: { __typename?: 'Profile', id: string, unreadMessageCount: number } };

export type UnsubscribeFromProfileMutationVariables = Exact<{
  input: UnsubscribeFromProfileInput;
}>;


export type UnsubscribeFromProfileMutation = { __typename?: 'Mutation', unsubscribeFromProfile: { __typename?: 'UnsubscribeFromProfilePayload', profile: { __typename?: 'Profile', id: string, isSubscriber: boolean } } };

export type UpdateAllOwnedTracksMutationVariables = Exact<{
  input: UpdateEditionOwnedTracksInput;
}>;


export type UpdateAllOwnedTracksMutation = { __typename?: 'Mutation', updateEditionOwnedTracks: { __typename?: 'UpdateEditionOwnedTracksPayload', tracks: Array<{ __typename?: 'Track', id: string, nftData: { __typename?: 'NFTDataType', pendingRequest: PendingRequest | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null }> } };

export type UpdateCommentMutationVariables = Exact<{
  input: UpdateCommentInput;
}>;


export type UpdateCommentMutation = { __typename?: 'Mutation', updateComment: { __typename?: 'UpdateCommentPayload', comment: { __typename?: 'Comment', id: string, body: string, createdAt: string, deleted: boolean | null, isGuest: boolean | null, walletAddress: string | null, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, verified: boolean | null, teamMember: boolean, userHandle: string, badges: Array<Badge> | null } | null } } };

export type UpdateCoverPictureMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateCoverPictureMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, coverPicture: string | null } } };

export type UpdateDefaultWalletMutationVariables = Exact<{
  input: UpdateDefaultWalletInput;
}>;


export type UpdateDefaultWalletMutation = { __typename?: 'Mutation', updateDefaultWallet: { __typename?: 'UpdateDefaultWalletPayload', user: { __typename?: 'User', id: string, defaultWallet: DefaultWallet } } };

export type UpdateFavoriteGenresMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateFavoriteGenresMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, favoriteGenres: Array<Genre> | null } } };

export type UpdateHandleMutationVariables = Exact<{
  input: UpdateHandleInput;
}>;


export type UpdateHandleMutation = { __typename?: 'Mutation', updateHandle: { __typename?: 'UpdateHandlePayload', user: { __typename?: 'User', id: string, handle: string } } };

export type UpdateMusicianTypeMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateMusicianTypeMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, musicianTypes: Array<MusicianType> | null } } };

export type UpdateOtpMutationVariables = Exact<{
  input: UpdateOtpInput;
}>;


export type UpdateOtpMutation = { __typename?: 'Mutation', updateOTP: { __typename?: 'UpdateOTPPayload', user: { __typename?: 'User', id: string } } };

export type UpdateOgunClaimedAudioHolderMutationVariables = Exact<{
  input: UpdateOgunClaimedInput;
}>;


export type UpdateOgunClaimedAudioHolderMutation = { __typename?: 'Mutation', updateOgunClaimedAudioHolder: { __typename?: 'UpdateOgunClaimedAudioHolderPayload', audioHolder: { __typename?: 'AudioHolder', id: string } } };

export type UpdateOgunClaimedWhitelistMutationVariables = Exact<{
  input: UpdateOgunClaimedInput;
}>;


export type UpdateOgunClaimedWhitelistMutation = { __typename?: 'Mutation', updateOgunClaimedWhitelist: { __typename?: 'UpdateWhitelistEntryPayload', whitelistEntry: { __typename?: 'WhitelistEntry', id: string } } };

export type UpdatePostMutationVariables = Exact<{
  input: UpdatePostInput;
}>;


export type UpdatePostMutation = { __typename?: 'Mutation', updatePost: { __typename?: 'UpdatePostPayload', post: { __typename?: 'Post', id: string, body: string | null } } };

export type UpdateProfileBioMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileBioMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, bio: string | null } } };

export type UpdateProfileDisplayNameMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfileDisplayNameMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, displayName: string } } };

export type UpdateProfilePictureMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateProfilePictureMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, profilePicture: string | null } } };

export type UpdateSocialMediasMutationVariables = Exact<{
  input: UpdateProfileInput;
}>;


export type UpdateSocialMediasMutation = { __typename?: 'Mutation', updateProfile: { __typename?: 'UpdateProfilePayload', profile: { __typename?: 'Profile', id: string, socialMedias: { __typename?: 'SocialMedias', facebook: string | null, instagram: string | null, soundcloud: string | null, twitter: string | null, linktree: string | null, discord: string | null, telegram: string | null, spotify: string | null, bandcamp: string | null } } } };

export type UpdateProfileVerificationRequestMutationVariables = Exact<{
  id: Scalars['String']['input'];
  input: CreateProfileVerificationRequestInput;
}>;


export type UpdateProfileVerificationRequestMutation = { __typename?: 'Mutation', updateProfileVerificationRequest: { __typename?: 'ProfileVerificationRequestPayload', profileVerificationRequest: { __typename?: 'ProfileVerificationRequest', id: string, profileId: string, soundcloud: string | null, youtube: string | null, bandcamp: string | null, status: ProfileVerificationStatusType | null, reason: string | null, reviewerProfileId: string | null, createdAt: string, updatedAt: string } } };

export type UpdateTrackMutationVariables = Exact<{
  input: UpdateTrackInput;
}>;


export type UpdateTrackMutation = { __typename?: 'Mutation', updateTrack: { __typename?: 'UpdateTrackPayload', track: { __typename?: 'Track', id: string, profileId: string, title: string | null, assetUrl: string, artworkUrl: string | null, description: string | null, utilityInfo: string | null, artist: string | null, ISRC: string | null, artistId: string | null, artistProfileId: string | null, album: string | null, releaseYear: number | null, copyright: string | null, genres: Array<Genre> | null, playbackUrl: string, createdAt: string, updatedAt: string, deleted: boolean | null, playbackCountFormatted: string, isFavorite: boolean, favoriteCount: number, listingCount: number, playbackCount: number, saleType: string, trackEditionId: string | null, editionSize: number, price: { __typename?: 'TrackPrice', value: number, currency: CurrencyType }, nftData: { __typename?: 'NFTDataType', transactionHash: string | null, tokenId: number | null, contract: string | null, minter: string | null, ipfsCid: string | null, pendingRequest: PendingRequest | null, owner: string | null, pendingTime: string | null } | null, trackEdition: { __typename?: 'TrackEdition', id: string, editionId: number, transactionHash: string, contract: string | null, listed: boolean, marketplace: string | null, editionSize: number, deleted: boolean | null, createdAt: string, updatedAt: string, editionData: { __typename?: 'EditionDataType', pendingRequest: PendingRequest | null, pendingTime: string | null, pendingTrackCount: number | null, transactionHash: string | null, contract: string | null, owner: string | null } | null } | null } } };

export type UpdateMetaMaskAddressesMutationVariables = Exact<{
  input: UpdateWalletInput;
}>;


export type UpdateMetaMaskAddressesMutation = { __typename?: 'Mutation', updateMetaMaskAddresses: { __typename?: 'UpdateDefaultWalletPayload', user: { __typename?: 'User', id: string, metaMaskWalletAddressees: Array<string> | null } } };

export type UploadUrlQueryVariables = Exact<{
  fileType: Scalars['String']['input'];
}>;


export type UploadUrlQuery = { __typename?: 'Query', uploadUrl: { __typename?: 'UploadUrl', uploadUrl: string, fileName: string, readUrl: string } };

export type UserByWalletQueryVariables = Exact<{
  walletAddress: Scalars['String']['input'];
}>;


export type UserByWalletQuery = { __typename?: 'Query', getUserByWallet: { __typename?: 'User', id: string, profile: { __typename?: 'Profile', id: string, displayName: string, profilePicture: string | null, userHandle: string, followerCount: number, followingCount: number, verified: boolean | null, teamMember: boolean, badges: Array<Badge> | null } } | null };

export type ValidateOtpRecoveryPhraseMutationVariables = Exact<{
  input: ValidateOtpRecoveryPhraseInput;
}>;


export type ValidateOtpRecoveryPhraseMutation = { __typename?: 'Mutation', validateOTPRecoveryPhrase: boolean };

export type VerificationRequestNotificationFieldsFragment = { __typename?: 'VerificationRequestNotification', id: string, type: NotificationType, body: string, createdAt: string };

export type WhitelistEntryByWalletQueryVariables = Exact<{
  walletAdress: Scalars['String']['input'];
}>;


export type WhitelistEntryByWalletQuery = { __typename?: 'Query', whitelistEntryByWallet: { __typename?: 'WhitelistEntry', id: string, ogunClaimed: boolean | null } };

export type WonAuctionNotificationFieldsFragment = { __typename?: 'WonAuctionNotification', id: string, type: NotificationType, createdAt: string, trackId: string, trackName: string, artist: string, artworkUrl: string, price: number };

export const AuctionEndedNotificationFieldsFragmentDoc = gql`
    fragment AuctionEndedNotificationFields on AuctionEndedNotification {
  id
  type
  createdAt
  trackId
  trackName
  artist
  artworkUrl
  price
}
    `;
export const AuctionIsEndingNotificationFieldsFragmentDoc = gql`
    fragment AuctionIsEndingNotificationFields on AuctionIsEndingNotification {
  id
  type
  createdAt
  trackId
  trackName
  artist
  artworkUrl
  price
}
    `;
export const CommentComponentFieldsFragmentDoc = gql`
    fragment CommentComponentFields on Comment {
  id
  body
  createdAt
  deleted
  isGuest
  walletAddress
  profile {
    id
    displayName
    profilePicture
    verified
    teamMember
    userHandle
    badges
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
export const DeletedCommentNotificationFieldsFragmentDoc = gql`
    fragment DeletedCommentNotificationFields on DeletedCommentNotification {
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
export const DeletedPostNotificationFieldsFragmentDoc = gql`
    fragment DeletedPostNotificationFields on DeletedPostNotification {
  id
  type
  authorName
  authorPicture
  body
  previewBody
  mediaLink
  createdAt
  track {
    title
    playbackUrl
  }
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
export const TrackEditionFieldsFragmentDoc = gql`
    fragment TrackEditionFields on TrackEdition {
  id
  editionId
  transactionHash
  contract
  listed
  marketplace
  editionId
  editionSize
  deleted
  createdAt
  updatedAt
  editionData {
    pendingRequest
    pendingTime
    pendingTrackCount
    transactionHash
    contract
    owner
  }
}
    `;
export const ListingItemComponentFieldsFragmentDoc = gql`
    fragment ListingItemComponentFields on TrackWithListingItem {
  id
  profileId
  title
  assetUrl
  artworkUrl
  description
  utilityInfo
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
  playbackCountFormatted
  isFavorite
  favoriteCount
  playbackCount
  listingCount
  saleType
  price {
    value
    currency
  }
  trackEditionId
  editionSize
  nftData {
    transactionHash
    tokenId
    contract
    minter
    ipfsCid
    pendingRequest
    owner
    pendingTime
  }
  trackEdition {
    ...TrackEditionFields
  }
  listingItem {
    id
    owner
    nft
    tokenId
    contract
    pricePerItem
    pricePerItemToShow
    OGUNPricePerItem
    OGUNPricePerItemToShow
    isPaymentOGUN
    startingTime
    endingTime
    reservePrice
    reservePriceToShow
    createdAt
    updatedAt
    priceToShow
  }
}
    ${TrackEditionFieldsFragmentDoc}`;
export const ListingItemViewComponentFieldsFragmentDoc = gql`
    fragment ListingItemViewComponentFields on ListingItem {
  id
  owner
  nft
  tokenId
  contract
  pricePerItem
  pricePerItemToShow
  OGUNPricePerItem
  OGUNPricePerItemToShow
  isPaymentOGUN
  startingTime
  endingTime
  reservePrice
  reservePriceToShow
  createdAt
  updatedAt
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
    verified
    userHandle
    badges
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
  sellType
  isPaymentOgun
}
    `;
export const NewBidNotificationFieldsFragmentDoc = gql`
    fragment NewBidNotificationFields on NewBidNotification {
  id
  type
  createdAt
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
    id
    title
    playbackUrl
    artworkUrl
    artist
    isFavorite
    playbackCountFormatted
    favoriteCount
    saleType
    price {
      value
      currency
    }
  }
}
    `;
export const NewVerificationRequestNotificationFieldsFragmentDoc = gql`
    fragment NewVerificationRequestNotificationFields on NewVerificationRequestNotification {
  id
  type
  verificationRequestId
  createdAt
}
    `;
export const OutbidNotificationFieldsFragmentDoc = gql`
    fragment OutbidNotificationFields on OutbidNotification {
  id
  type
  createdAt
  trackId
  trackName
  artist
  artworkUrl
  price
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
  utilityInfo
  artist
  ISRC
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
  playbackCountFormatted
  isFavorite
  favoriteCount
  listingCount
  playbackCount
  saleType
  price {
    value
    currency
  }
  trackEditionId
  editionSize
  nftData {
    transactionHash
    tokenId
    contract
    minter
    ipfsCid
    pendingRequest
    owner
    pendingTime
  }
  trackEdition {
    ...TrackEditionFields
  }
}
    ${TrackEditionFieldsFragmentDoc}`;
export const PostComponentFieldsFragmentDoc = gql`
    fragment PostComponentFields on Post {
  id
  body
  mediaLink
  mediaThumbnail
  repostId
  createdAt
  updatedAt
  commentCount
  repostCount
  totalReactions
  topReactions(top: 2)
  myReaction
  deleted
  isGuest
  walletAddress
  profile {
    id
    displayName
    profilePicture
    verified
    teamMember
    userHandle
    badges
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
    linktree
    discord
    telegram
    spotify
    bandcamp
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
  verified
  teamMember
  magicWalletAddress
  badges
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
  reviewerProfileId
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
export const VerificationRequestNotificationFieldsFragmentDoc = gql`
    fragment VerificationRequestNotificationFields on VerificationRequestNotification {
  id
  type
  body
  createdAt
}
    `;
export const WonAuctionNotificationFieldsFragmentDoc = gql`
    fragment WonAuctionNotificationFields on WonAuctionNotification {
  id
  type
  createdAt
  trackId
  trackName
  artist
  artworkUrl
  price
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
export const AuctionItemDocument = gql`
    query AuctionItem($tokenId: Float!) {
  auctionItem(tokenId: $tokenId) {
    auctionItem {
      id
      owner
      nft
      tokenId
      contract
      startingTime
      endingTime
      reservePrice
      reservePriceToShow
    }
  }
}
    `;

/**
 * __useAuctionItemQuery__
 *
 * To run a query within a React component, call `useAuctionItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useAuctionItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAuctionItemQuery({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useAuctionItemQuery(baseOptions: Apollo.QueryHookOptions<AuctionItemQuery, AuctionItemQueryVariables> & ({ variables: AuctionItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AuctionItemQuery, AuctionItemQueryVariables>(AuctionItemDocument, options);
      }
export function useAuctionItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AuctionItemQuery, AuctionItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AuctionItemQuery, AuctionItemQueryVariables>(AuctionItemDocument, options);
        }
export function useAuctionItemSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AuctionItemQuery, AuctionItemQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AuctionItemQuery, AuctionItemQueryVariables>(AuctionItemDocument, options);
        }
export type AuctionItemQueryHookResult = ReturnType<typeof useAuctionItemQuery>;
export type AuctionItemLazyQueryHookResult = ReturnType<typeof useAuctionItemLazyQuery>;
export type AuctionItemSuspenseQueryHookResult = ReturnType<typeof useAuctionItemSuspenseQuery>;
export type AuctionItemQueryResult = Apollo.QueryResult<AuctionItemQuery, AuctionItemQueryVariables>;
export const AudioHolderByWalletDocument = gql`
    query AudioHolderByWallet($walletAdress: String!) {
  audioHolderByWallet(walletAdress: $walletAdress) {
    id
    amount
    ogunClaimed
  }
}
    `;

/**
 * __useAudioHolderByWalletQuery__
 *
 * To run a query within a React component, call `useAudioHolderByWalletQuery` and pass it any options that fit your needs.
 * When your component renders, `useAudioHolderByWalletQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useAudioHolderByWalletQuery({
 *   variables: {
 *      walletAdress: // value for 'walletAdress'
 *   },
 * });
 */
export function useAudioHolderByWalletQuery(baseOptions: Apollo.QueryHookOptions<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables> & ({ variables: AudioHolderByWalletQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables>(AudioHolderByWalletDocument, options);
      }
export function useAudioHolderByWalletLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables>(AudioHolderByWalletDocument, options);
        }
export function useAudioHolderByWalletSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables>(AudioHolderByWalletDocument, options);
        }
export type AudioHolderByWalletQueryHookResult = ReturnType<typeof useAudioHolderByWalletQuery>;
export type AudioHolderByWalletLazyQueryHookResult = ReturnType<typeof useAudioHolderByWalletLazyQuery>;
export type AudioHolderByWalletSuspenseQueryHookResult = ReturnType<typeof useAudioHolderByWalletSuspenseQuery>;
export type AudioHolderByWalletQueryResult = Apollo.QueryResult<AudioHolderByWalletQuery, AudioHolderByWalletQueryVariables>;
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
export function useBandcampLinkQuery(baseOptions: Apollo.QueryHookOptions<BandcampLinkQuery, BandcampLinkQueryVariables> & ({ variables: BandcampLinkQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BandcampLinkQuery, BandcampLinkQueryVariables>(BandcampLinkDocument, options);
      }
export function useBandcampLinkLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BandcampLinkQuery, BandcampLinkQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BandcampLinkQuery, BandcampLinkQueryVariables>(BandcampLinkDocument, options);
        }
export function useBandcampLinkSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BandcampLinkQuery, BandcampLinkQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BandcampLinkQuery, BandcampLinkQueryVariables>(BandcampLinkDocument, options);
        }
export type BandcampLinkQueryHookResult = ReturnType<typeof useBandcampLinkQuery>;
export type BandcampLinkLazyQueryHookResult = ReturnType<typeof useBandcampLinkLazyQuery>;
export type BandcampLinkSuspenseQueryHookResult = ReturnType<typeof useBandcampLinkSuspenseQuery>;
export type BandcampLinkQueryResult = Apollo.QueryResult<BandcampLinkQuery, BandcampLinkQueryVariables>;
export const BidsWithInfoDocument = gql`
    query BidsWithInfo($auctionId: String!) {
  bidsWithInfo(auctionId: $auctionId) {
    bids {
      amount
      amountToShow
      userId
      profileId
      createdAt
      profile {
        profilePicture
        displayName
        userHandle
        verified
        teamMember
        badges
      }
    }
  }
}
    `;

/**
 * __useBidsWithInfoQuery__
 *
 * To run a query within a React component, call `useBidsWithInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useBidsWithInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBidsWithInfoQuery({
 *   variables: {
 *      auctionId: // value for 'auctionId'
 *   },
 * });
 */
export function useBidsWithInfoQuery(baseOptions: Apollo.QueryHookOptions<BidsWithInfoQuery, BidsWithInfoQueryVariables> & ({ variables: BidsWithInfoQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BidsWithInfoQuery, BidsWithInfoQueryVariables>(BidsWithInfoDocument, options);
      }
export function useBidsWithInfoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BidsWithInfoQuery, BidsWithInfoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BidsWithInfoQuery, BidsWithInfoQueryVariables>(BidsWithInfoDocument, options);
        }
export function useBidsWithInfoSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BidsWithInfoQuery, BidsWithInfoQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BidsWithInfoQuery, BidsWithInfoQueryVariables>(BidsWithInfoDocument, options);
        }
export type BidsWithInfoQueryHookResult = ReturnType<typeof useBidsWithInfoQuery>;
export type BidsWithInfoLazyQueryHookResult = ReturnType<typeof useBidsWithInfoLazyQuery>;
export type BidsWithInfoSuspenseQueryHookResult = ReturnType<typeof useBidsWithInfoSuspenseQuery>;
export type BidsWithInfoQueryResult = Apollo.QueryResult<BidsWithInfoQuery, BidsWithInfoQueryVariables>;
export const BuyNowItemDocument = gql`
    query BuyNowItem($input: FilterListingItemInput!) {
  buyNowItem(input: $input) {
    buyNowItem {
      id
      owner
      nft
      tokenId
      contract
      pricePerItem
      selectedCurrency
      pricePerItemToShow
      OGUNPricePerItem
      OGUNPricePerItemToShow
      acceptsMATIC
      acceptsOGUN
      startingTime
    }
  }
}
    `;

/**
 * __useBuyNowItemQuery__
 *
 * To run a query within a React component, call `useBuyNowItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useBuyNowItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBuyNowItemQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useBuyNowItemQuery(baseOptions: Apollo.QueryHookOptions<BuyNowItemQuery, BuyNowItemQueryVariables> & ({ variables: BuyNowItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BuyNowItemQuery, BuyNowItemQueryVariables>(BuyNowItemDocument, options);
      }
export function useBuyNowItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BuyNowItemQuery, BuyNowItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BuyNowItemQuery, BuyNowItemQueryVariables>(BuyNowItemDocument, options);
        }
export function useBuyNowItemSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BuyNowItemQuery, BuyNowItemQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BuyNowItemQuery, BuyNowItemQueryVariables>(BuyNowItemDocument, options);
        }
export type BuyNowItemQueryHookResult = ReturnType<typeof useBuyNowItemQuery>;
export type BuyNowItemLazyQueryHookResult = ReturnType<typeof useBuyNowItemLazyQuery>;
export type BuyNowItemSuspenseQueryHookResult = ReturnType<typeof useBuyNowItemSuspenseQuery>;
export type BuyNowItemQueryResult = Apollo.QueryResult<BuyNowItemQuery, BuyNowItemQueryVariables>;
export const BuyNowListingItemsDocument = gql`
    query BuyNowListingItems($filter: FilterBuyNowItemInput, $page: PageInput) {
  buyNowListingItems(filter: $filter, page: $page) {
    nodes {
      ...ListingItemComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    ${ListingItemComponentFieldsFragmentDoc}`;

/**
 * __useBuyNowListingItemsQuery__
 *
 * To run a query within a React component, call `useBuyNowListingItemsQuery` and pass it any options that fit your needs.
 * When your component renders, `useBuyNowListingItemsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useBuyNowListingItemsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useBuyNowListingItemsQuery(baseOptions?: Apollo.QueryHookOptions<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>(BuyNowListingItemsDocument, options);
      }
export function useBuyNowListingItemsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>(BuyNowListingItemsDocument, options);
        }
export function useBuyNowListingItemsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>(BuyNowListingItemsDocument, options);
        }
export type BuyNowListingItemsQueryHookResult = ReturnType<typeof useBuyNowListingItemsQuery>;
export type BuyNowListingItemsLazyQueryHookResult = ReturnType<typeof useBuyNowListingItemsLazyQuery>;
export type BuyNowListingItemsSuspenseQueryHookResult = ReturnType<typeof useBuyNowListingItemsSuspenseQuery>;
export type BuyNowListingItemsQueryResult = Apollo.QueryResult<BuyNowListingItemsQuery, BuyNowListingItemsQueryVariables>;
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
export function useChatHistoryQuery(baseOptions: Apollo.QueryHookOptions<ChatHistoryQuery, ChatHistoryQueryVariables> & ({ variables: ChatHistoryQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ChatHistoryQuery, ChatHistoryQueryVariables>(ChatHistoryDocument, options);
      }
export function useChatHistoryLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ChatHistoryQuery, ChatHistoryQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ChatHistoryQuery, ChatHistoryQueryVariables>(ChatHistoryDocument, options);
        }
export function useChatHistorySuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatHistoryQuery, ChatHistoryQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChatHistoryQuery, ChatHistoryQueryVariables>(ChatHistoryDocument, options);
        }
export type ChatHistoryQueryHookResult = ReturnType<typeof useChatHistoryQuery>;
export type ChatHistoryLazyQueryHookResult = ReturnType<typeof useChatHistoryLazyQuery>;
export type ChatHistorySuspenseQueryHookResult = ReturnType<typeof useChatHistorySuspenseQuery>;
export type ChatHistoryQueryResult = Apollo.QueryResult<ChatHistoryQuery, ChatHistoryQueryVariables>;
export const ChatsDocument = gql`
    query Chats($page: PageInput) {
  chats(page: $page) {
    nodes {
      id
      profile {
        displayName
        profilePicture
        verified
        teamMember
        userHandle
        badges
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
export function useChatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ChatsQuery, ChatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ChatsQuery, ChatsQueryVariables>(ChatsDocument, options);
        }
export type ChatsQueryHookResult = ReturnType<typeof useChatsQuery>;
export type ChatsLazyQueryHookResult = ReturnType<typeof useChatsLazyQuery>;
export type ChatsSuspenseQueryHookResult = ReturnType<typeof useChatsSuspenseQuery>;
export type ChatsQueryResult = Apollo.QueryResult<ChatsQuery, ChatsQueryVariables>;
export const CheapestListingItemDocument = gql`
    query CheapestListingItem($trackEditionId: String!) {
  cheapestListingItem(trackEditionId: $trackEditionId) {
    currency
    value
  }
}
    `;

/**
 * __useCheapestListingItemQuery__
 *
 * To run a query within a React component, call `useCheapestListingItemQuery` and pass it any options that fit your needs.
 * When your component renders, `useCheapestListingItemQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCheapestListingItemQuery({
 *   variables: {
 *      trackEditionId: // value for 'trackEditionId'
 *   },
 * });
 */
export function useCheapestListingItemQuery(baseOptions: Apollo.QueryHookOptions<CheapestListingItemQuery, CheapestListingItemQueryVariables> & ({ variables: CheapestListingItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CheapestListingItemQuery, CheapestListingItemQueryVariables>(CheapestListingItemDocument, options);
      }
export function useCheapestListingItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CheapestListingItemQuery, CheapestListingItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CheapestListingItemQuery, CheapestListingItemQueryVariables>(CheapestListingItemDocument, options);
        }
export function useCheapestListingItemSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CheapestListingItemQuery, CheapestListingItemQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CheapestListingItemQuery, CheapestListingItemQueryVariables>(CheapestListingItemDocument, options);
        }
export type CheapestListingItemQueryHookResult = ReturnType<typeof useCheapestListingItemQuery>;
export type CheapestListingItemLazyQueryHookResult = ReturnType<typeof useCheapestListingItemLazyQuery>;
export type CheapestListingItemSuspenseQueryHookResult = ReturnType<typeof useCheapestListingItemSuspenseQuery>;
export type CheapestListingItemQueryResult = Apollo.QueryResult<CheapestListingItemQuery, CheapestListingItemQueryVariables>;
export const ClaimBadgeProfileDocument = gql`
    mutation claimBadgeProfile {
  claimBadgeProfile {
    profile {
      ...ProfileComponentFields
    }
  }
}
    ${ProfileComponentFieldsFragmentDoc}`;
export type ClaimBadgeProfileMutationFn = Apollo.MutationFunction<ClaimBadgeProfileMutation, ClaimBadgeProfileMutationVariables>;

/**
 * __useClaimBadgeProfileMutation__
 *
 * To run a mutation, you first call `useClaimBadgeProfileMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useClaimBadgeProfileMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [claimBadgeProfileMutation, { data, loading, error }] = useClaimBadgeProfileMutation({
 *   variables: {
 *   },
 * });
 */
export function useClaimBadgeProfileMutation(baseOptions?: Apollo.MutationHookOptions<ClaimBadgeProfileMutation, ClaimBadgeProfileMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ClaimBadgeProfileMutation, ClaimBadgeProfileMutationVariables>(ClaimBadgeProfileDocument, options);
      }
export type ClaimBadgeProfileMutationHookResult = ReturnType<typeof useClaimBadgeProfileMutation>;
export type ClaimBadgeProfileMutationResult = Apollo.MutationResult<ClaimBadgeProfileMutation>;
export type ClaimBadgeProfileMutationOptions = Apollo.BaseMutationOptions<ClaimBadgeProfileMutation, ClaimBadgeProfileMutationVariables>;
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
export function useCommentQuery(baseOptions: Apollo.QueryHookOptions<CommentQuery, CommentQueryVariables> & ({ variables: CommentQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommentQuery, CommentQueryVariables>(CommentDocument, options);
      }
export function useCommentLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommentQuery, CommentQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommentQuery, CommentQueryVariables>(CommentDocument, options);
        }
export function useCommentSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CommentQuery, CommentQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CommentQuery, CommentQueryVariables>(CommentDocument, options);
        }
export type CommentQueryHookResult = ReturnType<typeof useCommentQuery>;
export type CommentLazyQueryHookResult = ReturnType<typeof useCommentLazyQuery>;
export type CommentSuspenseQueryHookResult = ReturnType<typeof useCommentSuspenseQuery>;
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
export function useCommentsQuery(baseOptions: Apollo.QueryHookOptions<CommentsQuery, CommentsQueryVariables> & ({ variables: CommentsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CommentsQuery, CommentsQueryVariables>(CommentsDocument, options);
      }
export function useCommentsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CommentsQuery, CommentsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CommentsQuery, CommentsQueryVariables>(CommentsDocument, options);
        }
export function useCommentsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CommentsQuery, CommentsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CommentsQuery, CommentsQueryVariables>(CommentsDocument, options);
        }
export type CommentsQueryHookResult = ReturnType<typeof useCommentsQuery>;
export type CommentsLazyQueryHookResult = ReturnType<typeof useCommentsLazyQuery>;
export type CommentsSuspenseQueryHookResult = ReturnType<typeof useCommentsSuspenseQuery>;
export type CommentsQueryResult = Apollo.QueryResult<CommentsQuery, CommentsQueryVariables>;
export const CountBidsDocument = gql`
    query CountBids($tokenId: Float!) {
  countBids(tokenId: $tokenId) {
    numberOfBids
  }
}
    `;

/**
 * __useCountBidsQuery__
 *
 * To run a query within a React component, call `useCountBidsQuery` and pass it any options that fit your needs.
 * When your component renders, `useCountBidsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCountBidsQuery({
 *   variables: {
 *      tokenId: // value for 'tokenId'
 *   },
 * });
 */
export function useCountBidsQuery(baseOptions: Apollo.QueryHookOptions<CountBidsQuery, CountBidsQueryVariables> & ({ variables: CountBidsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CountBidsQuery, CountBidsQueryVariables>(CountBidsDocument, options);
      }
export function useCountBidsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CountBidsQuery, CountBidsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CountBidsQuery, CountBidsQueryVariables>(CountBidsDocument, options);
        }
export function useCountBidsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CountBidsQuery, CountBidsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CountBidsQuery, CountBidsQueryVariables>(CountBidsDocument, options);
        }
export type CountBidsQueryHookResult = ReturnType<typeof useCountBidsQuery>;
export type CountBidsLazyQueryHookResult = ReturnType<typeof useCountBidsLazyQuery>;
export type CountBidsSuspenseQueryHookResult = ReturnType<typeof useCountBidsSuspenseQuery>;
export type CountBidsQueryResult = Apollo.QueryResult<CountBidsQuery, CountBidsQueryVariables>;
export const CreateMultipleTracksDocument = gql`
    mutation CreateMultipleTracks($input: CreateMultipleTracksInput!) {
  createMultipleTracks(input: $input) {
    trackIds
    firstTrack {
      ...TrackComponentFields
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;
export type CreateMultipleTracksMutationFn = Apollo.MutationFunction<CreateMultipleTracksMutation, CreateMultipleTracksMutationVariables>;

/**
 * __useCreateMultipleTracksMutation__
 *
 * To run a mutation, you first call `useCreateMultipleTracksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMultipleTracksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMultipleTracksMutation, { data, loading, error }] = useCreateMultipleTracksMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMultipleTracksMutation(baseOptions?: Apollo.MutationHookOptions<CreateMultipleTracksMutation, CreateMultipleTracksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateMultipleTracksMutation, CreateMultipleTracksMutationVariables>(CreateMultipleTracksDocument, options);
      }
export type CreateMultipleTracksMutationHookResult = ReturnType<typeof useCreateMultipleTracksMutation>;
export type CreateMultipleTracksMutationResult = Apollo.MutationResult<CreateMultipleTracksMutation>;
export type CreateMultipleTracksMutationOptions = Apollo.BaseMutationOptions<CreateMultipleTracksMutation, CreateMultipleTracksMutationVariables>;
export const CreatePostDocument = gql`
    mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    post {
      id
      body
      mediaLink
      originalMediaLink
      mediaThumbnail
      createdAt
      updatedAt
      isGuest
      walletAddress
      uploadedMediaUrl
      uploadedMediaType
      mediaExpiresAt
      isEphemeral
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
export const CreateTrackEditionDocument = gql`
    mutation CreateTrackEdition($input: CreateTrackEditionInput!) {
  createTrackEdition(input: $input) {
    trackEdition {
      id
    }
  }
}
    `;
export type CreateTrackEditionMutationFn = Apollo.MutationFunction<CreateTrackEditionMutation, CreateTrackEditionMutationVariables>;

/**
 * __useCreateTrackEditionMutation__
 *
 * To run a mutation, you first call `useCreateTrackEditionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateTrackEditionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createTrackEditionMutation, { data, loading, error }] = useCreateTrackEditionMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateTrackEditionMutation(baseOptions?: Apollo.MutationHookOptions<CreateTrackEditionMutation, CreateTrackEditionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateTrackEditionMutation, CreateTrackEditionMutationVariables>(CreateTrackEditionDocument, options);
      }
export type CreateTrackEditionMutationHookResult = ReturnType<typeof useCreateTrackEditionMutation>;
export type CreateTrackEditionMutationResult = Apollo.MutationResult<CreateTrackEditionMutation>;
export type CreateTrackEditionMutationOptions = Apollo.BaseMutationOptions<CreateTrackEditionMutation, CreateTrackEditionMutationVariables>;
export const CreateWhitelistEntryDocument = gql`
    mutation CreateWhitelistEntry($input: CreateWhitelistEntryInput!) {
  createWhitelistEntry(input: $input) {
    whitelistEntry {
      id
    }
  }
}
    `;
export type CreateWhitelistEntryMutationFn = Apollo.MutationFunction<CreateWhitelistEntryMutation, CreateWhitelistEntryMutationVariables>;

/**
 * __useCreateWhitelistEntryMutation__
 *
 * To run a mutation, you first call `useCreateWhitelistEntryMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateWhitelistEntryMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createWhitelistEntryMutation, { data, loading, error }] = useCreateWhitelistEntryMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateWhitelistEntryMutation(baseOptions?: Apollo.MutationHookOptions<CreateWhitelistEntryMutation, CreateWhitelistEntryMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<CreateWhitelistEntryMutation, CreateWhitelistEntryMutationVariables>(CreateWhitelistEntryDocument, options);
      }
export type CreateWhitelistEntryMutationHookResult = ReturnType<typeof useCreateWhitelistEntryMutation>;
export type CreateWhitelistEntryMutationResult = Apollo.MutationResult<CreateWhitelistEntryMutation>;
export type CreateWhitelistEntryMutationOptions = Apollo.BaseMutationOptions<CreateWhitelistEntryMutation, CreateWhitelistEntryMutationVariables>;
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
export const DeleteTrackDocument = gql`
    mutation deleteTrack($trackId: String!) {
  deleteTrack(trackId: $trackId) {
    ...TrackComponentFields
  }
}
    ${TrackComponentFieldsFragmentDoc}`;
export type DeleteTrackMutationFn = Apollo.MutationFunction<DeleteTrackMutation, DeleteTrackMutationVariables>;

/**
 * __useDeleteTrackMutation__
 *
 * To run a mutation, you first call `useDeleteTrackMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTrackMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTrackMutation, { data, loading, error }] = useDeleteTrackMutation({
 *   variables: {
 *      trackId: // value for 'trackId'
 *   },
 * });
 */
export function useDeleteTrackMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTrackMutation, DeleteTrackMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTrackMutation, DeleteTrackMutationVariables>(DeleteTrackDocument, options);
      }
export type DeleteTrackMutationHookResult = ReturnType<typeof useDeleteTrackMutation>;
export type DeleteTrackMutationResult = Apollo.MutationResult<DeleteTrackMutation>;
export type DeleteTrackMutationOptions = Apollo.BaseMutationOptions<DeleteTrackMutation, DeleteTrackMutationVariables>;
export const DeleteTrackEditionDocument = gql`
    mutation deleteTrackEdition($trackEditionId: String!) {
  deleteTrackEdition(trackEditionId: $trackEditionId) {
    id
  }
}
    `;
export type DeleteTrackEditionMutationFn = Apollo.MutationFunction<DeleteTrackEditionMutation, DeleteTrackEditionMutationVariables>;

/**
 * __useDeleteTrackEditionMutation__
 *
 * To run a mutation, you first call `useDeleteTrackEditionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteTrackEditionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteTrackEditionMutation, { data, loading, error }] = useDeleteTrackEditionMutation({
 *   variables: {
 *      trackEditionId: // value for 'trackEditionId'
 *   },
 * });
 */
export function useDeleteTrackEditionMutation(baseOptions?: Apollo.MutationHookOptions<DeleteTrackEditionMutation, DeleteTrackEditionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<DeleteTrackEditionMutation, DeleteTrackEditionMutationVariables>(DeleteTrackEditionDocument, options);
      }
export type DeleteTrackEditionMutationHookResult = ReturnType<typeof useDeleteTrackEditionMutation>;
export type DeleteTrackEditionMutationResult = Apollo.MutationResult<DeleteTrackEditionMutation>;
export type DeleteTrackEditionMutationOptions = Apollo.BaseMutationOptions<DeleteTrackEditionMutation, DeleteTrackEditionMutationVariables>;
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
export function useExploreSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExploreQuery, ExploreQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExploreQuery, ExploreQueryVariables>(ExploreDocument, options);
        }
export type ExploreQueryHookResult = ReturnType<typeof useExploreQuery>;
export type ExploreLazyQueryHookResult = ReturnType<typeof useExploreLazyQuery>;
export type ExploreSuspenseQueryHookResult = ReturnType<typeof useExploreSuspenseQuery>;
export type ExploreQueryResult = Apollo.QueryResult<ExploreQuery, ExploreQueryVariables>;
export const ExploreTracksDocument = gql`
    query ExploreTracks($sort: SortExploreTracks, $search: String, $page: PageInput) {
  exploreTracks(sort: $sort, search: $search, page: $page) {
    nodes {
      ...TrackComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
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
 *      sort: // value for 'sort'
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
export function useExploreTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExploreTracksQuery, ExploreTracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExploreTracksQuery, ExploreTracksQueryVariables>(ExploreTracksDocument, options);
        }
export type ExploreTracksQueryHookResult = ReturnType<typeof useExploreTracksQuery>;
export type ExploreTracksLazyQueryHookResult = ReturnType<typeof useExploreTracksLazyQuery>;
export type ExploreTracksSuspenseQueryHookResult = ReturnType<typeof useExploreTracksSuspenseQuery>;
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
export function useExploreUsersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ExploreUsersQuery, ExploreUsersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ExploreUsersQuery, ExploreUsersQueryVariables>(ExploreUsersDocument, options);
        }
export type ExploreUsersQueryHookResult = ReturnType<typeof useExploreUsersQuery>;
export type ExploreUsersLazyQueryHookResult = ReturnType<typeof useExploreUsersLazyQuery>;
export type ExploreUsersSuspenseQueryHookResult = ReturnType<typeof useExploreUsersSuspenseQuery>;
export type ExploreUsersQueryResult = Apollo.QueryResult<ExploreUsersQuery, ExploreUsersQueryVariables>;
export const FavoriteTracksDocument = gql`
    query FavoriteTracks($sort: SortTrackInput, $search: String, $page: PageInput) {
  favoriteTracks(sort: $sort, search: $search, page: $page) {
    nodes {
      ...TrackComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;

/**
 * __useFavoriteTracksQuery__
 *
 * To run a query within a React component, call `useFavoriteTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useFavoriteTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFavoriteTracksQuery({
 *   variables: {
 *      sort: // value for 'sort'
 *      search: // value for 'search'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useFavoriteTracksQuery(baseOptions?: Apollo.QueryHookOptions<FavoriteTracksQuery, FavoriteTracksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FavoriteTracksQuery, FavoriteTracksQueryVariables>(FavoriteTracksDocument, options);
      }
export function useFavoriteTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FavoriteTracksQuery, FavoriteTracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FavoriteTracksQuery, FavoriteTracksQueryVariables>(FavoriteTracksDocument, options);
        }
export function useFavoriteTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FavoriteTracksQuery, FavoriteTracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FavoriteTracksQuery, FavoriteTracksQueryVariables>(FavoriteTracksDocument, options);
        }
export type FavoriteTracksQueryHookResult = ReturnType<typeof useFavoriteTracksQuery>;
export type FavoriteTracksLazyQueryHookResult = ReturnType<typeof useFavoriteTracksLazyQuery>;
export type FavoriteTracksSuspenseQueryHookResult = ReturnType<typeof useFavoriteTracksSuspenseQuery>;
export type FavoriteTracksQueryResult = Apollo.QueryResult<FavoriteTracksQuery, FavoriteTracksQueryVariables>;
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
export function useFeedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FeedQuery, FeedQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FeedQuery, FeedQueryVariables>(FeedDocument, options);
        }
export type FeedQueryHookResult = ReturnType<typeof useFeedQuery>;
export type FeedLazyQueryHookResult = ReturnType<typeof useFeedLazyQuery>;
export type FeedSuspenseQueryHookResult = ReturnType<typeof useFeedSuspenseQuery>;
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
export const FollowedArtistsDocument = gql`
    query FollowedArtists($profileId: String!, $search: String, $page: PageInput) {
  followedArtists(profileId: $profileId, search: $search, page: $page) {
    nodes {
      ...ProfileComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    ${ProfileComponentFieldsFragmentDoc}`;

/**
 * __useFollowedArtistsQuery__
 *
 * To run a query within a React component, call `useFollowedArtistsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFollowedArtistsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFollowedArtistsQuery({
 *   variables: {
 *      profileId: // value for 'profileId'
 *      search: // value for 'search'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useFollowedArtistsQuery(baseOptions: Apollo.QueryHookOptions<FollowedArtistsQuery, FollowedArtistsQueryVariables> & ({ variables: FollowedArtistsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FollowedArtistsQuery, FollowedArtistsQueryVariables>(FollowedArtistsDocument, options);
      }
export function useFollowedArtistsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FollowedArtistsQuery, FollowedArtistsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FollowedArtistsQuery, FollowedArtistsQueryVariables>(FollowedArtistsDocument, options);
        }
export function useFollowedArtistsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FollowedArtistsQuery, FollowedArtistsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FollowedArtistsQuery, FollowedArtistsQueryVariables>(FollowedArtistsDocument, options);
        }
export type FollowedArtistsQueryHookResult = ReturnType<typeof useFollowedArtistsQuery>;
export type FollowedArtistsLazyQueryHookResult = ReturnType<typeof useFollowedArtistsLazyQuery>;
export type FollowedArtistsSuspenseQueryHookResult = ReturnType<typeof useFollowedArtistsSuspenseQuery>;
export type FollowedArtistsQueryResult = Apollo.QueryResult<FollowedArtistsQuery, FollowedArtistsQueryVariables>;
export const FollowersDocument = gql`
    query Followers($profileId: String!, $page: PageInput) {
  followers(id: $profileId, page: $page) {
    nodes {
      id
      followerProfile {
        id
        displayName
        profilePicture
        verified
        userHandle
        teamMember
        badges
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
export function useFollowersQuery(baseOptions: Apollo.QueryHookOptions<FollowersQuery, FollowersQueryVariables> & ({ variables: FollowersQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FollowersQuery, FollowersQueryVariables>(FollowersDocument, options);
      }
export function useFollowersLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FollowersQuery, FollowersQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FollowersQuery, FollowersQueryVariables>(FollowersDocument, options);
        }
export function useFollowersSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FollowersQuery, FollowersQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FollowersQuery, FollowersQueryVariables>(FollowersDocument, options);
        }
export type FollowersQueryHookResult = ReturnType<typeof useFollowersQuery>;
export type FollowersLazyQueryHookResult = ReturnType<typeof useFollowersLazyQuery>;
export type FollowersSuspenseQueryHookResult = ReturnType<typeof useFollowersSuspenseQuery>;
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
        verified
        userHandle
        teamMember
        badges
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
export function useFollowingQuery(baseOptions: Apollo.QueryHookOptions<FollowingQuery, FollowingQueryVariables> & ({ variables: FollowingQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<FollowingQuery, FollowingQueryVariables>(FollowingDocument, options);
      }
export function useFollowingLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<FollowingQuery, FollowingQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<FollowingQuery, FollowingQueryVariables>(FollowingDocument, options);
        }
export function useFollowingSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<FollowingQuery, FollowingQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<FollowingQuery, FollowingQueryVariables>(FollowingDocument, options);
        }
export type FollowingQueryHookResult = ReturnType<typeof useFollowingQuery>;
export type FollowingLazyQueryHookResult = ReturnType<typeof useFollowingLazyQuery>;
export type FollowingSuspenseQueryHookResult = ReturnType<typeof useFollowingSuspenseQuery>;
export type FollowingQueryResult = Apollo.QueryResult<FollowingQuery, FollowingQueryVariables>;
export const GetOriginalPostFromTrackDocument = gql`
    query GetOriginalPostFromTrack($trackId: String!) {
  getOriginalPostFromTrack(trackId: $trackId) {
    ...PostComponentFields
  }
}
    ${PostComponentFieldsFragmentDoc}`;

/**
 * __useGetOriginalPostFromTrackQuery__
 *
 * To run a query within a React component, call `useGetOriginalPostFromTrackQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetOriginalPostFromTrackQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetOriginalPostFromTrackQuery({
 *   variables: {
 *      trackId: // value for 'trackId'
 *   },
 * });
 */
export function useGetOriginalPostFromTrackQuery(baseOptions: Apollo.QueryHookOptions<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables> & ({ variables: GetOriginalPostFromTrackQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables>(GetOriginalPostFromTrackDocument, options);
      }
export function useGetOriginalPostFromTrackLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables>(GetOriginalPostFromTrackDocument, options);
        }
export function useGetOriginalPostFromTrackSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables>(GetOriginalPostFromTrackDocument, options);
        }
export type GetOriginalPostFromTrackQueryHookResult = ReturnType<typeof useGetOriginalPostFromTrackQuery>;
export type GetOriginalPostFromTrackLazyQueryHookResult = ReturnType<typeof useGetOriginalPostFromTrackLazyQuery>;
export type GetOriginalPostFromTrackSuspenseQueryHookResult = ReturnType<typeof useGetOriginalPostFromTrackSuspenseQuery>;
export type GetOriginalPostFromTrackQueryResult = Apollo.QueryResult<GetOriginalPostFromTrackQuery, GetOriginalPostFromTrackQueryVariables>;
export const GroupedTracksDocument = gql`
    query GroupedTracks($filter: FilterTrackInput, $sort: SortTrackInput, $page: PageInput) {
  groupedTracks(filter: $filter, sort: $sort, page: $page) {
    nodes {
      ...TrackComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;

/**
 * __useGroupedTracksQuery__
 *
 * To run a query within a React component, call `useGroupedTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useGroupedTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGroupedTracksQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      sort: // value for 'sort'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useGroupedTracksQuery(baseOptions?: Apollo.QueryHookOptions<GroupedTracksQuery, GroupedTracksQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GroupedTracksQuery, GroupedTracksQueryVariables>(GroupedTracksDocument, options);
      }
export function useGroupedTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GroupedTracksQuery, GroupedTracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GroupedTracksQuery, GroupedTracksQueryVariables>(GroupedTracksDocument, options);
        }
export function useGroupedTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GroupedTracksQuery, GroupedTracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GroupedTracksQuery, GroupedTracksQueryVariables>(GroupedTracksDocument, options);
        }
export type GroupedTracksQueryHookResult = ReturnType<typeof useGroupedTracksQuery>;
export type GroupedTracksLazyQueryHookResult = ReturnType<typeof useGroupedTracksLazyQuery>;
export type GroupedTracksSuspenseQueryHookResult = ReturnType<typeof useGroupedTracksSuspenseQuery>;
export type GroupedTracksQueryResult = Apollo.QueryResult<GroupedTracksQuery, GroupedTracksQueryVariables>;
export const GuestAddCommentDocument = gql`
    mutation GuestAddComment($input: AddCommentInput!, $walletAddress: String!) {
  guestAddComment(input: $input, walletAddress: $walletAddress) {
    comment {
      id
      body
      isGuest
      walletAddress
      createdAt
      updatedAt
      post {
        id
      }
    }
  }
}
    `;
export type GuestAddCommentMutationFn = Apollo.MutationFunction<GuestAddCommentMutation, GuestAddCommentMutationVariables>;

/**
 * __useGuestAddCommentMutation__
 *
 * To run a mutation, you first call `useGuestAddCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGuestAddCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [guestAddCommentMutation, { data, loading, error }] = useGuestAddCommentMutation({
 *   variables: {
 *      input: // value for 'input'
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useGuestAddCommentMutation(baseOptions?: Apollo.MutationHookOptions<GuestAddCommentMutation, GuestAddCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GuestAddCommentMutation, GuestAddCommentMutationVariables>(GuestAddCommentDocument, options);
      }
export type GuestAddCommentMutationHookResult = ReturnType<typeof useGuestAddCommentMutation>;
export type GuestAddCommentMutationResult = Apollo.MutationResult<GuestAddCommentMutation>;
export type GuestAddCommentMutationOptions = Apollo.BaseMutationOptions<GuestAddCommentMutation, GuestAddCommentMutationVariables>;
export const GuestCreatePostDocument = gql`
    mutation GuestCreatePost($input: CreatePostInput!, $walletAddress: String!) {
  guestCreatePost(input: $input, walletAddress: $walletAddress) {
    post {
      id
      body
      mediaLink
      originalMediaLink
      mediaThumbnail
      createdAt
      updatedAt
      isGuest
      walletAddress
      uploadedMediaUrl
      uploadedMediaType
      mediaExpiresAt
      isEphemeral
    }
  }
}
    `;
export type GuestCreatePostMutationFn = Apollo.MutationFunction<GuestCreatePostMutation, GuestCreatePostMutationVariables>;

/**
 * __useGuestCreatePostMutation__
 *
 * To run a mutation, you first call `useGuestCreatePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGuestCreatePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [guestCreatePostMutation, { data, loading, error }] = useGuestCreatePostMutation({
 *   variables: {
 *      input: // value for 'input'
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useGuestCreatePostMutation(baseOptions?: Apollo.MutationHookOptions<GuestCreatePostMutation, GuestCreatePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GuestCreatePostMutation, GuestCreatePostMutationVariables>(GuestCreatePostDocument, options);
      }
export type GuestCreatePostMutationHookResult = ReturnType<typeof useGuestCreatePostMutation>;
export type GuestCreatePostMutationResult = Apollo.MutationResult<GuestCreatePostMutation>;
export type GuestCreatePostMutationOptions = Apollo.BaseMutationOptions<GuestCreatePostMutation, GuestCreatePostMutationVariables>;
export const GuestDeletePostDocument = gql`
    mutation GuestDeletePost($postId: String!, $walletAddress: String!) {
  guestDeletePost(postId: $postId, walletAddress: $walletAddress) {
    post {
      id
      deleted
    }
  }
}
    `;
export type GuestDeletePostMutationFn = Apollo.MutationFunction<GuestDeletePostMutation, GuestDeletePostMutationVariables>;

/**
 * __useGuestDeletePostMutation__
 *
 * To run a mutation, you first call `useGuestDeletePostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGuestDeletePostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [guestDeletePostMutation, { data, loading, error }] = useGuestDeletePostMutation({
 *   variables: {
 *      postId: // value for 'postId'
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useGuestDeletePostMutation(baseOptions?: Apollo.MutationHookOptions<GuestDeletePostMutation, GuestDeletePostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GuestDeletePostMutation, GuestDeletePostMutationVariables>(GuestDeletePostDocument, options);
      }
export type GuestDeletePostMutationHookResult = ReturnType<typeof useGuestDeletePostMutation>;
export type GuestDeletePostMutationResult = Apollo.MutationResult<GuestDeletePostMutation>;
export type GuestDeletePostMutationOptions = Apollo.BaseMutationOptions<GuestDeletePostMutation, GuestDeletePostMutationVariables>;
export const GuestReactToPostDocument = gql`
    mutation GuestReactToPost($input: ReactToPostInput!, $walletAddress: String!) {
  guestReactToPost(input: $input, walletAddress: $walletAddress) {
    post {
      id
      totalReactions
      topReactions(top: 2)
    }
  }
}
    `;
export type GuestReactToPostMutationFn = Apollo.MutationFunction<GuestReactToPostMutation, GuestReactToPostMutationVariables>;

/**
 * __useGuestReactToPostMutation__
 *
 * To run a mutation, you first call `useGuestReactToPostMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGuestReactToPostMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [guestReactToPostMutation, { data, loading, error }] = useGuestReactToPostMutation({
 *   variables: {
 *      input: // value for 'input'
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useGuestReactToPostMutation(baseOptions?: Apollo.MutationHookOptions<GuestReactToPostMutation, GuestReactToPostMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GuestReactToPostMutation, GuestReactToPostMutationVariables>(GuestReactToPostDocument, options);
      }
export type GuestReactToPostMutationHookResult = ReturnType<typeof useGuestReactToPostMutation>;
export type GuestReactToPostMutationResult = Apollo.MutationResult<GuestReactToPostMutation>;
export type GuestReactToPostMutationOptions = Apollo.BaseMutationOptions<GuestReactToPostMutation, GuestReactToPostMutationVariables>;
export const GuestRetractReactionDocument = gql`
    mutation GuestRetractReaction($postId: String!, $walletAddress: String!) {
  guestRetractReaction(postId: $postId, walletAddress: $walletAddress) {
    post {
      id
      totalReactions
      topReactions(top: 2)
    }
  }
}
    `;
export type GuestRetractReactionMutationFn = Apollo.MutationFunction<GuestRetractReactionMutation, GuestRetractReactionMutationVariables>;

/**
 * __useGuestRetractReactionMutation__
 *
 * To run a mutation, you first call `useGuestRetractReactionMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useGuestRetractReactionMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [guestRetractReactionMutation, { data, loading, error }] = useGuestRetractReactionMutation({
 *   variables: {
 *      postId: // value for 'postId'
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useGuestRetractReactionMutation(baseOptions?: Apollo.MutationHookOptions<GuestRetractReactionMutation, GuestRetractReactionMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<GuestRetractReactionMutation, GuestRetractReactionMutationVariables>(GuestRetractReactionDocument, options);
      }
export type GuestRetractReactionMutationHookResult = ReturnType<typeof useGuestRetractReactionMutation>;
export type GuestRetractReactionMutationResult = Apollo.MutationResult<GuestRetractReactionMutation>;
export type GuestRetractReactionMutationOptions = Apollo.BaseMutationOptions<GuestRetractReactionMutation, GuestRetractReactionMutationVariables>;
export const HaveBidedDocument = gql`
    query HaveBided($auctionId: String!, $bidder: String!) {
  haveBided(auctionId: $auctionId, bidder: $bidder) {
    bided
  }
}
    `;

/**
 * __useHaveBidedQuery__
 *
 * To run a query within a React component, call `useHaveBidedQuery` and pass it any options that fit your needs.
 * When your component renders, `useHaveBidedQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHaveBidedQuery({
 *   variables: {
 *      auctionId: // value for 'auctionId'
 *      bidder: // value for 'bidder'
 *   },
 * });
 */
export function useHaveBidedQuery(baseOptions: Apollo.QueryHookOptions<HaveBidedQuery, HaveBidedQueryVariables> & ({ variables: HaveBidedQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<HaveBidedQuery, HaveBidedQueryVariables>(HaveBidedDocument, options);
      }
export function useHaveBidedLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<HaveBidedQuery, HaveBidedQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<HaveBidedQuery, HaveBidedQueryVariables>(HaveBidedDocument, options);
        }
export function useHaveBidedSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<HaveBidedQuery, HaveBidedQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<HaveBidedQuery, HaveBidedQueryVariables>(HaveBidedDocument, options);
        }
export type HaveBidedQueryHookResult = ReturnType<typeof useHaveBidedQuery>;
export type HaveBidedLazyQueryHookResult = ReturnType<typeof useHaveBidedLazyQuery>;
export type HaveBidedSuspenseQueryHookResult = ReturnType<typeof useHaveBidedSuspenseQuery>;
export type HaveBidedQueryResult = Apollo.QueryResult<HaveBidedQuery, HaveBidedQueryVariables>;
export const ListableOwnedTrackIdsDocument = gql`
    query ListableOwnedTrackIds($filter: FilterOwnedTracksInput!) {
  listableOwnedTracks(filter: $filter) {
    nodes {
      id
      nftData {
        tokenId
      }
    }
  }
}
    `;

/**
 * __useListableOwnedTrackIdsQuery__
 *
 * To run a query within a React component, call `useListableOwnedTrackIdsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListableOwnedTrackIdsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListableOwnedTrackIdsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useListableOwnedTrackIdsQuery(baseOptions: Apollo.QueryHookOptions<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables> & ({ variables: ListableOwnedTrackIdsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables>(ListableOwnedTrackIdsDocument, options);
      }
export function useListableOwnedTrackIdsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables>(ListableOwnedTrackIdsDocument, options);
        }
export function useListableOwnedTrackIdsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables>(ListableOwnedTrackIdsDocument, options);
        }
export type ListableOwnedTrackIdsQueryHookResult = ReturnType<typeof useListableOwnedTrackIdsQuery>;
export type ListableOwnedTrackIdsLazyQueryHookResult = ReturnType<typeof useListableOwnedTrackIdsLazyQuery>;
export type ListableOwnedTrackIdsSuspenseQueryHookResult = ReturnType<typeof useListableOwnedTrackIdsSuspenseQuery>;
export type ListableOwnedTrackIdsQueryResult = Apollo.QueryResult<ListableOwnedTrackIdsQuery, ListableOwnedTrackIdsQueryVariables>;
export const ListingItemDocument = gql`
    query ListingItem($input: FilterListingItemInput!) {
  listingItem(input: $input) {
    ...ListingItemViewComponentFields
  }
}
    ${ListingItemViewComponentFieldsFragmentDoc}`;

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
 *      input: // value for 'input'
 *   },
 * });
 */
export function useListingItemQuery(baseOptions: Apollo.QueryHookOptions<ListingItemQuery, ListingItemQueryVariables> & ({ variables: ListingItemQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListingItemQuery, ListingItemQueryVariables>(ListingItemDocument, options);
      }
export function useListingItemLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListingItemQuery, ListingItemQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListingItemQuery, ListingItemQueryVariables>(ListingItemDocument, options);
        }
export function useListingItemSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListingItemQuery, ListingItemQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListingItemQuery, ListingItemQueryVariables>(ListingItemDocument, options);
        }
export type ListingItemQueryHookResult = ReturnType<typeof useListingItemQuery>;
export type ListingItemLazyQueryHookResult = ReturnType<typeof useListingItemLazyQuery>;
export type ListingItemSuspenseQueryHookResult = ReturnType<typeof useListingItemSuspenseQuery>;
export type ListingItemQueryResult = Apollo.QueryResult<ListingItemQuery, ListingItemQueryVariables>;
export const ListingItemsDocument = gql`
    query ListingItems($filter: FilterTrackMarketplace, $sort: SortListingItemInput, $page: PageInput) {
  listingItems(filter: $filter, sort: $sort, page: $page) {
    nodes {
      ...ListingItemComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    ${ListingItemComponentFieldsFragmentDoc}`;

/**
 * __useListingItemsQuery__
 *
 * To run a query within a React component, call `useListingItemsQuery` and pass it any options that fit your needs.
 * When your component renders, `useListingItemsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useListingItemsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      sort: // value for 'sort'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useListingItemsQuery(baseOptions?: Apollo.QueryHookOptions<ListingItemsQuery, ListingItemsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ListingItemsQuery, ListingItemsQueryVariables>(ListingItemsDocument, options);
      }
export function useListingItemsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ListingItemsQuery, ListingItemsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ListingItemsQuery, ListingItemsQueryVariables>(ListingItemsDocument, options);
        }
export function useListingItemsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ListingItemsQuery, ListingItemsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ListingItemsQuery, ListingItemsQueryVariables>(ListingItemsDocument, options);
        }
export type ListingItemsQueryHookResult = ReturnType<typeof useListingItemsQuery>;
export type ListingItemsLazyQueryHookResult = ReturnType<typeof useListingItemsLazyQuery>;
export type ListingItemsSuspenseQueryHookResult = ReturnType<typeof useListingItemsSuspenseQuery>;
export type ListingItemsQueryResult = Apollo.QueryResult<ListingItemsQuery, ListingItemsQueryVariables>;
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
export const MaticUsdDocument = gql`
    query MaticUsd {
  maticUsd
}
    `;

/**
 * __useMaticUsdQuery__
 *
 * To run a query within a React component, call `useMaticUsdQuery` and pass it any options that fit your needs.
 * When your component renders, `useMaticUsdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useMaticUsdQuery({
 *   variables: {
 *   },
 * });
 */
export function useMaticUsdQuery(baseOptions?: Apollo.QueryHookOptions<MaticUsdQuery, MaticUsdQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MaticUsdQuery, MaticUsdQueryVariables>(MaticUsdDocument, options);
      }
export function useMaticUsdLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MaticUsdQuery, MaticUsdQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MaticUsdQuery, MaticUsdQueryVariables>(MaticUsdDocument, options);
        }
export function useMaticUsdSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MaticUsdQuery, MaticUsdQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MaticUsdQuery, MaticUsdQueryVariables>(MaticUsdDocument, options);
        }
export type MaticUsdQueryHookResult = ReturnType<typeof useMaticUsdQuery>;
export type MaticUsdLazyQueryHookResult = ReturnType<typeof useMaticUsdLazyQuery>;
export type MaticUsdSuspenseQueryHookResult = ReturnType<typeof useMaticUsdSuspenseQuery>;
export type MaticUsdQueryResult = Apollo.QueryResult<MaticUsdQuery, MaticUsdQueryVariables>;
export const MeDocument = gql`
    query Me {
  me {
    id
    handle
    email
    magicWalletAddress
    googleWalletAddress
    discordWalletAddress
    twitchWalletAddress
    emailWalletAddress
    metaMaskWalletAddressees
    defaultWallet
    authMethod
    isApprovedOnMarketplace
    roles
    profile {
      ...ProfileComponentFields
    }
  }
}
    ${ProfileComponentFieldsFragmentDoc}`;

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
export function useMeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MeQuery, MeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MeQuery, MeQueryVariables>(MeDocument, options);
        }
export type MeQueryHookResult = ReturnType<typeof useMeQuery>;
export type MeLazyQueryHookResult = ReturnType<typeof useMeLazyQuery>;
export type MeSuspenseQueryHookResult = ReturnType<typeof useMeSuspenseQuery>;
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
export function useMessageQuery(baseOptions: Apollo.QueryHookOptions<MessageQuery, MessageQueryVariables> & ({ variables: MessageQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MessageQuery, MessageQueryVariables>(MessageDocument, options);
      }
export function useMessageLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MessageQuery, MessageQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MessageQuery, MessageQueryVariables>(MessageDocument, options);
        }
export function useMessageSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MessageQuery, MessageQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MessageQuery, MessageQueryVariables>(MessageDocument, options);
        }
export type MessageQueryHookResult = ReturnType<typeof useMessageQuery>;
export type MessageLazyQueryHookResult = ReturnType<typeof useMessageLazyQuery>;
export type MessageSuspenseQueryHookResult = ReturnType<typeof useMessageSuspenseQuery>;
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
export function useMimeTypeQuery(baseOptions: Apollo.QueryHookOptions<MimeTypeQuery, MimeTypeQueryVariables> & ({ variables: MimeTypeQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<MimeTypeQuery, MimeTypeQueryVariables>(MimeTypeDocument, options);
      }
export function useMimeTypeLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<MimeTypeQuery, MimeTypeQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<MimeTypeQuery, MimeTypeQueryVariables>(MimeTypeDocument, options);
        }
export function useMimeTypeSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<MimeTypeQuery, MimeTypeQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<MimeTypeQuery, MimeTypeQueryVariables>(MimeTypeDocument, options);
        }
export type MimeTypeQueryHookResult = ReturnType<typeof useMimeTypeQuery>;
export type MimeTypeLazyQueryHookResult = ReturnType<typeof useMimeTypeLazyQuery>;
export type MimeTypeSuspenseQueryHookResult = ReturnType<typeof useMimeTypeSuspenseQuery>;
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
    ... on VerificationRequestNotification {
      ...VerificationRequestNotificationFields
    }
    ... on NewVerificationRequestNotification {
      ...NewVerificationRequestNotificationFields
    }
    ... on DeletedPostNotification {
      ...DeletedPostNotificationFields
    }
    ... on DeletedCommentNotification {
      ...DeletedCommentNotificationFields
    }
    ... on WonAuctionNotification {
      ...WonAuctionNotificationFields
    }
    ... on AuctionIsEndingNotification {
      ...AuctionIsEndingNotificationFields
    }
    ... on OutbidNotification {
      ...OutbidNotificationFields
    }
    ... on NewBidNotification {
      ...NewBidNotificationFields
    }
    ... on AuctionEndedNotification {
      ...AuctionEndedNotificationFields
    }
  }
}
    ${CommentNotificationFieldsFragmentDoc}
${ReactionNotificationFieldsFragmentDoc}
${FollowerNotificationFieldsFragmentDoc}
${NewPostNotificationFieldsFragmentDoc}
${NftSoldNotificationFieldsFragmentDoc}
${VerificationRequestNotificationFieldsFragmentDoc}
${NewVerificationRequestNotificationFieldsFragmentDoc}
${DeletedPostNotificationFieldsFragmentDoc}
${DeletedCommentNotificationFieldsFragmentDoc}
${WonAuctionNotificationFieldsFragmentDoc}
${AuctionIsEndingNotificationFieldsFragmentDoc}
${OutbidNotificationFieldsFragmentDoc}
${NewBidNotificationFieldsFragmentDoc}
${AuctionEndedNotificationFieldsFragmentDoc}`;

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
export function useNotificationQuery(baseOptions: Apollo.QueryHookOptions<NotificationQuery, NotificationQueryVariables> & ({ variables: NotificationQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<NotificationQuery, NotificationQueryVariables>(NotificationDocument, options);
      }
export function useNotificationLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<NotificationQuery, NotificationQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<NotificationQuery, NotificationQueryVariables>(NotificationDocument, options);
        }
export function useNotificationSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<NotificationQuery, NotificationQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NotificationQuery, NotificationQueryVariables>(NotificationDocument, options);
        }
export type NotificationQueryHookResult = ReturnType<typeof useNotificationQuery>;
export type NotificationLazyQueryHookResult = ReturnType<typeof useNotificationLazyQuery>;
export type NotificationSuspenseQueryHookResult = ReturnType<typeof useNotificationSuspenseQuery>;
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
export function useNotificationCountSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<NotificationCountQuery, NotificationCountQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NotificationCountQuery, NotificationCountQueryVariables>(NotificationCountDocument, options);
        }
export type NotificationCountQueryHookResult = ReturnType<typeof useNotificationCountQuery>;
export type NotificationCountLazyQueryHookResult = ReturnType<typeof useNotificationCountLazyQuery>;
export type NotificationCountSuspenseQueryHookResult = ReturnType<typeof useNotificationCountSuspenseQuery>;
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
      ... on VerificationRequestNotification {
        ...VerificationRequestNotificationFields
      }
      ... on NewVerificationRequestNotification {
        ...NewVerificationRequestNotificationFields
      }
      ... on DeletedPostNotification {
        ...DeletedPostNotificationFields
      }
      ... on DeletedCommentNotification {
        ...DeletedCommentNotificationFields
      }
      ... on WonAuctionNotification {
        ...WonAuctionNotificationFields
      }
      ... on AuctionIsEndingNotification {
        ...AuctionIsEndingNotificationFields
      }
      ... on OutbidNotification {
        ...OutbidNotificationFields
      }
      ... on NewBidNotification {
        ...NewBidNotificationFields
      }
      ... on AuctionEndedNotification {
        ...AuctionEndedNotificationFields
      }
    }
  }
}
    ${CommentNotificationFieldsFragmentDoc}
${ReactionNotificationFieldsFragmentDoc}
${FollowerNotificationFieldsFragmentDoc}
${NewPostNotificationFieldsFragmentDoc}
${NftSoldNotificationFieldsFragmentDoc}
${VerificationRequestNotificationFieldsFragmentDoc}
${NewVerificationRequestNotificationFieldsFragmentDoc}
${DeletedPostNotificationFieldsFragmentDoc}
${DeletedCommentNotificationFieldsFragmentDoc}
${WonAuctionNotificationFieldsFragmentDoc}
${AuctionIsEndingNotificationFieldsFragmentDoc}
${OutbidNotificationFieldsFragmentDoc}
${NewBidNotificationFieldsFragmentDoc}
${AuctionEndedNotificationFieldsFragmentDoc}`;

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
export function useNotificationsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<NotificationsQuery, NotificationsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<NotificationsQuery, NotificationsQueryVariables>(NotificationsDocument, options);
        }
export type NotificationsQueryHookResult = ReturnType<typeof useNotificationsQuery>;
export type NotificationsLazyQueryHookResult = ReturnType<typeof useNotificationsLazyQuery>;
export type NotificationsSuspenseQueryHookResult = ReturnType<typeof useNotificationsSuspenseQuery>;
export type NotificationsQueryResult = Apollo.QueryResult<NotificationsQuery, NotificationsQueryVariables>;
export const OwnedBuyNowTrackIdsDocument = gql`
    query OwnedBuyNowTrackIds($filter: FilterOwnedBuyNowItemInput!) {
  ownedBuyNowListingItems(filter: $filter) {
    nodes {
      id
      nftData {
        tokenId
      }
    }
  }
}
    `;

/**
 * __useOwnedBuyNowTrackIdsQuery__
 *
 * To run a query within a React component, call `useOwnedBuyNowTrackIdsQuery` and pass it any options that fit your needs.
 * When your component renders, `useOwnedBuyNowTrackIdsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOwnedBuyNowTrackIdsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useOwnedBuyNowTrackIdsQuery(baseOptions: Apollo.QueryHookOptions<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables> & ({ variables: OwnedBuyNowTrackIdsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables>(OwnedBuyNowTrackIdsDocument, options);
      }
export function useOwnedBuyNowTrackIdsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables>(OwnedBuyNowTrackIdsDocument, options);
        }
export function useOwnedBuyNowTrackIdsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables>(OwnedBuyNowTrackIdsDocument, options);
        }
export type OwnedBuyNowTrackIdsQueryHookResult = ReturnType<typeof useOwnedBuyNowTrackIdsQuery>;
export type OwnedBuyNowTrackIdsLazyQueryHookResult = ReturnType<typeof useOwnedBuyNowTrackIdsLazyQuery>;
export type OwnedBuyNowTrackIdsSuspenseQueryHookResult = ReturnType<typeof useOwnedBuyNowTrackIdsSuspenseQuery>;
export type OwnedBuyNowTrackIdsQueryResult = Apollo.QueryResult<OwnedBuyNowTrackIdsQuery, OwnedBuyNowTrackIdsQueryVariables>;
export const OwnedTrackIdsDocument = gql`
    query OwnedTrackIds($filter: FilterOwnedTracksInput!) {
  ownedTracks(filter: $filter) {
    nodes {
      id
      nftData {
        tokenId
      }
    }
  }
}
    `;

/**
 * __useOwnedTrackIdsQuery__
 *
 * To run a query within a React component, call `useOwnedTrackIdsQuery` and pass it any options that fit your needs.
 * When your component renders, `useOwnedTrackIdsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOwnedTrackIdsQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useOwnedTrackIdsQuery(baseOptions: Apollo.QueryHookOptions<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables> & ({ variables: OwnedTrackIdsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables>(OwnedTrackIdsDocument, options);
      }
export function useOwnedTrackIdsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables>(OwnedTrackIdsDocument, options);
        }
export function useOwnedTrackIdsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables>(OwnedTrackIdsDocument, options);
        }
export type OwnedTrackIdsQueryHookResult = ReturnType<typeof useOwnedTrackIdsQuery>;
export type OwnedTrackIdsLazyQueryHookResult = ReturnType<typeof useOwnedTrackIdsLazyQuery>;
export type OwnedTrackIdsSuspenseQueryHookResult = ReturnType<typeof useOwnedTrackIdsSuspenseQuery>;
export type OwnedTrackIdsQueryResult = Apollo.QueryResult<OwnedTrackIdsQuery, OwnedTrackIdsQueryVariables>;
export const OwnedTracksDocument = gql`
    query OwnedTracks($filter: FilterOwnedTracksInput!, $page: PageInput) {
  ownedTracks(filter: $filter, page: $page) {
    nodes {
      ...TrackComponentFields
      listingItem {
        ...ListingItemViewComponentFields
      }
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}
${ListingItemViewComponentFieldsFragmentDoc}`;

/**
 * __useOwnedTracksQuery__
 *
 * To run a query within a React component, call `useOwnedTracksQuery` and pass it any options that fit your needs.
 * When your component renders, `useOwnedTracksQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useOwnedTracksQuery({
 *   variables: {
 *      filter: // value for 'filter'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useOwnedTracksQuery(baseOptions: Apollo.QueryHookOptions<OwnedTracksQuery, OwnedTracksQueryVariables> & ({ variables: OwnedTracksQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<OwnedTracksQuery, OwnedTracksQueryVariables>(OwnedTracksDocument, options);
      }
export function useOwnedTracksLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<OwnedTracksQuery, OwnedTracksQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<OwnedTracksQuery, OwnedTracksQueryVariables>(OwnedTracksDocument, options);
        }
export function useOwnedTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<OwnedTracksQuery, OwnedTracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<OwnedTracksQuery, OwnedTracksQueryVariables>(OwnedTracksDocument, options);
        }
export type OwnedTracksQueryHookResult = ReturnType<typeof useOwnedTracksQuery>;
export type OwnedTracksLazyQueryHookResult = ReturnType<typeof useOwnedTracksLazyQuery>;
export type OwnedTracksSuspenseQueryHookResult = ReturnType<typeof useOwnedTracksSuspenseQuery>;
export type OwnedTracksQueryResult = Apollo.QueryResult<OwnedTracksQuery, OwnedTracksQueryVariables>;
export const PendingRequestsBadgeNumberDocument = gql`
    query PendingRequestsBadgeNumber {
  pendingRequestsBadgeNumber
}
    `;

/**
 * __usePendingRequestsBadgeNumberQuery__
 *
 * To run a query within a React component, call `usePendingRequestsBadgeNumberQuery` and pass it any options that fit your needs.
 * When your component renders, `usePendingRequestsBadgeNumberQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePendingRequestsBadgeNumberQuery({
 *   variables: {
 *   },
 * });
 */
export function usePendingRequestsBadgeNumberQuery(baseOptions?: Apollo.QueryHookOptions<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>(PendingRequestsBadgeNumberDocument, options);
      }
export function usePendingRequestsBadgeNumberLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>(PendingRequestsBadgeNumberDocument, options);
        }
export function usePendingRequestsBadgeNumberSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>(PendingRequestsBadgeNumberDocument, options);
        }
export type PendingRequestsBadgeNumberQueryHookResult = ReturnType<typeof usePendingRequestsBadgeNumberQuery>;
export type PendingRequestsBadgeNumberLazyQueryHookResult = ReturnType<typeof usePendingRequestsBadgeNumberLazyQuery>;
export type PendingRequestsBadgeNumberSuspenseQueryHookResult = ReturnType<typeof usePendingRequestsBadgeNumberSuspenseQuery>;
export type PendingRequestsBadgeNumberQueryResult = Apollo.QueryResult<PendingRequestsBadgeNumberQuery, PendingRequestsBadgeNumberQueryVariables>;
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
export const PolygonscanDocument = gql`
    query Polygonscan($wallet: String!, $page: PageInput) {
  getTransactionHistory(wallet: $wallet, page: $page) {
    nextPage
    result {
      blockNumber
      timeStamp
      hash
      nonce
      blockHash
      transactionIndex
      from
      to
      value
      gas
      gasPrice
      isError
      txreceipt_status
      input
      contractAddress
      cumulativeGasUsed
      gasUsed
      confirmations
      method
      date
    }
  }
}
    `;

/**
 * __usePolygonscanQuery__
 *
 * To run a query within a React component, call `usePolygonscanQuery` and pass it any options that fit your needs.
 * When your component renders, `usePolygonscanQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePolygonscanQuery({
 *   variables: {
 *      wallet: // value for 'wallet'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePolygonscanQuery(baseOptions: Apollo.QueryHookOptions<PolygonscanQuery, PolygonscanQueryVariables> & ({ variables: PolygonscanQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PolygonscanQuery, PolygonscanQueryVariables>(PolygonscanDocument, options);
      }
export function usePolygonscanLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PolygonscanQuery, PolygonscanQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PolygonscanQuery, PolygonscanQueryVariables>(PolygonscanDocument, options);
        }
export function usePolygonscanSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PolygonscanQuery, PolygonscanQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PolygonscanQuery, PolygonscanQueryVariables>(PolygonscanDocument, options);
        }
export type PolygonscanQueryHookResult = ReturnType<typeof usePolygonscanQuery>;
export type PolygonscanLazyQueryHookResult = ReturnType<typeof usePolygonscanLazyQuery>;
export type PolygonscanSuspenseQueryHookResult = ReturnType<typeof usePolygonscanSuspenseQuery>;
export type PolygonscanQueryResult = Apollo.QueryResult<PolygonscanQuery, PolygonscanQueryVariables>;
export const PolygonscanInternalTrxDocument = gql`
    query PolygonscanInternalTrx($wallet: String!, $page: PageInput) {
  getInternalTransactionHistory(wallet: $wallet, page: $page) {
    nextPage
    result {
      blockNumber
      timeStamp
      hash
      from
      to
      value
      gas
      isError
      input
      contractAddress
      gasUsed
      date
    }
  }
}
    `;

/**
 * __usePolygonscanInternalTrxQuery__
 *
 * To run a query within a React component, call `usePolygonscanInternalTrxQuery` and pass it any options that fit your needs.
 * When your component renders, `usePolygonscanInternalTrxQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = usePolygonscanInternalTrxQuery({
 *   variables: {
 *      wallet: // value for 'wallet'
 *      page: // value for 'page'
 *   },
 * });
 */
export function usePolygonscanInternalTrxQuery(baseOptions: Apollo.QueryHookOptions<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables> & ({ variables: PolygonscanInternalTrxQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables>(PolygonscanInternalTrxDocument, options);
      }
export function usePolygonscanInternalTrxLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables>(PolygonscanInternalTrxDocument, options);
        }
export function usePolygonscanInternalTrxSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables>(PolygonscanInternalTrxDocument, options);
        }
export type PolygonscanInternalTrxQueryHookResult = ReturnType<typeof usePolygonscanInternalTrxQuery>;
export type PolygonscanInternalTrxLazyQueryHookResult = ReturnType<typeof usePolygonscanInternalTrxLazyQuery>;
export type PolygonscanInternalTrxSuspenseQueryHookResult = ReturnType<typeof usePolygonscanInternalTrxSuspenseQuery>;
export type PolygonscanInternalTrxQueryResult = Apollo.QueryResult<PolygonscanInternalTrxQuery, PolygonscanInternalTrxQueryVariables>;
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
export function usePostQuery(baseOptions: Apollo.QueryHookOptions<PostQuery, PostQueryVariables> & ({ variables: PostQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<PostQuery, PostQueryVariables>(PostDocument, options);
      }
export function usePostLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<PostQuery, PostQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<PostQuery, PostQueryVariables>(PostDocument, options);
        }
export function usePostSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PostQuery, PostQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PostQuery, PostQueryVariables>(PostDocument, options);
        }
export type PostQueryHookResult = ReturnType<typeof usePostQuery>;
export type PostLazyQueryHookResult = ReturnType<typeof usePostLazyQuery>;
export type PostSuspenseQueryHookResult = ReturnType<typeof usePostSuspenseQuery>;
export type PostQueryResult = Apollo.QueryResult<PostQuery, PostQueryVariables>;
export const PostsDocument = gql`
    query Posts($filter: FilterPostInput, $sort: SortPostInput, $page: PageInput) {
  posts(filter: $filter, sort: $sort, page: $page) {
    nodes {
      ...PostComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
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
 *      page: // value for 'page'
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
export function usePostsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<PostsQuery, PostsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<PostsQuery, PostsQueryVariables>(PostsDocument, options);
        }
export type PostsQueryHookResult = ReturnType<typeof usePostsQuery>;
export type PostsLazyQueryHookResult = ReturnType<typeof usePostsLazyQuery>;
export type PostsSuspenseQueryHookResult = ReturnType<typeof usePostsSuspenseQuery>;
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
export function useProfileQuery(baseOptions: Apollo.QueryHookOptions<ProfileQuery, ProfileQueryVariables> & ({ variables: ProfileQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
      }
export function useProfileLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
        }
export function useProfileSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProfileQuery, ProfileQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProfileQuery, ProfileQueryVariables>(ProfileDocument, options);
        }
export type ProfileQueryHookResult = ReturnType<typeof useProfileQuery>;
export type ProfileLazyQueryHookResult = ReturnType<typeof useProfileLazyQuery>;
export type ProfileSuspenseQueryHookResult = ReturnType<typeof useProfileSuspenseQuery>;
export type ProfileQueryResult = Apollo.QueryResult<ProfileQuery, ProfileQueryVariables>;
export const ProfileByHandleDocument = gql`
    query ProfileByHandle($handle: String!) {
  profileByHandle(handle: $handle) {
    ...ProfileComponentFields
  }
}
    ${ProfileComponentFieldsFragmentDoc}`;

/**
 * __useProfileByHandleQuery__
 *
 * To run a query within a React component, call `useProfileByHandleQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileByHandleQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileByHandleQuery({
 *   variables: {
 *      handle: // value for 'handle'
 *   },
 * });
 */
export function useProfileByHandleQuery(baseOptions: Apollo.QueryHookOptions<ProfileByHandleQuery, ProfileByHandleQueryVariables> & ({ variables: ProfileByHandleQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileByHandleQuery, ProfileByHandleQueryVariables>(ProfileByHandleDocument, options);
      }
export function useProfileByHandleLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileByHandleQuery, ProfileByHandleQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileByHandleQuery, ProfileByHandleQueryVariables>(ProfileByHandleDocument, options);
        }
export function useProfileByHandleSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProfileByHandleQuery, ProfileByHandleQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProfileByHandleQuery, ProfileByHandleQueryVariables>(ProfileByHandleDocument, options);
        }
export type ProfileByHandleQueryHookResult = ReturnType<typeof useProfileByHandleQuery>;
export type ProfileByHandleLazyQueryHookResult = ReturnType<typeof useProfileByHandleLazyQuery>;
export type ProfileByHandleSuspenseQueryHookResult = ReturnType<typeof useProfileByHandleSuspenseQuery>;
export type ProfileByHandleQueryResult = Apollo.QueryResult<ProfileByHandleQuery, ProfileByHandleQueryVariables>;
export const ProfileDisplayNameDocument = gql`
    query ProfileDisplayName($id: String!) {
  profile(id: $id) {
    displayName
    verified
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
export function useProfileDisplayNameQuery(baseOptions: Apollo.QueryHookOptions<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables> & ({ variables: ProfileDisplayNameQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>(ProfileDisplayNameDocument, options);
      }
export function useProfileDisplayNameLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>(ProfileDisplayNameDocument, options);
        }
export function useProfileDisplayNameSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>(ProfileDisplayNameDocument, options);
        }
export type ProfileDisplayNameQueryHookResult = ReturnType<typeof useProfileDisplayNameQuery>;
export type ProfileDisplayNameLazyQueryHookResult = ReturnType<typeof useProfileDisplayNameLazyQuery>;
export type ProfileDisplayNameSuspenseQueryHookResult = ReturnType<typeof useProfileDisplayNameSuspenseQuery>;
export type ProfileDisplayNameQueryResult = Apollo.QueryResult<ProfileDisplayNameQuery, ProfileDisplayNameQueryVariables>;
export const ProfileVerificationRequestDocument = gql`
    query ProfileVerificationRequest($id: String, $profileId: String) {
  profileVerificationRequest(id: $id, profileId: $profileId) {
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
 *      id: // value for 'id'
 *      profileId: // value for 'profileId'
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
export function useProfileVerificationRequestSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>(ProfileVerificationRequestDocument, options);
        }
export type ProfileVerificationRequestQueryHookResult = ReturnType<typeof useProfileVerificationRequestQuery>;
export type ProfileVerificationRequestLazyQueryHookResult = ReturnType<typeof useProfileVerificationRequestLazyQuery>;
export type ProfileVerificationRequestSuspenseQueryHookResult = ReturnType<typeof useProfileVerificationRequestSuspenseQuery>;
export type ProfileVerificationRequestQueryResult = Apollo.QueryResult<ProfileVerificationRequestQuery, ProfileVerificationRequestQueryVariables>;
export const ProfileVerificationRequestsDocument = gql`
    query ProfileVerificationRequests($status: ProfileVerificationStatusType, $page: PageInput) {
  profileVerificationRequests(status: $status, page: $page) {
    nodes {
      ...ProfileVerificationRequestComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
    ${ProfileVerificationRequestComponentFieldsFragmentDoc}`;

/**
 * __useProfileVerificationRequestsQuery__
 *
 * To run a query within a React component, call `useProfileVerificationRequestsQuery` and pass it any options that fit your needs.
 * When your component renders, `useProfileVerificationRequestsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProfileVerificationRequestsQuery({
 *   variables: {
 *      status: // value for 'status'
 *      page: // value for 'page'
 *   },
 * });
 */
export function useProfileVerificationRequestsQuery(baseOptions?: Apollo.QueryHookOptions<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>(ProfileVerificationRequestsDocument, options);
      }
export function useProfileVerificationRequestsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>(ProfileVerificationRequestsDocument, options);
        }
export function useProfileVerificationRequestsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>(ProfileVerificationRequestsDocument, options);
        }
export type ProfileVerificationRequestsQueryHookResult = ReturnType<typeof useProfileVerificationRequestsQuery>;
export type ProfileVerificationRequestsLazyQueryHookResult = ReturnType<typeof useProfileVerificationRequestsLazyQuery>;
export type ProfileVerificationRequestsSuspenseQueryHookResult = ReturnType<typeof useProfileVerificationRequestsSuspenseQuery>;
export type ProfileVerificationRequestsQueryResult = Apollo.QueryResult<ProfileVerificationRequestsQuery, ProfileVerificationRequestsQueryVariables>;
export const ProofBookByWalletDocument = gql`
    query ProofBookByWallet($walletAddress: String!) {
  getProofBookByWallet(walletAddress: $walletAddress) {
    root
    address
    value
    merkleProof
  }
}
    `;

/**
 * __useProofBookByWalletQuery__
 *
 * To run a query within a React component, call `useProofBookByWalletQuery` and pass it any options that fit your needs.
 * When your component renders, `useProofBookByWalletQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useProofBookByWalletQuery({
 *   variables: {
 *      walletAddress: // value for 'walletAddress'
 *   },
 * });
 */
export function useProofBookByWalletQuery(baseOptions: Apollo.QueryHookOptions<ProofBookByWalletQuery, ProofBookByWalletQueryVariables> & ({ variables: ProofBookByWalletQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ProofBookByWalletQuery, ProofBookByWalletQueryVariables>(ProofBookByWalletDocument, options);
      }
export function useProofBookByWalletLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ProofBookByWalletQuery, ProofBookByWalletQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ProofBookByWalletQuery, ProofBookByWalletQueryVariables>(ProofBookByWalletDocument, options);
        }
export function useProofBookByWalletSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ProofBookByWalletQuery, ProofBookByWalletQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ProofBookByWalletQuery, ProofBookByWalletQueryVariables>(ProofBookByWalletDocument, options);
        }
export type ProofBookByWalletQueryHookResult = ReturnType<typeof useProofBookByWalletQuery>;
export type ProofBookByWalletLazyQueryHookResult = ReturnType<typeof useProofBookByWalletLazyQuery>;
export type ProofBookByWalletSuspenseQueryHookResult = ReturnType<typeof useProofBookByWalletSuspenseQuery>;
export type ProofBookByWalletQueryResult = Apollo.QueryResult<ProofBookByWalletQuery, ProofBookByWalletQueryVariables>;
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
        userHandle
        displayName
        profilePicture
        verified
        badges
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
export function useReactionsQuery(baseOptions: Apollo.QueryHookOptions<ReactionsQuery, ReactionsQueryVariables> & ({ variables: ReactionsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<ReactionsQuery, ReactionsQueryVariables>(ReactionsDocument, options);
      }
export function useReactionsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<ReactionsQuery, ReactionsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<ReactionsQuery, ReactionsQueryVariables>(ReactionsDocument, options);
        }
export function useReactionsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<ReactionsQuery, ReactionsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<ReactionsQuery, ReactionsQueryVariables>(ReactionsDocument, options);
        }
export type ReactionsQueryHookResult = ReturnType<typeof useReactionsQuery>;
export type ReactionsLazyQueryHookResult = ReturnType<typeof useReactionsLazyQuery>;
export type ReactionsSuspenseQueryHookResult = ReturnType<typeof useReactionsSuspenseQuery>;
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
export const RemoveProfileVerificationRequestDocument = gql`
    mutation RemoveProfileVerificationRequest($id: String!) {
  removeProfileVerificationRequest(id: $id) {
    profileVerificationRequest {
      id
    }
  }
}
    `;
export type RemoveProfileVerificationRequestMutationFn = Apollo.MutationFunction<RemoveProfileVerificationRequestMutation, RemoveProfileVerificationRequestMutationVariables>;

/**
 * __useRemoveProfileVerificationRequestMutation__
 *
 * To run a mutation, you first call `useRemoveProfileVerificationRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRemoveProfileVerificationRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [removeProfileVerificationRequestMutation, { data, loading, error }] = useRemoveProfileVerificationRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useRemoveProfileVerificationRequestMutation(baseOptions?: Apollo.MutationHookOptions<RemoveProfileVerificationRequestMutation, RemoveProfileVerificationRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<RemoveProfileVerificationRequestMutation, RemoveProfileVerificationRequestMutationVariables>(RemoveProfileVerificationRequestDocument, options);
      }
export type RemoveProfileVerificationRequestMutationHookResult = ReturnType<typeof useRemoveProfileVerificationRequestMutation>;
export type RemoveProfileVerificationRequestMutationResult = Apollo.MutationResult<RemoveProfileVerificationRequestMutation>;
export type RemoveProfileVerificationRequestMutationOptions = Apollo.BaseMutationOptions<RemoveProfileVerificationRequestMutation, RemoveProfileVerificationRequestMutationVariables>;
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
export const ToggleFavoriteDocument = gql`
    mutation ToggleFavorite($trackId: String!) {
  toggleFavorite(trackId: $trackId) {
    favoriteProfileTrack {
      id
      trackId
      profileId
    }
  }
}
    `;
export type ToggleFavoriteMutationFn = Apollo.MutationFunction<ToggleFavoriteMutation, ToggleFavoriteMutationVariables>;

/**
 * __useToggleFavoriteMutation__
 *
 * To run a mutation, you first call `useToggleFavoriteMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useToggleFavoriteMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [toggleFavoriteMutation, { data, loading, error }] = useToggleFavoriteMutation({
 *   variables: {
 *      trackId: // value for 'trackId'
 *   },
 * });
 */
export function useToggleFavoriteMutation(baseOptions?: Apollo.MutationHookOptions<ToggleFavoriteMutation, ToggleFavoriteMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ToggleFavoriteMutation, ToggleFavoriteMutationVariables>(ToggleFavoriteDocument, options);
      }
export type ToggleFavoriteMutationHookResult = ReturnType<typeof useToggleFavoriteMutation>;
export type ToggleFavoriteMutationResult = Apollo.MutationResult<ToggleFavoriteMutation>;
export type ToggleFavoriteMutationOptions = Apollo.BaseMutationOptions<ToggleFavoriteMutation, ToggleFavoriteMutationVariables>;
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
export function useTrackQuery(baseOptions: Apollo.QueryHookOptions<TrackQuery, TrackQueryVariables> & ({ variables: TrackQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrackQuery, TrackQueryVariables>(TrackDocument, options);
      }
export function useTrackLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrackQuery, TrackQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrackQuery, TrackQueryVariables>(TrackDocument, options);
        }
export function useTrackSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrackQuery, TrackQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrackQuery, TrackQueryVariables>(TrackDocument, options);
        }
export type TrackQueryHookResult = ReturnType<typeof useTrackQuery>;
export type TrackLazyQueryHookResult = ReturnType<typeof useTrackLazyQuery>;
export type TrackSuspenseQueryHookResult = ReturnType<typeof useTrackSuspenseQuery>;
export type TrackQueryResult = Apollo.QueryResult<TrackQuery, TrackQueryVariables>;
export const TrackEditionDocument = gql`
    query TrackEdition($id: String!) {
  trackEdition(id: $id) {
    ...TrackEditionFields
  }
}
    ${TrackEditionFieldsFragmentDoc}`;

/**
 * __useTrackEditionQuery__
 *
 * To run a query within a React component, call `useTrackEditionQuery` and pass it any options that fit your needs.
 * When your component renders, `useTrackEditionQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTrackEditionQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useTrackEditionQuery(baseOptions: Apollo.QueryHookOptions<TrackEditionQuery, TrackEditionQueryVariables> & ({ variables: TrackEditionQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TrackEditionQuery, TrackEditionQueryVariables>(TrackEditionDocument, options);
      }
export function useTrackEditionLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TrackEditionQuery, TrackEditionQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TrackEditionQuery, TrackEditionQueryVariables>(TrackEditionDocument, options);
        }
export function useTrackEditionSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TrackEditionQuery, TrackEditionQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TrackEditionQuery, TrackEditionQueryVariables>(TrackEditionDocument, options);
        }
export type TrackEditionQueryHookResult = ReturnType<typeof useTrackEditionQuery>;
export type TrackEditionLazyQueryHookResult = ReturnType<typeof useTrackEditionLazyQuery>;
export type TrackEditionSuspenseQueryHookResult = ReturnType<typeof useTrackEditionSuspenseQuery>;
export type TrackEditionQueryResult = Apollo.QueryResult<TrackEditionQuery, TrackEditionQueryVariables>;
export const TracksDocument = gql`
    query Tracks($filter: FilterTrackInput, $sort: SortTrackInput, $page: PageInput) {
  tracks(filter: $filter, sort: $sort, page: $page) {
    nodes {
      ...TrackComponentFields
    }
    pageInfo {
      hasNextPage
      endCursor
      totalCount
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
export function useTracksSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TracksQuery, TracksQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TracksQuery, TracksQueryVariables>(TracksDocument, options);
        }
export type TracksQueryHookResult = ReturnType<typeof useTracksQuery>;
export type TracksLazyQueryHookResult = ReturnType<typeof useTracksLazyQuery>;
export type TracksSuspenseQueryHookResult = ReturnType<typeof useTracksSuspenseQuery>;
export type TracksQueryResult = Apollo.QueryResult<TracksQuery, TracksQueryVariables>;
export const TracksByGenreDocument = gql`
    query TracksByGenre($limit: Float) {
  tracksByGenre(limit: $limit) {
    genre
    tracks {
      ...TrackComponentFields
    }
  }
}
    ${TrackComponentFieldsFragmentDoc}`;

/**
 * __useTracksByGenreQuery__
 *
 * To run a query within a React component, call `useTracksByGenreQuery` and pass it any options that fit your needs.
 * When your component renders, `useTracksByGenreQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useTracksByGenreQuery({
 *   variables: {
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useTracksByGenreQuery(baseOptions?: Apollo.QueryHookOptions<TracksByGenreQuery, TracksByGenreQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<TracksByGenreQuery, TracksByGenreQueryVariables>(TracksByGenreDocument, options);
      }
export function useTracksByGenreLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<TracksByGenreQuery, TracksByGenreQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<TracksByGenreQuery, TracksByGenreQueryVariables>(TracksByGenreDocument, options);
        }
export function useTracksByGenreSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<TracksByGenreQuery, TracksByGenreQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<TracksByGenreQuery, TracksByGenreQueryVariables>(TracksByGenreDocument, options);
        }
export type TracksByGenreQueryHookResult = ReturnType<typeof useTracksByGenreQuery>;
export type TracksByGenreLazyQueryHookResult = ReturnType<typeof useTracksByGenreLazyQuery>;
export type TracksByGenreSuspenseQueryHookResult = ReturnType<typeof useTracksByGenreSuspenseQuery>;
export type TracksByGenreQueryResult = Apollo.QueryResult<TracksByGenreQuery, TracksByGenreQueryVariables>;
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
export function useUnreadMessageCountSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UnreadMessageCountQuery, UnreadMessageCountQueryVariables>(UnreadMessageCountDocument, options);
        }
export type UnreadMessageCountQueryHookResult = ReturnType<typeof useUnreadMessageCountQuery>;
export type UnreadMessageCountLazyQueryHookResult = ReturnType<typeof useUnreadMessageCountLazyQuery>;
export type UnreadMessageCountSuspenseQueryHookResult = ReturnType<typeof useUnreadMessageCountSuspenseQuery>;
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
export const UpdateAllOwnedTracksDocument = gql`
    mutation updateAllOwnedTracks($input: UpdateEditionOwnedTracksInput!) {
  updateEditionOwnedTracks(input: $input) {
    tracks {
      id
      nftData {
        pendingRequest
      }
      trackEdition {
        ...TrackEditionFields
      }
    }
  }
}
    ${TrackEditionFieldsFragmentDoc}`;
export type UpdateAllOwnedTracksMutationFn = Apollo.MutationFunction<UpdateAllOwnedTracksMutation, UpdateAllOwnedTracksMutationVariables>;

/**
 * __useUpdateAllOwnedTracksMutation__
 *
 * To run a mutation, you first call `useUpdateAllOwnedTracksMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateAllOwnedTracksMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateAllOwnedTracksMutation, { data, loading, error }] = useUpdateAllOwnedTracksMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateAllOwnedTracksMutation(baseOptions?: Apollo.MutationHookOptions<UpdateAllOwnedTracksMutation, UpdateAllOwnedTracksMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateAllOwnedTracksMutation, UpdateAllOwnedTracksMutationVariables>(UpdateAllOwnedTracksDocument, options);
      }
export type UpdateAllOwnedTracksMutationHookResult = ReturnType<typeof useUpdateAllOwnedTracksMutation>;
export type UpdateAllOwnedTracksMutationResult = Apollo.MutationResult<UpdateAllOwnedTracksMutation>;
export type UpdateAllOwnedTracksMutationOptions = Apollo.BaseMutationOptions<UpdateAllOwnedTracksMutation, UpdateAllOwnedTracksMutationVariables>;
export const UpdateCommentDocument = gql`
    mutation UpdateComment($input: UpdateCommentInput!) {
  updateComment(input: $input) {
    comment {
      ...CommentComponentFields
    }
  }
}
    ${CommentComponentFieldsFragmentDoc}`;
export type UpdateCommentMutationFn = Apollo.MutationFunction<UpdateCommentMutation, UpdateCommentMutationVariables>;

/**
 * __useUpdateCommentMutation__
 *
 * To run a mutation, you first call `useUpdateCommentMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateCommentMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateCommentMutation, { data, loading, error }] = useUpdateCommentMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateCommentMutation(baseOptions?: Apollo.MutationHookOptions<UpdateCommentMutation, UpdateCommentMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateCommentMutation, UpdateCommentMutationVariables>(UpdateCommentDocument, options);
      }
export type UpdateCommentMutationHookResult = ReturnType<typeof useUpdateCommentMutation>;
export type UpdateCommentMutationResult = Apollo.MutationResult<UpdateCommentMutation>;
export type UpdateCommentMutationOptions = Apollo.BaseMutationOptions<UpdateCommentMutation, UpdateCommentMutationVariables>;
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
export const UpdateOtpDocument = gql`
    mutation UpdateOTP($input: UpdateOTPInput!) {
  updateOTP(input: $input) {
    user {
      id
    }
  }
}
    `;
export type UpdateOtpMutationFn = Apollo.MutationFunction<UpdateOtpMutation, UpdateOtpMutationVariables>;

/**
 * __useUpdateOtpMutation__
 *
 * To run a mutation, you first call `useUpdateOtpMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOtpMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOtpMutation, { data, loading, error }] = useUpdateOtpMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOtpMutation(baseOptions?: Apollo.MutationHookOptions<UpdateOtpMutation, UpdateOtpMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateOtpMutation, UpdateOtpMutationVariables>(UpdateOtpDocument, options);
      }
export type UpdateOtpMutationHookResult = ReturnType<typeof useUpdateOtpMutation>;
export type UpdateOtpMutationResult = Apollo.MutationResult<UpdateOtpMutation>;
export type UpdateOtpMutationOptions = Apollo.BaseMutationOptions<UpdateOtpMutation, UpdateOtpMutationVariables>;
export const UpdateOgunClaimedAudioHolderDocument = gql`
    mutation UpdateOgunClaimedAudioHolder($input: UpdateOgunClaimedInput!) {
  updateOgunClaimedAudioHolder(input: $input) {
    audioHolder {
      id
    }
  }
}
    `;
export type UpdateOgunClaimedAudioHolderMutationFn = Apollo.MutationFunction<UpdateOgunClaimedAudioHolderMutation, UpdateOgunClaimedAudioHolderMutationVariables>;

/**
 * __useUpdateOgunClaimedAudioHolderMutation__
 *
 * To run a mutation, you first call `useUpdateOgunClaimedAudioHolderMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOgunClaimedAudioHolderMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOgunClaimedAudioHolderMutation, { data, loading, error }] = useUpdateOgunClaimedAudioHolderMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOgunClaimedAudioHolderMutation(baseOptions?: Apollo.MutationHookOptions<UpdateOgunClaimedAudioHolderMutation, UpdateOgunClaimedAudioHolderMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateOgunClaimedAudioHolderMutation, UpdateOgunClaimedAudioHolderMutationVariables>(UpdateOgunClaimedAudioHolderDocument, options);
      }
export type UpdateOgunClaimedAudioHolderMutationHookResult = ReturnType<typeof useUpdateOgunClaimedAudioHolderMutation>;
export type UpdateOgunClaimedAudioHolderMutationResult = Apollo.MutationResult<UpdateOgunClaimedAudioHolderMutation>;
export type UpdateOgunClaimedAudioHolderMutationOptions = Apollo.BaseMutationOptions<UpdateOgunClaimedAudioHolderMutation, UpdateOgunClaimedAudioHolderMutationVariables>;
export const UpdateOgunClaimedWhitelistDocument = gql`
    mutation UpdateOgunClaimedWhitelist($input: UpdateOgunClaimedInput!) {
  updateOgunClaimedWhitelist(input: $input) {
    whitelistEntry {
      id
    }
  }
}
    `;
export type UpdateOgunClaimedWhitelistMutationFn = Apollo.MutationFunction<UpdateOgunClaimedWhitelistMutation, UpdateOgunClaimedWhitelistMutationVariables>;

/**
 * __useUpdateOgunClaimedWhitelistMutation__
 *
 * To run a mutation, you first call `useUpdateOgunClaimedWhitelistMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateOgunClaimedWhitelistMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateOgunClaimedWhitelistMutation, { data, loading, error }] = useUpdateOgunClaimedWhitelistMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateOgunClaimedWhitelistMutation(baseOptions?: Apollo.MutationHookOptions<UpdateOgunClaimedWhitelistMutation, UpdateOgunClaimedWhitelistMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateOgunClaimedWhitelistMutation, UpdateOgunClaimedWhitelistMutationVariables>(UpdateOgunClaimedWhitelistDocument, options);
      }
export type UpdateOgunClaimedWhitelistMutationHookResult = ReturnType<typeof useUpdateOgunClaimedWhitelistMutation>;
export type UpdateOgunClaimedWhitelistMutationResult = Apollo.MutationResult<UpdateOgunClaimedWhitelistMutation>;
export type UpdateOgunClaimedWhitelistMutationOptions = Apollo.BaseMutationOptions<UpdateOgunClaimedWhitelistMutation, UpdateOgunClaimedWhitelistMutationVariables>;
export const UpdatePostDocument = gql`
    mutation UpdatePost($input: UpdatePostInput!) {
  updatePost(input: $input) {
    post {
      id
      body
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
        linktree
        discord
        telegram
        spotify
        bandcamp
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
export const UpdateProfileVerificationRequestDocument = gql`
    mutation UpdateProfileVerificationRequest($id: String!, $input: CreateProfileVerificationRequestInput!) {
  updateProfileVerificationRequest(id: $id, input: $input) {
    profileVerificationRequest {
      ...ProfileVerificationRequestComponentFields
    }
  }
}
    ${ProfileVerificationRequestComponentFieldsFragmentDoc}`;
export type UpdateProfileVerificationRequestMutationFn = Apollo.MutationFunction<UpdateProfileVerificationRequestMutation, UpdateProfileVerificationRequestMutationVariables>;

/**
 * __useUpdateProfileVerificationRequestMutation__
 *
 * To run a mutation, you first call `useUpdateProfileVerificationRequestMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateProfileVerificationRequestMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateProfileVerificationRequestMutation, { data, loading, error }] = useUpdateProfileVerificationRequestMutation({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateProfileVerificationRequestMutation(baseOptions?: Apollo.MutationHookOptions<UpdateProfileVerificationRequestMutation, UpdateProfileVerificationRequestMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateProfileVerificationRequestMutation, UpdateProfileVerificationRequestMutationVariables>(UpdateProfileVerificationRequestDocument, options);
      }
export type UpdateProfileVerificationRequestMutationHookResult = ReturnType<typeof useUpdateProfileVerificationRequestMutation>;
export type UpdateProfileVerificationRequestMutationResult = Apollo.MutationResult<UpdateProfileVerificationRequestMutation>;
export type UpdateProfileVerificationRequestMutationOptions = Apollo.BaseMutationOptions<UpdateProfileVerificationRequestMutation, UpdateProfileVerificationRequestMutationVariables>;
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
export const UpdateMetaMaskAddressesDocument = gql`
    mutation UpdateMetaMaskAddresses($input: UpdateWalletInput!) {
  updateMetaMaskAddresses(input: $input) {
    user {
      id
      metaMaskWalletAddressees
    }
  }
}
    `;
export type UpdateMetaMaskAddressesMutationFn = Apollo.MutationFunction<UpdateMetaMaskAddressesMutation, UpdateMetaMaskAddressesMutationVariables>;

/**
 * __useUpdateMetaMaskAddressesMutation__
 *
 * To run a mutation, you first call `useUpdateMetaMaskAddressesMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMetaMaskAddressesMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMetaMaskAddressesMutation, { data, loading, error }] = useUpdateMetaMaskAddressesMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMetaMaskAddressesMutation(baseOptions?: Apollo.MutationHookOptions<UpdateMetaMaskAddressesMutation, UpdateMetaMaskAddressesMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateMetaMaskAddressesMutation, UpdateMetaMaskAddressesMutationVariables>(UpdateMetaMaskAddressesDocument, options);
      }
export type UpdateMetaMaskAddressesMutationHookResult = ReturnType<typeof useUpdateMetaMaskAddressesMutation>;
export type UpdateMetaMaskAddressesMutationResult = Apollo.MutationResult<UpdateMetaMaskAddressesMutation>;
export type UpdateMetaMaskAddressesMutationOptions = Apollo.BaseMutationOptions<UpdateMetaMaskAddressesMutation, UpdateMetaMaskAddressesMutationVariables>;
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
export function useUploadUrlQuery(baseOptions: Apollo.QueryHookOptions<UploadUrlQuery, UploadUrlQueryVariables> & ({ variables: UploadUrlQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UploadUrlQuery, UploadUrlQueryVariables>(UploadUrlDocument, options);
      }
export function useUploadUrlLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UploadUrlQuery, UploadUrlQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UploadUrlQuery, UploadUrlQueryVariables>(UploadUrlDocument, options);
        }
export function useUploadUrlSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UploadUrlQuery, UploadUrlQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UploadUrlQuery, UploadUrlQueryVariables>(UploadUrlDocument, options);
        }
export type UploadUrlQueryHookResult = ReturnType<typeof useUploadUrlQuery>;
export type UploadUrlLazyQueryHookResult = ReturnType<typeof useUploadUrlLazyQuery>;
export type UploadUrlSuspenseQueryHookResult = ReturnType<typeof useUploadUrlSuspenseQuery>;
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
      verified
      teamMember
      badges
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
export function useUserByWalletQuery(baseOptions: Apollo.QueryHookOptions<UserByWalletQuery, UserByWalletQueryVariables> & ({ variables: UserByWalletQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<UserByWalletQuery, UserByWalletQueryVariables>(UserByWalletDocument, options);
      }
export function useUserByWalletLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<UserByWalletQuery, UserByWalletQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<UserByWalletQuery, UserByWalletQueryVariables>(UserByWalletDocument, options);
        }
export function useUserByWalletSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<UserByWalletQuery, UserByWalletQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<UserByWalletQuery, UserByWalletQueryVariables>(UserByWalletDocument, options);
        }
export type UserByWalletQueryHookResult = ReturnType<typeof useUserByWalletQuery>;
export type UserByWalletLazyQueryHookResult = ReturnType<typeof useUserByWalletLazyQuery>;
export type UserByWalletSuspenseQueryHookResult = ReturnType<typeof useUserByWalletSuspenseQuery>;
export type UserByWalletQueryResult = Apollo.QueryResult<UserByWalletQuery, UserByWalletQueryVariables>;
export const ValidateOtpRecoveryPhraseDocument = gql`
    mutation ValidateOTPRecoveryPhrase($input: ValidateOTPRecoveryPhraseInput!) {
  validateOTPRecoveryPhrase(input: $input)
}
    `;
export type ValidateOtpRecoveryPhraseMutationFn = Apollo.MutationFunction<ValidateOtpRecoveryPhraseMutation, ValidateOtpRecoveryPhraseMutationVariables>;

/**
 * __useValidateOtpRecoveryPhraseMutation__
 *
 * To run a mutation, you first call `useValidateOtpRecoveryPhraseMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useValidateOtpRecoveryPhraseMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [validateOtpRecoveryPhraseMutation, { data, loading, error }] = useValidateOtpRecoveryPhraseMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useValidateOtpRecoveryPhraseMutation(baseOptions?: Apollo.MutationHookOptions<ValidateOtpRecoveryPhraseMutation, ValidateOtpRecoveryPhraseMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<ValidateOtpRecoveryPhraseMutation, ValidateOtpRecoveryPhraseMutationVariables>(ValidateOtpRecoveryPhraseDocument, options);
      }
export type ValidateOtpRecoveryPhraseMutationHookResult = ReturnType<typeof useValidateOtpRecoveryPhraseMutation>;
export type ValidateOtpRecoveryPhraseMutationResult = Apollo.MutationResult<ValidateOtpRecoveryPhraseMutation>;
export type ValidateOtpRecoveryPhraseMutationOptions = Apollo.BaseMutationOptions<ValidateOtpRecoveryPhraseMutation, ValidateOtpRecoveryPhraseMutationVariables>;
export const WhitelistEntryByWalletDocument = gql`
    query WhitelistEntryByWallet($walletAdress: String!) {
  whitelistEntryByWallet(walletAdress: $walletAdress) {
    id
    ogunClaimed
  }
}
    `;

/**
 * __useWhitelistEntryByWalletQuery__
 *
 * To run a query within a React component, call `useWhitelistEntryByWalletQuery` and pass it any options that fit your needs.
 * When your component renders, `useWhitelistEntryByWalletQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useWhitelistEntryByWalletQuery({
 *   variables: {
 *      walletAdress: // value for 'walletAdress'
 *   },
 * });
 */
export function useWhitelistEntryByWalletQuery(baseOptions: Apollo.QueryHookOptions<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables> & ({ variables: WhitelistEntryByWalletQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables>(WhitelistEntryByWalletDocument, options);
      }
export function useWhitelistEntryByWalletLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables>(WhitelistEntryByWalletDocument, options);
        }
export function useWhitelistEntryByWalletSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables>(WhitelistEntryByWalletDocument, options);
        }
export type WhitelistEntryByWalletQueryHookResult = ReturnType<typeof useWhitelistEntryByWalletQuery>;
export type WhitelistEntryByWalletLazyQueryHookResult = ReturnType<typeof useWhitelistEntryByWalletLazyQuery>;
export type WhitelistEntryByWalletSuspenseQueryHookResult = ReturnType<typeof useWhitelistEntryByWalletSuspenseQuery>;
export type WhitelistEntryByWalletQueryResult = Apollo.QueryResult<WhitelistEntryByWalletQuery, WhitelistEntryByWalletQueryVariables>;
import mongoose from 'mongoose';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from 'type-graphql';
import { CurrentUser } from '../decorators/current-user';
import { FavoriteProfileTrackModel } from '../models/FavoriteProfileTrack';
import { ListingItem } from '../models/ListingItem';
import { SCid } from '../models/SCid';
import { Track } from '../models/Track';
import { TrackEdition } from '../models/TrackEdition';
import { User } from '../models/User';
import { FavoriteCount } from '../services/TrackService';
import { Context } from '../types/Context';
import { CreateMultipleTracksInput } from '../types/CreateMultipleTracksInput';
import { CreateMultipleTracksPayload } from '../types/CreateMultipleTracksPayload';
import { CreateTrackWithSCidInput } from '../types/CreateTrackInput';
import { CreateTrackWithSCidPayload } from '../types/CreateTrackWithSCidPayload';
import { MAX_EDITION_SIZE } from '../types/CreateTrackEditionInput';
import { DeleteTrackInput } from '../types/DeleteTrackInput';
import { DeleteTrackPayload } from '../types/DeleteTrackPayload';
import { FilterBuyNowItemInput } from '../types/FilterBuyNowItemInput';
import { FilterOwnedBuyNowItemInput } from '../types/FilterOwnedBuyNowItemInput';
import { FilterOwnedTracksInput } from '../types/FilterOwnedTracksInput';
import { FilterTrackInput } from '../types/FilterTrackInput';
import { FilterTrackMarketplace } from '../types/FilterTrackMarketplace';
import { ListingItemConnection } from '../types/ListingItemConnection';
import { PageInput } from '../types/PageInput';
import { Role } from '../types/Role';
import { SortListingItemInput } from '../types/SortListingItemInput';
import { SortTrackInput } from '../types/SortTrackInput';
import { ToggleFavoritePayload } from '../types/ToggleFavoritePayload';
import { TrackConnection } from '../types/TrackConnection';
import { UpdateEditionOwnedTracksInput } from '../types/UpdateEditionOwnedTracksInput';
import { UpdateEditionOwnedTracksPayload } from '../types/UpdateEditionOwnedTracksPayload';
import { UpdateTrackInput } from '../types/UpdateTrackInput';
import { UpdateTrackPayload } from '../types/UpdateTrackPayload';
import { TrackPrice } from '../types/TrackPrice';
import { CurrencyType } from '../types/CurrencyType';
import { GenreTracks } from '../types/GenreTracks';

// Default fallback artwork URL
const DEFAULT_ARTWORK_URL = 'https://soundchain.io/default-artwork.png';
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';

// Fast IPFS gateway for audio streaming
// dweb.link is Protocol Labs' official gateway - much faster than Pinata public
// Alternative: w3s.link (Web3.Storage), cf-ipfs.com (Cloudflare)
const FAST_AUDIO_GATEWAY = 'https://dweb.link/ipfs/';

@Resolver(Track)
export class TrackResolver {
  /**
   * Get the SCid (SoundChain ID) for this track
   */
  @FieldResolver(() => SCid, { nullable: true })
  async scid(@Ctx() { scidService }: Context, @Root() { _id }: Track): Promise<SCid | null> {
    return scidService.getByTrackId(_id.toString());
  }

  /**
   * Artwork URL with IPFS fallback support
   * Priority: 1) Direct artworkUrl (rewritten to fast gateway), 2) NFT metadata IPFS, 3) Default fallback
   */
  @FieldResolver(() => String, { nullable: true })
  artworkWithFallback(@Root() { artworkUrl, nftData }: Track): string {
    // Priority 1: Direct artwork URL if it exists
    if (artworkUrl) {
      // Rewrite slow IPFS gateways to Pinata for faster loading
      // Handles: ipfs.io, dweb.link, cloudflare-ipfs.com, ipfs.infura.io
      const ipfsMatch = artworkUrl.match(/(?:ipfs\.io|dweb\.link|cloudflare-ipfs\.com|ipfs\.infura\.io)\/ipfs\/([a-zA-Z0-9]+)/);
      if (ipfsMatch) {
        return `${IPFS_GATEWAY}${ipfsMatch[1]}`;
      }
      // Handle ipfs:// protocol URLs
      if (artworkUrl.startsWith('ipfs://')) {
        const cid = artworkUrl.replace('ipfs://', '');
        return `${IPFS_GATEWAY}${cid}`;
      }
      return artworkUrl;
    }

    // Priority 2: Try to construct IPFS URL from NFT metadata CID
    // Note: This gives the metadata JSON, not the artwork directly
    // But frontends can parse it to get the image field
    if (nftData?.ipfsCid) {
      return `${IPFS_GATEWAY}${nftData.ipfsCid}`;
    }

    // Priority 3: Default fallback
    return DEFAULT_ARTWORK_URL;
  }

  @FieldResolver(() => String)
  playbackUrl(@Root() { ipfsCid, ipfsGatewayUrl, muxAsset }: Track): string {
    // Priority 1: IPFS (decentralized, P2P)
    if (ipfsCid) {
      // Always use fast gateway for audio streaming regardless of stored URL
      // dweb.link is much faster than Pinata public gateway (30-40s vs 2-3s)
      return `${FAST_AUDIO_GATEWAY}${ipfsCid}`;
    }
    // Priority 2: Mux (legacy/fallback)
    return muxAsset ? `https://stream.mux.com/${muxAsset.playbackId}.m3u8` : '';
  }

  @FieldResolver(() => Number)
  playbackCount(@Ctx() { trackService }: Context, @Root() { _id: trackId, trackEditionId, playbackCount }: Track): Promise<number> {
    if (trackEditionId) {
      return trackService.playbackCount(trackId.toString(), trackEditionId);
    }
    return Promise.resolve(playbackCount);
  }

  @FieldResolver(() => String)
  async playbackCountFormatted(
    @Ctx() { trackService }: Context,
    @Root() { _id: trackId, trackEditionId, playbackCount }: Track,
  ): Promise<string> {
    const playbackCountToUse = trackEditionId ? await trackService.playbackCount(trackId.toString(), trackEditionId) : playbackCount;

    return playbackCountToUse ? new Intl.NumberFormat('en-US').format(playbackCountToUse) : '';
  }

  @FieldResolver(() => Number)
  async favoriteCount(@Ctx() { trackService }: Context, @Root() { _id: trackId, trackEditionId }: Track): Promise<number> {
    const result = await trackService.favoriteCount(trackId.toString(), trackEditionId);
    return result?.count ?? 0; // Safely extract count, default to 0 if undefined
  }

  @FieldResolver(() => Number)
  listingCount(@Ctx() { listingCountByTrackEdition }: Context, @Root() { trackEditionId }: Track): Promise<number> {
    if (!trackEditionId) return Promise.resolve(0);
    return listingCountByTrackEdition.load(trackEditionId);
  }

  @FieldResolver(() => TrackPrice)
  async price(@Ctx() { trackService, listingItemService }: Context, @Root() { trackEditionId, nftData }: Track): Promise<TrackPrice> {
    if (trackEditionId) {
      return listingItemService.getCheapestListingItem(trackEditionId);
    }
    if (!nftData || nftData.tokenId === undefined || !nftData.contract) {
      return { value: 0, currency: CurrencyType.MATIC }; // Return default price if nftData is missing
    }
    return trackService.priceToShow(nftData.tokenId, nftData.contract);
  }

  @FieldResolver(() => String)
  async saleType(@Ctx() { trackService }: Context, @Root() { nftData }: Track): Promise<string> {
    if (!nftData || nftData.tokenId === undefined || !nftData.contract) {
      return ''; // Return empty string if nftData is missing
    }
    return trackService.saleType(nftData.tokenId, nftData.contract);
  }

  @FieldResolver(() => Boolean)
  isFavorite(
    @Ctx() { trackService }: Context,
    @Root() { _id: trackId, trackEditionId }: Track,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }
    return trackService.isFavorite(trackId.toString(), user.profileId.toString(), trackEditionId);
  }

  @FieldResolver(() => Number)
  editionSize(
    @Ctx() { trackEditionService }: Context,
    @Root() { trackEditionId }: Track,
  ): Promise<number> {
    return trackEditionId
      ? trackEditionService.getEditionSize(trackEditionId)
      : Promise.resolve(0);
  }

  @FieldResolver(() => TrackEdition, { nullable: true })
  async trackEdition(
    @Ctx() { trackEditionService }: Context,
    @Root() { trackEditionId }: Track,
  ): Promise<TrackEdition | null> {
    if (!trackEditionId) return null;
    try {
      const edition = await trackEditionService.findOrFail(trackEditionId);
      // Convert to plain object to avoid mongoose internal symbol access issues
      // during GraphQL serialization
      if (edition && typeof (edition as any).toObject === 'function') {
        return (edition as any).toObject() as TrackEdition;
      }
      return edition;
    } catch (error) {
      console.warn(`TrackEdition ${trackEditionId} not found`);
      return null;
    }
  }

  @FieldResolver(() => ListingItem, { nullable: true })
  async listingItem(
    @Ctx() { listingItemService }: Context,
    @Root() { nftData }: Track,
  ): Promise<ListingItem | void> {
    // CRITICAL: Check if nftData exists first before accessing properties
    if (!nftData || typeof nftData.tokenId !== 'number' || !nftData.contract) {
      return null;
    }
    const item = await listingItemService.getListingItem(nftData.tokenId, nftData.contract);
    if (!item) return undefined;

    // Transform AuctionItem or BuyNowItem to ListingItem
    const isAuctionItem = 'reservePrice' in item; // Type guard for AuctionItem
    return {
      _id: item._id,
      id: item._id.toString(),
      owner: item.owner,
      nft: item.nft,
      tokenId: item.tokenId,
      contract: item.nft || nftData.contract,
      selectedCurrency: 'selectedCurrency' in item ? item.selectedCurrency : 'MATIC',
      pricePerItem: 'pricePerItem' in item ? item.pricePerItem : item.reservePrice,
      pricePerItemToShow: 'pricePerItemToShow' in item ? item.pricePerItemToShow : item.reservePriceToShow,
      OGUNPricePerItem: 'OGUNPricePerItem' in item ? item.OGUNPricePerItem : '0',
      OGUNPricePerItemToShow: 'OGUNPricePerItemToShow' in item ? item.OGUNPricePerItemToShow : 0,
      acceptsMATIC: 'acceptsMATIC' in item ? item.acceptsMATIC : true,
      acceptsOGUN: 'acceptsOGUN' in item ? item.acceptsOGUN : item.isPaymentOGUN,
      startingTime: item.startingTime,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  @Query(() => Track)
  track(@Ctx() { trackService }: Context, @Arg('id') id: string): Promise<Track> {
    return trackService.getTrack(id);
  }

  @Query(() => TrackConnection)
  tracks(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackInput,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getTracks(filter, sort, page);
  }

  @Query(() => TrackConnection)
  @Authorized()
  async ownedTracks(
    @Ctx() { trackService }: Context,
    @Arg('filter') filter?: FilterOwnedTracksInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getOwnedTracks({
        trackEditionId: filter.trackEditionId,
        owner: filter.owner,
      },
      undefined,
      page,
    );
  }

  @Query(() => TrackConnection)
  @Authorized()
  async listableOwnedTracks(
    @Ctx() { trackService }: Context,
    @Arg('filter') filter?: FilterOwnedTracksInput,
  ): Promise<TrackConnection> {
    return trackService.getListableOwnedTracks(filter);
  }

  @Query(() => TrackConnection)
  groupedTracks(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackInput,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    return trackService.getGroupedTracks(filter, sort, page);
  }

  @Query(() => [GenreTracks])
  tracksByGenre(
    @Ctx() { trackService }: Context,
    @Arg('limit', { nullable: true, defaultValue: 10 }) limit?: number,
  ): Promise<GenreTracks[]> {
    return trackService.getTracksByGenre(limit);
  }

  @Mutation(() => CreateMultipleTracksPayload)
  @Authorized()
  async createMultipleTracks(
    @Ctx() { trackService, postService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateMultipleTracksInput,
  ): Promise<CreateMultipleTracksPayload> {
    const [track, ...otherTracks] = await trackService.createMultipleTracks(profileId.toString(), {
      batchSize: input.batchSize,
      track: input.track,
    });
    if (input.createPost) {
      await postService.createPost({
        profileId: profileId.toString(),
        trackId: track._id.toString(),
        trackEditionId: track.trackEditionId,
      });
    }
    return {
      firstTrack: track,
      trackIds: [track._id.toString(), ...otherTracks.map(track => track._id.toString())],
    };
  }

  /**
   * Create a track with SCid only - no NFT/wallet required
   * This is the simplified upload flow for non-web3 music assets
   * Returns the track and auto-generated SCid
   */
  @Mutation(() => CreateTrackWithSCidPayload)
  @Authorized()
  async createTrackWithSCid(
    @Ctx() { trackService, postService, scidService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('input') input: CreateTrackWithSCidInput,
  ): Promise<CreateTrackWithSCidPayload> {
    // Extract S3 key from asset URL for IPFS pinning
    const assetUrl = input.assetUrl;
    const url = new URL(assetUrl);
    const s3Key = url.pathname.replace(/^\//, '');

    // Create track using IPFS-only flow (auto-registers SCid)
    const track = await trackService.createTrackIPFSOnly(profileId.toString(), {
      title: input.title,
      description: input.description,
      assetUrl: input.assetUrl,
      artworkUrl: input.artworkUrl,
      artist: input.artist,
      album: input.album,
      releaseYear: input.releaseYear,
      copyright: input.copyright,
      genres: input.genres,
    }, s3Key);

    // Optionally create a feed post for the new track
    if (input.createPost !== false) {
      await postService.createPost({
        profileId: profileId.toString(),
        trackId: track._id.toString(),
      });
    }

    // Get the auto-generated SCid
    const scid = await scidService.getByTrackId(track._id.toString());

    return {
      track,
      scid: scid || undefined,
      message: scid
        ? `Track uploaded successfully! Your SCid is: ${scid.scid}`
        : 'Track uploaded successfully! SCid will be generated shortly.',
    };
  }

  @Mutation(() => UpdateTrackPayload)
  @Authorized()
  async updateTrack(
    @Ctx() { trackService, scidService }: Context,
    @Arg('input') { trackId, profileId, ...changes }: UpdateTrackInput,
  ): Promise<UpdateTrackPayload> {
    const trackChanges = {
      ...changes,
      ...(profileId && { profileId: new mongoose.Types.ObjectId(profileId) }),
    };
    const track = await trackService.updateTrack(new mongoose.Types.ObjectId(trackId), trackChanges);

    // Auto-register SCid on-chain when NFT data is added (minting complete)
    if (changes.nftData?.tokenId !== undefined && changes.nftData?.contract) {
      try {
        const scid = await scidService.getByTrackId(trackId);
        if (scid && scid.status === 'PENDING') {
          const ownerWallet = changes.nftData.owner || changes.nftData.minter;
          if (ownerWallet) {
            console.log(`[TrackResolver] Auto-registering SCid ${scid.scid} on-chain...`);
            await scidService.registerOnChain(
              scid.scid,
              ownerWallet,
              changes.nftData.tokenId,
              changes.nftData.contract,
              scid.metadataHash,
              scid.chainId || 137
            );
          }
        }
      } catch (scidError) {
        // Don't fail the track update if SCid registration fails
        console.error(`[TrackResolver] SCid on-chain registration failed:`, scidError);
      }
    }

    return { track };
  }

  @Mutation(() => UpdateEditionOwnedTracksPayload)
  @Authorized()
  async updateEditionOwnedTracks(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackIds, trackEditionId, owner, ...changes }: UpdateEditionOwnedTracksInput,
  ): Promise<UpdateEditionOwnedTracksPayload> {
    const tracks = await trackService.updateEditionOwnedTracks(trackIds, trackEditionId, owner, changes);
    return { tracks };
  }

  @Mutation(() => UpdateTrackPayload)
  @Authorized()
  async deleteTrackOnError(
    @Ctx() { trackService }: Context,
    @Arg('input') { trackId }: DeleteTrackInput,
  ): Promise<DeleteTrackPayload> {
    const track = await trackService.deleteTrackOnError(trackId);
    return { track };
  }

  @Mutation(() => Track)
  @Authorized()
  async deleteTrack(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId, roles }: User,
    @Arg('trackId') trackId: string,
  ): Promise<Track> {
    const isAdmin = roles.includes(Role.ADMIN) || roles.includes(Role.TEAM_MEMBER);

    if (isAdmin) {
      const track = await trackService.deleteTrackByAdmin(trackId);
      return track;
    }

    const track = await trackService.deleteTrack(trackId, profileId.toString());
    return track;
  }

  @Mutation(() => ToggleFavoritePayload)
  @Authorized()
  async toggleFavorite(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('trackId') trackId: string,
  ): Promise<ToggleFavoritePayload> {
    const favoriteProfileTrack = await trackService.toggleFavorite(trackId, profileId.toString());
    return { favoriteProfileTrack };
  }

  @Query(() => TrackConnection)
  async favoriteTracks(
    @Ctx() { trackService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('search', { nullable: true }) search?: string,
    @Arg('sort', { nullable: true }) sort?: SortTrackInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<TrackConnection> {
    const favorites = await FavoriteProfileTrackModel.find({ profileId });
    const ids = favorites.map(item => new mongoose.Types.ObjectId(item.trackId.toString()));
    return trackService.getFavoriteTracks(ids, search, sort, page);
  }

  @Query(() => ListingItemConnection)
  listingItems(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterTrackMarketplace,
    @Arg('sort', { nullable: true }) sort?: SortListingItemInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ListingItemConnection> {
    return trackService.getListingItems(filter, sort, page);
  }

  @Query(() => ListingItemConnection)
  buyNowListingItems(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterBuyNowItemInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<ListingItemConnection> {
    return trackService.getBuyNowlistingItems(filter, page);
  }

  @Query(() => ListingItemConnection)
  ownedBuyNowListingItems(
    @Ctx() { trackService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterOwnedBuyNowItemInput,
  ): Promise<ListingItemConnection> {
    return trackService.getBuyNowlistingItems({
      trackEdition: filter.trackEditionId,
      nftData: {
        owner: filter.owner,
      }
    }, { first: MAX_EDITION_SIZE });
  }

  /**
   * Admin mutation to apply IPFS CIDs to tracks from S3 JSON
   * This is used for the IPFS migration to apply pinned CIDs to tracks
   */
  @Mutation(() => Number)
  @Authorized(Role.ADMIN)
  async applyIpfsCids(
    @Ctx() { trackService }: Context,
  ): Promise<number> {
    const https = await import('https');
    const S3_URL = 'https://soundchain-api-production-uploads.s3.amazonaws.com/migrations/ipfs_pins.json';

    // Fetch the IPFS pins JSON from S3
    const fetchJson = (url: string): Promise<{ pins: Array<{ trackId: string; cid: string; gatewayUrl: string }> }> => {
      return new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', (chunk: string) => data += chunk);
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error('Failed to parse JSON'));
            }
          });
        }).on('error', reject);
      });
    };

    const { pins } = await fetchJson(S3_URL);
    console.log(`[applyIpfsCids] Found ${pins.length} pins to apply`);

    let appliedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < pins.length; i += batchSize) {
      const batch = pins.slice(i, i + batchSize);
      const updates = batch.map(pin => ({
        trackId: pin.trackId,
        ipfsCid: pin.cid,
        ipfsGatewayUrl: pin.gatewayUrl,
      }));

      // Apply updates in parallel within batch
      await Promise.all(updates.map(async (update) => {
        try {
          await trackService.updateTrack(
            new mongoose.Types.ObjectId(update.trackId),
            { ipfsCid: update.ipfsCid, ipfsGatewayUrl: update.ipfsGatewayUrl }
          );
          appliedCount++;
        } catch (e) {
          console.error(`[applyIpfsCids] Failed to update track ${update.trackId}:`, e);
        }
      }));

      console.log(`[applyIpfsCids] Applied ${i + batch.length}/${pins.length} CIDs`);
    }

    console.log(`[applyIpfsCids] Migration complete. Applied ${appliedCount} CIDs`);
    return appliedCount;
  }
}

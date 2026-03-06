import { GetPlaylistPayload } from './../types/GetPlaylistPayload';
import { EditPlaylistPlayload } from './../types/EditPlaylistPlayload';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from "type-graphql";
import { CurrentUser } from "../decorators/current-user";
import { Playlist, PlaylistModel } from "../models/Playlist";
import { User } from "../models/User";
import { Context } from "../types/Context";
import { CreatePlaylistData } from "../types/CreatePlaylistInput";
import { CreatePlaylistPayload } from "../types/CreatePlaylistPayload";
import { EditPlaylistData } from '../types/EditPlaylistInput';
import { SortPlaylistInput } from '../services/SortPlaylistInput';
import { PageInput } from '../types/PageInput';
import { FavoritePlaylist } from '../models/FavoritePlaylist';
import { SortTrackField } from '../types/SortTrackField';
import { SortOrder } from '../types/SortOrder';
import { PaginateResult } from '../db/pagination/paginate';
import { PlaylistTrack } from '../models/PlaylistTrack';
import { GetTracksFromPlaylist } from '../types/GetTracksFromPlaylist';
import { CreatePlaylistTracks } from '../types/CreatePlaylistTracks';
import { DeletePlaylistTracks } from '../types/DeletePlaylistTracks';
import { DeletePlaylistPayload } from '../types/DeletePlaylistPayload';
import { AddPlaylistItemInput } from '../types/AddPlaylistItem';
import { AddPlaylistItemPayload, DeletePlaylistItemPayload, ReorderPlaylistItemsPayload } from '../types/AddPlaylistItemPayload';

@Resolver(Playlist)
export class PlaylistResolver {

  // Public query for getting a single playlist by ID (for OG meta tags, share previews)
  @Query(() => Playlist, { nullable: true })
  async playlist(
    @Ctx() { playlistService }: Context,
    @Arg('id') id: string,
  ): Promise<Playlist | null> {
    try {
      return await playlistService.findById(id);
    } catch (error) {
      console.error('[playlist] Error fetching playlist:', error);
      return null;
    }
  }

  @Query(() => GetPlaylistPayload)
  @Authorized()
  getUserPlaylists(
    @Ctx() { playlistService }: Context,
    @CurrentUser() user: User,
    @Arg('sort', { nullable: true }) sort?: SortPlaylistInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<GetPlaylistPayload> {
    if (!user?.profileId) {
      console.error('[getUserPlaylists] No user or profileId found');
      return Promise.resolve({ nodes: [], pageInfo: { hasNextPage: false, hasPreviousPage: false, totalCount: 0 } });
    }
    console.log('[getUserPlaylists] Fetching playlists for profileId:', user.profileId.toString());
    return playlistService.getPlaylists(user.profileId.toString(), sort, page);
  }

  @Mutation(() => CreatePlaylistPayload)
  @Authorized()
  async createPlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('input') { title, description, artworkUrl, trackIds }: CreatePlaylistData,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePlaylistPayload> {
    const playlist = await playlistService.createPlaylist({ profileId: profileId.toString(), title, description, artworkUrl, trackIds });
    return { playlist };
  }

  @Mutation(() => EditPlaylistPlayload)
  @Authorized()
  async updatePlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('input') { playlistId, title, description, artworkUrl }: EditPlaylistData,
  ): Promise<CreatePlaylistPayload> {
    const playlist = await playlistService.updatePlaylist({ playlistId, title, description, artworkUrl });
    return { playlist };
  }

  @Mutation(() => Boolean)
  @Authorized()
  async deletePlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('playlistId') playlistId: string,
    @CurrentUser() { profileId }: User,
  ): Promise<boolean> {
    return await playlistService.deletePlaylist(playlistId, profileId.toString());
  }

  @Mutation(() => CreatePlaylistPayload)
  @Authorized()
  async createPlaylistTracks(
    @Ctx() { playlistService }: Context,
    @Arg('input') { trackIds, playlistId }: CreatePlaylistTracks,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePlaylistPayload> {
    await playlistService.createPlaylistTracks({ trackIds, playlistId }, profileId.toString());

    const playlist = await playlistService.findOrFail(playlistId)

    return { playlist };
  }

  @Mutation(() => DeletePlaylistPayload)
  @Authorized()
  async deletePlaylistTracks(
    @Ctx() { playlistService }: Context,
    @Arg('input') { trackIds, playlistId }: DeletePlaylistTracks,
    @CurrentUser() { profileId }: User,
  ): Promise<DeletePlaylistPayload> {
    await playlistService.deletePlaylistTracks({ trackIds, playlistId }, profileId.toString());

    const playlist = await playlistService.findOrFail(playlistId)

    return { playlist };
  }

  @Mutation(() => FavoritePlaylist)
  @Authorized()
  async togglePlaylistFavorite(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('playlistId') playlistId: string,
  ): Promise<FavoritePlaylist> {
    return await playlistService.toggleFavorite(playlistId, profileId.toString());
  }

  @Mutation(() => FavoritePlaylist)
  @Authorized()
  async togglePlaylistFollow(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('playlistId') playlistId: string,
  ): Promise<FavoritePlaylist> {
    return await playlistService.togglePlaylistFollow(playlistId, profileId.toString());
  }

  @FieldResolver(() => Number)
  favoriteCount(@Ctx() { playlistService }: Context, @Root() { _id: playlistId }: Playlist): Promise<number> {
    return playlistService.favoriteCount(playlistId.toString());
  }

  @FieldResolver(() => Number)
  followCount(@Ctx() { playlistService }: Context, @Root() { _id: playlistId }: Playlist): Promise<number> {
    return playlistService.followCount(playlistId.toString());
  }

  @FieldResolver(() => Boolean)
  isFavorite(
    @Ctx() { playlistService }: Context,
    @Root() { _id: playlistId }: Playlist,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }
    return playlistService.isFavorite(playlistId.toString(), user.profileId.toString());
  }

  @FieldResolver(() => Boolean)
  isFollowed(
    @Ctx() { playlistService }: Context,
    @Root() { _id: playlistId }: Playlist,
    @CurrentUser() user?: User,
  ): Promise<boolean> {
    if (!user) {
      return Promise.resolve(false);
    }
    return playlistService.isFollowed(playlistId.toString(), user.profileId.toString());
  }

  @FieldResolver(() => GetTracksFromPlaylist, { nullable: true })
  async tracks(@Ctx() { playlistService }: Context, @Root() { _id }: Playlist): Promise<PaginateResult<PlaylistTrack> | null> {
    if (!_id) return null;

    const page = {
      first: 500  // No practical track limit - fetch up to 500 tracks per playlist
    };

    const sort = {
      field:  SortTrackField.CREATED_AT,
      order: SortOrder.DESC
    };

    console.log('[PlaylistResolver.tracks] Fetching tracks for playlistId:', _id.toString());
    const tracks = await playlistService.getTracksFromPlaylist(_id.toString(), sort, page);
    console.log('[PlaylistResolver.tracks] Found tracks:', tracks.nodes?.length || 0, 'total:', tracks.pageInfo?.totalCount || 0);

    return tracks;
  }

  // Universal playlist mutations - add external URLs, uploads, NFTs
  @Mutation(() => AddPlaylistItemPayload)
  @Authorized()
  async addPlaylistItem(
    @Ctx() { playlistService }: Context,
    @Arg('input') input: AddPlaylistItemInput,
    @CurrentUser() { profileId }: User,
  ): Promise<AddPlaylistItemPayload> {
    try {
      const playlistTrack = await playlistService.addPlaylistItem(input, profileId.toString());
      return { playlistTrack, success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Mutation(() => DeletePlaylistItemPayload)
  @Authorized()
  async deletePlaylistItem(
    @Ctx() { playlistService }: Context,
    @Arg('playlistItemId') playlistItemId: string,
    @CurrentUser() { profileId }: User,
  ): Promise<DeletePlaylistItemPayload> {
    try {
      const success = await playlistService.deletePlaylistItem(playlistItemId, profileId.toString());
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Mutation(() => ReorderPlaylistItemsPayload)
  @Authorized()
  async reorderPlaylistItems(
    @Ctx() { playlistService }: Context,
    @Arg('playlistId') playlistId: string,
    @Arg('itemIds', () => [String]) itemIds: string[],
    @CurrentUser() { profileId }: User,
  ): Promise<ReorderPlaylistItemsPayload> {
    try {
      const success = await playlistService.reorderPlaylistItems(playlistId, itemIds, profileId.toString());
      return { success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

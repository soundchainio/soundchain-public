import { GetPlaylistPayload } from './../types/GetPlaylistPayload';
import { EditPlaylistPlayload } from './../types/EditPlaylistPlayload';
import { Arg, Authorized, Ctx, FieldResolver, Mutation, Query, Resolver, Root } from "type-graphql";
import { CurrentUser } from "../decorators/current-user";
import { Playlist } from "../models/Playlist";
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
import { TrackFromPlaylist } from '../models/TrackFromPlaylist';
import { GetTracksFromPlaylist } from '../types/GetTracksFromPlaylist';

type s = PaginateResult<TrackFromPlaylist>
@Resolver(Playlist)
export class PlaylistResolver {

  @Query(() => GetPlaylistPayload)
  getUserPlaylists(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('sort', { nullable: true }) sort?: SortPlaylistInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<GetPlaylistPayload> {
    return playlistService.getPlaylists(profileId, sort, page);
  }

  @Mutation(() => CreatePlaylistPayload)
  @Authorized()
  async createPlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('input') { title, description, artworkUrl, trackIds }: CreatePlaylistData,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePlaylistPayload> {
    const playlist = await playlistService.createPlaylist({ profileId, title, description, artworkUrl, trackIds });
    return { playlist };
  }

  @Mutation(() => EditPlaylistPlayload)
  @Authorized()
  async updatePlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('input') { playlistId, title, description, artworkUrl, trackIds }: EditPlaylistData,
  ): Promise<CreatePlaylistPayload> {
    const playlist = await playlistService.updatePlaylist({ playlistId, title, description, artworkUrl, trackIds });
    return { playlist };
  }

  @Mutation(() => FavoritePlaylist)
  @Authorized()
  async togglePlaylistFavorite(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('playlistId') playlistId: string,
  ): Promise<FavoritePlaylist> {
    return await playlistService.toggleFavorite(playlistId, profileId);
  }

  @Mutation(() => FavoritePlaylist)
  @Authorized()
  async togglePlaylistFollow(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('playlistId') playlistId: string,
  ): Promise<FavoritePlaylist> {
    return await playlistService.togglePlaylistFollow(playlistId, profileId);
  }

  @FieldResolver(() => Number)
  favoriteCount(@Ctx() { playlistService }: Context, @Root() { _id: playlistId }: Playlist): Promise<number> {
    return playlistService.favoriteCount(playlistId);
  }

  @FieldResolver(() => Number)
  followCount(@Ctx() { playlistService }: Context, @Root() { _id: playlistId }: Playlist): Promise<number> {
    return playlistService.followCount(playlistId);
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
    return playlistService.isFavorite(playlistId, user.profileId);
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
    return playlistService.isFollowed(playlistId, user.profileId);
  }

  @FieldResolver(() => GetTracksFromPlaylist, { nullable: true })
  async tracks(@Ctx() { playlistService }: Context, @Root() { _id }: Playlist): Promise<PaginateResult<TrackFromPlaylist> | null> {
    if (!_id) return null;

    const page = {
      first: 10
    };

    const sort = {
      field:  SortTrackField.CREATED_AT,
      order: SortOrder.DESC
    };
    
    const tracks = await playlistService.getTracksFromPlaylist(_id, sort, page);

    return tracks;
  }
}
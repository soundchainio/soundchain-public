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

@Resolver(Playlist)
export class PlaylistResolver {

  @Query(() => GetPlaylistPayload)
  getUserPlaylists(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('sort', { nullable: true }) sort?: SortPlaylistInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<GetPlaylistPayload> {
    return playlistService.getPlaylists(profileId.toString(), sort, page);
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
      first: 10
    };

    const sort = {
      field:  SortTrackField.CREATED_AT,
      order: SortOrder.DESC
    };
    
    const tracks = await playlistService.getTracksFromPlaylist(_id.toString(), sort, page);

    return tracks;
  }
}

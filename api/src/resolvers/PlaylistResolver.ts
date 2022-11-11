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

@Resolver(Playlist)
export class PlaylistResolver {

  @Mutation(() => CreatePlaylistPayload)
  @Authorized()
  async createPlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('input') { title, description, artworkUrl, tracks }: CreatePlaylistData,
    @CurrentUser() { profileId }: User,
  ): Promise<CreatePlaylistPayload> {
    const playlist = await playlistService.createPlaylist({ profileId, title, description, artworkUrl, tracks });
    return { playlist };
  }

  @Mutation(() => EditPlaylistPlayload)
  @Authorized()
  async updatePlaylist(
    @Ctx() { playlistService }: Context,
    @Arg('input') { playlistId, title, description, artworkUrl, tracks }: EditPlaylistData,
  ): Promise<CreatePlaylistPayload> {
    const playlist = await playlistService.updatePlaylist({ playlistId, title, description, artworkUrl, tracks });
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

  @Query(() => GetPlaylistPayload)
  getUserPlaylists(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('sort', { nullable: true }) sort?: SortPlaylistInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<GetPlaylistPayload> {
    return playlistService.getPlaylists(profileId, sort, page);
  }

  @FieldResolver(() => Number)
  favoriteCount(@Ctx() { playlistService }: Context, @Root() { _id: playlistId }: Playlist): Promise<number> {
    return playlistService.favoriteCount(playlistId);
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

  @Mutation(() => FavoritePlaylist)
  @Authorized()
  async togglePlaylistFollow(
    @Ctx() { playlistService }: Context,
    @CurrentUser() { profileId }: User,
    @Arg('playlistId') playlistId: string,
  ): Promise<FavoritePlaylist> {
    return await playlistService.togglePlaylistFollow(playlistId, profileId);
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
}
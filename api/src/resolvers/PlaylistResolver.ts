import { GetPlaylistPayload } from './../types/GetPlaylistPayload';
import { EditPlaylistPlayload } from './../types/EditPlaylistPlayload';
import { Arg, Authorized, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { CurrentUser } from "../decorators/current-user";
import { Playlist } from "../models/Playlist";
import { User } from "../models/User";
import { Context } from "../types/Context";
import { CreatePlaylistData } from "../types/CreatePlaylistInput";
import { CreatePlaylistPayload } from "../types/CreatePlaylistPayload";
import { EditPlaylistData } from '../types/EditPlaylistInput';
import { FilterGetPlaylist } from '../types/FilterGetPlaylist';
import { SortPlaylistInput } from '../services/SortPlaylistInput';
import { PageInput } from '../types/PageInput';

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

  @Query(() => GetPlaylistPayload)
  playlists(
    @Ctx() { playlistService }: Context,
    @Arg('filter', { nullable: true }) filter?: FilterGetPlaylist,
    @Arg('sort', { nullable: true }) sort?: SortPlaylistInput,
    @Arg('page', { nullable: true }) page?: PageInput,
  ): Promise<GetPlaylistPayload> {
    return playlistService.getPlaylists(filter, sort, page);
  }
}
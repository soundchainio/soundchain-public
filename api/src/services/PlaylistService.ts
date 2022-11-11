import { ObjectId } from 'mongodb';
import { PaginateResult } from '../db/pagination/paginate';
import { FavoritePlaylist, FavoritePlaylistModel } from '../models/FavoritePlaylist';
import { FollowPlaylist, FollowPlaylistModel } from '../models/FollowPlaylist';
import { Playlist, PlaylistModel } from '../models/Playlist';
import { Context } from '../types/Context';
import { PageInput } from '../types/PageInput';
import { ModelService } from './ModelService';
import { SortPlaylistInput } from './SortPlaylistInput';

interface CreatePlaylistParams {
  title: string;
  description: string;
  artworkUrl: string;
  profileId: string;
  tracks?: string[];
}

interface EditPlaylistParams {
  playlistId: string;
  title?: string;
  description?: string;
  artworkUrl?: string;
  profileId?: string;
  tracks?: string[];
}

export class PlaylistService extends ModelService<typeof Playlist> {
  constructor(context: Context) {
    super(context, PlaylistModel);
  }

  async createPlaylist(params: CreatePlaylistParams): Promise<Playlist> {
    const playlist = new this.model(params);
    await playlist.save();

    return playlist;
  }

  async updatePlaylist(params: EditPlaylistParams): Promise<Playlist> {
    const { playlistId } = params

    const playlist = this.model.findOneAndUpdate(
      { _id: playlistId },
      {
        ...params,
      },
      { new: true },
    );

    return playlist;
  }

  getPlaylists(profileId?: string, sort?: SortPlaylistInput, page?: PageInput): Promise<PaginateResult<Playlist>> {
    return this.paginate({ filter: { profileId, deleted: false }, sort, page });
  }

  
  async favoriteCount(playlistId: string): Promise<number> {
    return await FavoritePlaylistModel.countDocuments({ "playlistId": playlistId})
  }

  async toggleFavorite(playlistId: string, profileId: string): Promise<FavoritePlaylist> {
    const favoritePlaylist = await FavoritePlaylistModel.findOne({playlistId});

    if (favoritePlaylist?.id) {
      return await FavoritePlaylistModel.findOneAndDelete({playlistId});
    }

    const favorite = new FavoritePlaylistModel({
      profileId,
      playlistId,
    });

    await favorite.save();
    return favorite;
  }

  async isFavorite(playlistId: string, profileId: string): Promise<boolean> {
    return await FavoritePlaylistModel.exists({
      playlistId,
      profileId,
    });
  }

  async togglePlaylistFollow(playlistId: string, profileId: string): Promise<FollowPlaylist> {
    const followPlaylistModel = await FollowPlaylistModel.findOne({playlistId});

    if (followPlaylistModel?.id) {
      return await FollowPlaylistModel.findOneAndDelete({playlistId});
    }

    const favorite = new FollowPlaylistModel({
      profileId,
      playlistId,
    });

    await favorite.save();
    return favorite;
  }

  async isFollowed(playlistId: string, profileId: string): Promise<boolean> {
    return await FollowPlaylistModel.exists({
      playlistId,
      profileId,
    });
  }

  getFavoritePlaylists(
    ids: ObjectId[],
    search?: string,
    sort?: SortPlaylistInput,
    page?: PageInput,
  ): Promise<PaginateResult<Playlist>> {
    const regex = new RegExp(search, 'i');

    const filter = {
      $or: [{ title: regex }, { description: regex }, { profileId: regex }, { playbackCount: regex }],
    };

    return this.paginate({
      filter: { _id: { $in: ids }, title: { $exists: true }, deleted: false, ...filter },
      sort,
      page,
    });
  }
}

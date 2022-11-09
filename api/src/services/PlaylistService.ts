import { PaginateResult } from '../db/pagination/paginate';
import { Playlist, PlaylistModel } from '../models/Playlist';
import { Context } from '../types/Context';
import { FilterGetPlaylist } from '../types/FilterGetPlaylist';
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

  getPlaylists(filter?: FilterGetPlaylist, sort?: SortPlaylistInput, page?: PageInput): Promise<PaginateResult<Playlist>> {
    return this.paginate({ filter: { ...filter, deleted: false }, sort, page });
  }
}

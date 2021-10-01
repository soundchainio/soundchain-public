import Mux from '@mux/mux-node';
import { config } from '../config';
import { Context } from '../types/Context';
import { MuxUpload } from '../types/MuxUpload';

export class MuxService {
  muxClient: Mux;

  constructor(private context: Context) {
    this.muxClient = new Mux(config.mux.tokenId, config.mux.tokenSecret);
  }

  async createUpload(trackId: string): Promise<MuxUpload> {
    const { url, id } = await this.muxClient.Video.Uploads.create({
      cors_origin: config.web.url,
      new_asset_settings: {
        playback_policy: 'public',
        passthrough: trackId,
        test: process.env.NODE_ENV === 'development',
      },
    });

    return { url, id };
  }
}

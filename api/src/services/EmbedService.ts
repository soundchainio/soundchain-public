import { User, UserModel } from '../models/User';
import { Context } from '../types/Context';
import { ModelService } from './ModelService';
import axios from 'axios';
import cheerio from 'cheerio';

export class EmbedService extends ModelService<typeof User> {
  constructor(context: Context) {
    super(context, UserModel);
  }

  async bandcampLink(url: string): Promise<string> {
    const html = await axios
      .get(url, {
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

    const $ = cheerio.load(html.data);

    const embedUrl = $('meta[property="og:video"]').attr('content');

    return embedUrl || '';
  }
}

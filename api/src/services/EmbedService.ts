import axios from 'axios';
import * as cheerio from 'cheerio';
import { Context } from '../types/Context';
import { Service } from './Service';

export class EmbedService extends Service {
  constructor(context: Context) {
    super(context);
  }

  async bandcampLink(url: string): Promise<string> {
    const html = await axios.get(url, {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    const $ = cheerio.load(html.data);

    const embedUrl = $('meta[property="og:video"]').attr('content');

    return embedUrl || '';
  }
}

import axios from 'axios';
import { Service } from './Service';

const { POLYGON_SCAN_API_KEY } = process.env;

interface PolygonscanMaticUsdResponse {
  result: {
    maticusd: string;
  };
}

export class PolygonscanService extends Service {
  async getMaticUsd(): Promise<string> {
    const url = `https://api.polygonscan.com/api?module=stats&action=maticprice&apikey=${POLYGON_SCAN_API_KEY}`;

    const { data } = await axios.get<PolygonscanMaticUsdResponse>(url);
    return data.result.maticusd;
  }
}

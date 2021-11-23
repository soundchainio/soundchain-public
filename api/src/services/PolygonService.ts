import { config } from '../config';
import { polygonScanApi } from '../polygonApi';
import { Service } from './Service';

interface PolygonscanMaticUsdResponse {
  result: {
    maticusd: string;
  };
}

export class PolygonscanService extends Service {
  async getMaticUsd(): Promise<string> {
    const { data } = await polygonScanApi.get<PolygonscanMaticUsdResponse>(
      `?apikey=${config.minting.polygonScan}&module=stats&action=maticprice`,
    );
    return data.result.maticusd;
  }
}

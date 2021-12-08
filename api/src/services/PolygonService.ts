import { config } from '../config';
import { polygonScanApi, polygonScanTestNetApi } from '../polygonApi';
import { PageInput } from '../types/PageInput';
import { Service } from './Service';

interface PolygonscanMaticUsdResponse {
  result: {
    maticusd: string;
  };
}

interface PolygonscanResponse {
  status: number;
  message: string;
  result: PolygonscanResultInterface[];
}

export interface PolygonscanResultInterface {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
}

export class PolygonscanService extends Service {
  async getMaticUsd(): Promise<string> {
    const url = `?apikey=${config.minting.polygonScan}&module=stats&action=maticprice`;

    const { data } = await polygonScanApi.get<PolygonscanMaticUsdResponse>(url);
    return data.result.maticusd;
  }

  async getTransactionHistory(
    wallet: string,
    page?: PageInput,
  ): Promise<{ result: PolygonscanResultInterface[]; nextPage: string }> {
    const offset = page.first;
    const pageRequest = (page.after && parseInt(page.after)) ?? 1;
    const url = `?apikey=${config.minting.polygonScan}&module=account&action=txlist&address=${wallet}&startblock=1&endblock=99999999&page=${pageRequest}&offset=${offset}&sort=desc`;

    const { data } = await polygonScanTestNetApi.get<PolygonscanResponse>(url);

    let nextPage: string;
    if (data.result.length) {
      nextPage = (pageRequest + 1).toString();
    }

    return { result: data.result, nextPage };
  }

  async getInternalTransactionHistory(
    wallet: string,
    page?: PageInput,
  ): Promise<{ result: PolygonscanResultInterface[]; nextPage: string }> {
    const offset = page.first;
    const pageRequest = (page.after && parseInt(page.after)) ?? 1;
    const url = `?apikey=${config.minting.polygonScan}&module=account&action=txlistinternal&address=${wallet}&startblock=1&endblock=99999999&page=${pageRequest}&offset=${offset}&sort=desc`;

    const { data } = await polygonScanTestNetApi.get<PolygonscanResponse>(url);

    let nextPage: string;
    if (data.result.length === offset) {
      nextPage = (pageRequest + 1).toString();
    }

    return { result: data.result, nextPage };
  }
}

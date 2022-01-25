import axios from 'axios';
import { network } from './blockchainNetworks';

export const polygonScanApi = axios.create({
  baseURL: network.api,
});

import axios from 'axios';

export const polygonScanApi = axios.create({
  baseURL: 'https://api.polygonscan.com/api',
});

export const polygonScanTestNetApi = axios.create({
  baseURL: 'https://api-testnet.polygonscan.com/api',
});

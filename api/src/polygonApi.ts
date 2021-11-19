import axios from 'axios';

export const polygonScanApi = axios.create({
  baseURL: 'https://api.polygonscan.com/api',
});

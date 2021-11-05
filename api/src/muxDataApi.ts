import axios from 'axios';
import { config } from './config';

const muxDataApi = axios.create({
  baseURL: 'https://api.mux.com/data/v1',
  auth: { username: config.muxData.tokenId, password: config.muxData.tokenSecret },
});

export default muxDataApi;

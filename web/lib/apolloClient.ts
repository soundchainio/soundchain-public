import { ApolloClient, InMemoryCache } from '@apollo/client';

const { NEXT_APP_API_URL = 'http://localhost:4000' } = process.env;

export default new ApolloClient({
  uri: NEXT_APP_API_URL,
  cache: new InMemoryCache(),
});

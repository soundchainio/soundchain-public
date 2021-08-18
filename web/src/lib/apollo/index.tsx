import {
  ApolloClient,
  ApolloContextValue,
  ApolloLink,
  ApolloProvider as Provider,
  createHttpLink,
  InMemoryCache,
  Observable,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import Cookies from 'js-cookie';
import { GetServerSidePropsContext } from 'next';
import isBrowser from '../isBrowser';
import { cacheConfig } from './cache-config';

const jwtKey = 'token';

let jwt = (isBrowser && Cookies.get(jwtKey)) || undefined;

const httpLink = createHttpLink({ uri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql' });

const authLink = setContext((_, context: ApolloContextValue | GetServerSidePropsContext) => {
  const currentJwt = ('req' in context && context.req.cookies[jwtKey]) || jwt;
  return currentJwt ? { headers: { authorization: `Bearer ${currentJwt}` } } : {};
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(cacheConfig),
  defaultOptions: {
    query: {
      fetchPolicy: isBrowser ? 'cache-first' : 'no-cache',
    },
  },
});

export function setJwt(newJwt?: string) {
  jwt = newJwt;

  if (isBrowser) {
    if (jwt) {
      Cookies.set(jwtKey, jwt, { secure: true });
    } else {
      Cookies.remove(jwtKey);
    }

    apolloClient.resetStore();
  }
}

// Apollo hooks get called during SSR but Next.js doesn't wait for response
// We use a fake client to prevent unecessary calls to the backend
const fakeClient = new ApolloClient({
  link: new ApolloLink(
    () =>
      new Observable(observer => {
        observer.complete();
      }),
  ),
  cache: new InMemoryCache(),
});

export interface ApolloProviderProps {
  children: JSX.Element;
}

export function ApolloProvider({ children }: ApolloProviderProps) {
  return <Provider client={isBrowser ? apolloClient : fakeClient}>{children}</Provider>;
}

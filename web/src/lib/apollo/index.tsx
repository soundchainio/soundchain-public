import {
  ApolloClient,
  ApolloProvider as Provider,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { getDataFromTree } from '@apollo/client/react/ssr';
import { mergeDeep } from '@apollo/client/utilities';
import Cookies from 'js-cookie';
import { GetServerSidePropsContext } from 'next';
import { RouterContext } from 'next/dist/shared/lib/router-context';
import { useMemo } from 'react';
import isBrowser from '../isBrowser';
import { cacheConfig } from './cache-config';
import { FakeRouter } from './fake-router';

const jwtKey = 'token';

let jwt = (isBrowser && Cookies.get(jwtKey)) || undefined;

const httpLink = createHttpLink({ uri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql' });

export function createApolloClient(context?: GetServerSidePropsContext) {
  const authLink = setContext(() => {
    const currentJwt = context?.req.cookies[jwtKey] || jwt;
    return currentJwt ? { headers: { authorization: `Bearer ${currentJwt}` } } : {};
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(cacheConfig),
    ssrMode: !isBrowser,
    defaultOptions: {},
  });
}

export const apolloClient = createApolloClient();

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

export async function cacheFor<T>(
  Page: React.ComponentType<T>,
  pageProps: T,
  context: GetServerSidePropsContext,
  client?: ApolloClient<NormalizedCacheObject>,
) {
  client = client ?? createApolloClient(context);

  await getDataFromTree(
    <RouterContext.Provider value={new FakeRouter(context)}>
      <Provider client={client}>
        <Page {...pageProps} />
      </Provider>
    </RouterContext.Provider>,
  );

  return { props: { ...pageProps, cache: client.extract() } };
}

export interface ApolloProviderProps {
  pageProps: { cache?: NormalizedCacheObject };
  children: JSX.Element;
}

export function ApolloProvider({ pageProps, children }: ApolloProviderProps) {
  const { cache } = pageProps;

  useMemo(() => {
    if (cache) {
      const existingCache = apolloClient.extract();
      apolloClient.restore(mergeDeep(existingCache, cache));
    }
  }, [cache]);

  return <Provider client={apolloClient}>{children}</Provider>;
}

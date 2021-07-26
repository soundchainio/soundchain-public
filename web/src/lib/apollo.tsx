import {
  ApolloClient,
  ApolloLink,
  ApolloProvider as Provider,
  createHttpLink,
  InMemoryCache,
  Observable,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import isBrowser from './isBrowser';

const jwtKey = 'token';

let jwt = (isBrowser && localStorage.getItem(jwtKey)) || undefined;

const httpLink = createHttpLink({ uri: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000' });

const authLink = setContext(() => {
  return jwt ? { headers: { authorization: `Bearer ${jwt}` } } : {};
});

export const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: isBrowser ? 'cache-first' : 'no-cache',
    },
  },
});

export function setJwt(newJwt?: string) {
  jwt = newJwt;

  if (jwt) {
    localStorage.setItem(jwtKey, jwt);
  } else {
    localStorage.removeItem(jwtKey);
  }

  if (isBrowser) {
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

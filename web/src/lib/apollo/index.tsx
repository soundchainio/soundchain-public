import { useMemo } from 'react'

import { config } from 'config'
import Cookies from 'js-cookie'
import { isSafari } from 'lib/isSafari'
import { GetServerSidePropsContext } from 'next'
import { RouterContext } from 'next/dist/shared/lib/router-context.shared-runtime'

import {
  ApolloClient,
  ApolloProvider as Provider,
  createHttpLink,
  InMemoryCache,
  NormalizedCacheObject,
} from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { getDataFromTree } from '@apollo/client/react/ssr'
import { mergeDeep } from '@apollo/client/utilities'

import isBrowser from '../isBrowser'
import { cacheConfig } from './cache-config'
import { FakeRouter } from './fake-router'

const jwtKey = 'token'

let jwt = (isBrowser && Cookies.get(jwtKey)) || undefined

const httpLink = createHttpLink({ uri: config.apiUrl ?? 'http://localhost:4000/graphql' })

export function createApolloClient(context?: GetServerSidePropsContext) {
  const authLink = setContext(() => {
    const currentJwt = context?.req.cookies[jwtKey] || getJwt()
    return currentJwt ? { headers: { authorization: `Bearer ${currentJwt}` } } : {}
  })

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache(cacheConfig),
    ssrMode: !isBrowser,
    defaultOptions: {},
  })
}

export const apolloClient = createApolloClient()

export function getJwt() {
  if (isBrowser) {
    return Cookies.get(jwtKey)
  }
  return jwt
}

export async function setJwt(newJwt?: string) {
  jwt = newJwt
  if (isBrowser) {
    if (jwt) {
      Cookies.set(jwtKey, jwt, { sameSite: 'Lax', secure: !isSafari })
    } else {
      Cookies.remove(jwtKey)
      await apolloClient.clearStore()
    }
    await apolloClient.resetStore()
  }
}

export async function cacheFor<T extends Record<string, any>>(
  Page: React.ComponentType<T & { cache?: NormalizedCacheObject }>,
  pageProps: T,
  context: GetServerSidePropsContext,
  client?: ApolloClient<NormalizedCacheObject>,
) {
  client = client ?? createApolloClient(context)

  await getDataFromTree(
    <RouterContext.Provider value={new FakeRouter(context)}>
      <Provider client={client}>
        <Page {...(pageProps as T & { cache?: NormalizedCacheObject })} />
      </Provider>
    </RouterContext.Provider>,
  )

  return { props: { ...pageProps, cache: client.extract() } }
}

export interface ApolloProviderProps {
  pageProps: { cache?: NormalizedCacheObject }
  children: JSX.Element
}

export function ApolloProvider({ pageProps, children }: ApolloProviderProps) {
  const { cache } = pageProps

  useMemo(() => {
    if (cache) {
      const existingCache = apolloClient.extract()
      apolloClient.restore(mergeDeep(existingCache, cache))
    }
  }, [cache])

  return <Provider client={apolloClient}>{children}</Provider>
}

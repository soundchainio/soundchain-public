import fetch from 'cross-fetch'
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

const apiUrl = config.apiUrl ?? 'http://localhost:4000/graphql'
console.log('🔗 Apollo API URL:', apiUrl, '| env:', config.apiUrl)
const httpLink = createHttpLink({ uri: apiUrl, fetch })

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
    // Try cookie first, then localStorage fallback
    const cookieJwt = Cookies.get(jwtKey)
    if (cookieJwt) return cookieJwt

    // Fallback to localStorage if cookie not available
    const localStorageJwt = localStorage.getItem('jwt_fallback')
    if (localStorageJwt) {
      console.log('Using JWT from localStorage fallback')
      return localStorageJwt
    }

    return undefined
  }
  return jwt
}

export async function setJwt(newJwt?: string) {
  jwt = newJwt
  if (isBrowser) {
    if (jwt) {
      // Set cookie with proper options for persistence
      Cookies.set(jwtKey, jwt, {
        sameSite: 'Lax',
        secure: !isSafari,
        expires: 7,  // 7 days expiry
        path: '/',   // Available on all paths
      })

      // Verify cookie was set
      const savedJwt = Cookies.get(jwtKey)
      if (savedJwt) {
        console.log('JWT cookie set and verified:', savedJwt.substring(0, 20) + '...')
      } else {
        console.error('JWT cookie was NOT saved! Browser may be blocking cookies.')
        // Try localStorage as fallback
        try {
          localStorage.setItem('jwt_fallback', jwt)
          console.log('JWT saved to localStorage as fallback')
        } catch (e) {
          console.error('Failed to save JWT to localStorage:', e)
        }
      }

      // Small delay to ensure cookie is fully set before Apollo reset
      await new Promise(resolve => setTimeout(resolve, 100))

      try {
        // Only reset if we have a token (not on logout)
        await apolloClient.resetStore()
        console.log('Apollo cache reset complete')
      } catch (error) {
        // Ignore errors from resetStore - queries will refetch naturally
        console.warn('Apollo resetStore warning:', error)
      }
    } else {
      // Logout flow - clear all auth tokens
      Cookies.remove(jwtKey, { path: '/' })
      localStorage.removeItem('jwt_fallback')
      localStorage.removeItem('didToken') // Clear Magic session token to prevent auto-login
      await apolloClient.clearStore()
    }
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

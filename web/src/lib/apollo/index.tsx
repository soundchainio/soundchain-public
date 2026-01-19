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
  const authLink = setContext((_, { headers }) => {
    // For SSR, use cookies from request context
    // For browser, use getJwt() which checks cookie then localStorage
    const currentJwt = context?.req?.cookies?.[jwtKey] || getJwt()

    if (isBrowser && !currentJwt) {
      console.log('[Apollo] No JWT found for request')
    } else if (isBrowser && currentJwt) {
      console.log('[Apollo] JWT attached to request:', currentJwt.substring(0, 20) + '...')
    }

    return {
      headers: {
        ...headers,
        ...(currentJwt ? { authorization: `Bearer ${currentJwt}` } : {}),
      },
    }
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
    // Try cookie first
    const cookieJwt = Cookies.get(jwtKey)
    if (cookieJwt) {
      console.log('[Auth] getJwt() returning cookie JWT')
      return cookieJwt
    }

    // Fallback to localStorage (critical for mobile Safari/iOS)
    try {
      const localStorageJwt = localStorage.getItem('jwt_fallback')
      if (localStorageJwt) {
        console.log('[Auth] getJwt() using localStorage fallback (mobile/Safari)')
        // Try to restore cookie from localStorage
        try {
          Cookies.set(jwtKey, localStorageJwt, {
            sameSite: 'Lax',
            secure: !isSafari,
            expires: 30,
            path: '/',
          })
        } catch (e) {
          // Cookie restore failed, but localStorage JWT still valid
        }
        return localStorageJwt
      }
    } catch (e) {
      console.warn('[Auth] localStorage access failed:', e)
    }

    console.log('[Auth] getJwt() no JWT found anywhere')
    return undefined
  }
  return jwt
}

export async function setJwt(newJwt?: string) {
  jwt = newJwt
  if (isBrowser) {
    if (jwt) {
      // ALWAYS save to localStorage first (most reliable on mobile)
      // This ensures JWT survives even if cookies are blocked
      try {
        localStorage.setItem('jwt_fallback', jwt)
        console.log('[Auth] JWT saved to localStorage')
      } catch (e) {
        console.error('[Auth] Failed to save JWT to localStorage:', e)
      }

      // Also try to set cookie (better for SSR/cross-tab)
      try {
        Cookies.set(jwtKey, jwt, {
          sameSite: 'Lax',
          secure: !isSafari,
          expires: 30,  // 30 days expiry
          path: '/',
        })

        const savedJwt = Cookies.get(jwtKey)
        if (savedJwt) {
          console.log('[Auth] JWT cookie set:', savedJwt.substring(0, 20) + '...')
        } else {
          console.warn('[Auth] Cookie not saved (browser may be blocking)')
        }
      } catch (e) {
        console.warn('[Auth] Cookie save failed:', e)
      }

      // Small delay to ensure storage is complete before Apollo reset
      await new Promise(resolve => setTimeout(resolve, 100))

      try {
        await apolloClient.resetStore()
        console.log('[Auth] Apollo cache reset complete')
      } catch (error) {
        console.warn('[Auth] Apollo resetStore warning:', error)
      }
    } else {
      // Logout flow - clear all auth tokens
      Cookies.remove(jwtKey, { path: '/' })
      localStorage.removeItem('jwt_fallback')
      localStorage.removeItem('didToken')
      await apolloClient.clearStore()
      console.log('[Auth] All tokens cleared (logout)')
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

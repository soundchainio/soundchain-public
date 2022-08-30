import { GetServerSidePropsContext } from 'next'
import { DomainLocale } from 'next/dist/server/config-shared'
import mitt, { MittEmitter } from 'next/dist/shared/lib/mitt'
import { NextRouter } from 'next/router'
import { ParsedUrlQuery } from 'querystring'

export class FakeRouter implements NextRouter {
  route: string
  pathname: string
  query: ParsedUrlQuery
  asPath: string
  basePath: string
  locale?: string | undefined
  locales?: string[] | undefined
  defaultLocale?: string | undefined
  domainLocales?: DomainLocale[] | undefined
  isLocaleDomain: boolean
  events: MittEmitter<
    | 'routeChangeStart'
    | 'beforeHistoryChange'
    | 'routeChangeComplete'
    | 'routeChangeError'
    | 'hashChangeStart'
    | 'hashChangeComplete'
  >
  isFallback: boolean
  isReady: boolean
  isPreview: boolean

  constructor(context: GetServerSidePropsContext) {
    const pathname = context.resolvedUrl.replace(/\?.*/, '')
    this.route = pathname.replace(/\/$/, '')
    this.pathname = pathname
    this.query = context.query
    this.asPath = context.req.url ?? pathname
    this.basePath = ''
    this.locale = context.locale
    this.locales = context.locales
    this.defaultLocale = context.defaultLocale
    this.isLocaleDomain = true
    this.events = mitt()
    this.isFallback = false
    this.isReady = true
    this.isPreview = context.preview ?? false
  }

  push(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  replace(): Promise<boolean> {
    throw new Error('Method not implemented.')
  }
  reload(): void {
    throw new Error('Method not implemented.')
  }
  back(): void {
    throw new Error('Method not implemented.')
  }
  prefetch(): Promise<void> {
    throw new Error('Method not implemented.')
  }
  beforePopState(): void {
    throw new Error('Method not implemented.')
  }
}

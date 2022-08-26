/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next'
import { ParsedUrlQuery } from 'querystring'
import { createApolloClient } from './apollo'
import { MeDocument, MeQuery } from './graphql'

export type GetServerSidePropsWithContext<
  P extends { [key: string]: any } = { [key: string]: any },
  Q extends ParsedUrlQuery = ParsedUrlQuery,
> = (
  context: GetProtectedServerSidePropsContext<Q>,
  apolloClient: ApolloClient<NormalizedCacheObject>,
) => Promise<GetServerSidePropsResult<P>>

export interface GetProtectedServerSidePropsContext<Q extends ParsedUrlQuery = ParsedUrlQuery>
  extends GetServerSidePropsContext<Q> {
  user: MeQuery['me']
}

export const protectPage = <P extends { [key: string]: any }, Q extends ParsedUrlQuery = ParsedUrlQuery>(
  getServerSideProps: GetServerSidePropsWithContext<P, Q>,
): GetServerSideProps<P, Q> => {
  return async context => {
    const apolloClient = createApolloClient(context)
    const {
      data: { me },
    } = await apolloClient.query<MeQuery>({ query: MeDocument, context })
    if (me) return getServerSideProps({ ...context, user: me }, apolloClient)
    return {
      redirect: {
        permanent: false,
        // TODO support redirect url
        destination: '/login',
      },
    }
  }
}

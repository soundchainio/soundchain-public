import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { createApolloClient } from './apollo';
import { MeDocument, MeQuery } from './graphql';

export type GetServerSidePropsWithContext<
  P extends { [key: string]: unknown } = { [key: string]: unknown },
  Q extends ParsedUrlQuery = ParsedUrlQuery,
> = (
  context: GetServerSidePropsContext<Q>,
  apolloClient: ApolloClient<NormalizedCacheObject>,
) => Promise<GetServerSidePropsResult<P>>;

export const protectPage = <T extends { [key: string]: unknown }>(
  getServerSideProps: GetServerSidePropsWithContext<T>,
): GetServerSideProps<T> => {
  return async context => {
    const {
      data: { me },
    } = await apolloClient.query<MeQuery>({ query: MeDocument, context });
    if (me) return getServerSideProps(context);
    return {
      redirect: {
        permanent: false,
        // TODO support redirect url
        destination: '/login',
      },
    };
  };
};

import { GetServerSideProps } from 'next';
import { apolloClient } from './apollo';
import { MeDocument, MeQuery } from './graphql';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const protectPage = <T extends { [key: string]: any }>(
  getServerSideProps: GetServerSideProps<T>,
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

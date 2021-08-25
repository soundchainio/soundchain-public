import { AuthLayout } from 'components/AuthLayout';
import { Button } from 'components/Button';
import { Subtitle } from 'components/Subtitle';
import { Title } from 'components/Title';
import { apolloClient, cacheFor, createApolloClient } from 'lib/apollo';
import { VerifyUserEmailDocument, VerifyUserEmailMutation, VerifyUserEmailMutationVariables } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';

export interface VerifyEmailProps {
  verified: boolean;
}

export const getServerSideProps: GetServerSideProps<VerifyEmailProps> = async context => {
  const { token } = context.query;

  if (typeof token !== 'string') {
    return { notFound: true };
  }

  let verified = false;
  try {
    const apolloClient = createApolloClient(context);
    const { data } = await apolloClient.mutate<VerifyUserEmailMutation, VerifyUserEmailMutationVariables>({
      mutation: VerifyUserEmailDocument,
      variables: { input: { token: token.toString() } },
    });

    if (data) {
      verified = data.verifyUserEmail.user.verified;
    }
  } catch (err) {}

  return cacheFor(VerifyEmailPage, { verified }, context, apolloClient);
};

export default function VerifyEmailPage({ verified }: VerifyEmailProps) {
  const router = useRouter();
  return (
    <div>
      <Head>
        <title>Soundchain - Verifiy Email</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthLayout>
        {verified ? (
          <>
            <Title className="my-6">Welcome to Soundchain!</Title>
            <Subtitle className="mb-auto">Verification complete! You can now proceed to login.</Subtitle>
            <Button onClick={() => router.push('/login')}>Login</Button>
          </>
        ) : (
          <>
            <Title className="my-6">Soundchain</Title>
            <Subtitle>Verification failed! Please try again.</Subtitle>
          </>
        )}
      </AuthLayout>
    </div>
  );
}

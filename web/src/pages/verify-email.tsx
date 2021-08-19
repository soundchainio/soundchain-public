import { Button } from 'components/Button';
import { LockedLayout } from 'components/LockedLayout';
import { Subtitle } from 'components/Subtitle';
import { Title } from 'components/Title';
import { apolloClient } from 'lib/apollo';
import { VerifyUserEmailDocument, VerifyUserEmailMutation, VerifyUserEmailMutationVariables } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';

export const getServerSideProps: GetServerSideProps<VerifyEmailProps> = async context => {
  const { token } = context.query;
  let verified = false;
  if (token) {
    try {
      const { data } = await apolloClient.mutate<VerifyUserEmailMutation, VerifyUserEmailMutationVariables>({
        mutation: VerifyUserEmailDocument,
        variables: { input: { token: token.toString() } },
      });
      if (data) {
        verified = data.verifyUserEmail.user.verified;
      }
    } catch (err) {}
  }

  return {
    props: {
      verified,
    },
  };
};

export interface VerifyEmailProps {
  verified: boolean;
}

export default function VerifyEmailPage({ verified }: VerifyEmailProps) {
  const router = useRouter();
  return (
    <div>
      <Head>
        <title>Soundchain - Verifiy Email</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LockedLayout>
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
      </LockedLayout>
    </div>
  );
}

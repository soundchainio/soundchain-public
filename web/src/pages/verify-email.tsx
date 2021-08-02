import Link from 'components/Link';
import { apolloClient } from 'lib/apollo';
import { VerifyUserEmailDocument, VerifyUserEmailMutation, VerifyUserEmailMutationVariables } from 'lib/graphql';
import { GetServerSideProps } from 'next';

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
  return (
    <div className="container">
      <div className="mt-12 flex flex-col items-center space-y-6">
        <h1 className="text-2xl text-center">SoundChain</h1>
        <main className="text-center flex">
          <p>
            {verified ? (
              <>
                <h1>Welcome to Soundchain!</h1>
                Verification complete! You can now proceed to login.
                <br />
                <Link href="/login">Login</Link>
              </>
            ) : (
              <>
                Verification Failed!
                <br />
                <Link href="/">Home</Link>
              </>
            )}
          </p>
        </main>
      </div>
    </div>
  );
}

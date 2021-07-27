import { GetServerSideProps } from 'next';
import Link from 'next/link';
import { apolloClient } from '../lib/apollo';
import { VerifyDocument, VerifyMutation, VerifyMutationVariables } from '../lib/graphql';

export const getServerSideProps: GetServerSideProps<VerificationProps> = async context => {
  const { token } = context.query;
  let success = false;
  if (token) {
    const { data } = await apolloClient.mutate<VerifyMutation, VerifyMutationVariables>({
      mutation: VerifyDocument,
      variables: { input: { token: token as string } },
    });
    if (data) {
      success = data.verify.success;
    }
  }

  return {
    props: {
      success,
    },
  };
};

export interface VerificationProps {
  success: boolean;
}

export default function VerificationPage({ success }: VerificationProps) {
  return (
    <div className="container mx-auto">
      <div className="mt-12 flex flex-col items-center space-y-6">
        <h1 className="text-2xl text-center">SoundChain</h1>
        <main className="text-center flex">
          <h1>Welcome to Soundchain!</h1>
          <p>
            {success ? (
              <>
                Verification complete! You can now proceed to login.
                <br />
                <Link href="/login">
                  <a>Login</a>
                </Link>
              </>
            ) : (
              <>
                Verification Failed!
                <br />
                <Link href="/">
                  <a>Home</a>
                </Link>
              </>
            )}
          </p>
        </main>
      </div>
    </div>
  );
}

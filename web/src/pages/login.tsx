import { LockedLayout } from 'components/LockedLayout';
import { LoginForm } from 'components/LoginForm';
import { LoginNavBar } from 'components/LoginNavBar';
import { cacheFor } from 'lib/apollo';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = async context => {
  return cacheFor(LoginPage, {}, context);
};

export default function LoginPage() {
  return (
    <LockedLayout>
      <Head>
        <title>Soundchain - Login</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LoginNavBar />
      <LoginForm />
    </LockedLayout>
  );
}

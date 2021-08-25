import { AuthLayout } from 'components/AuthLayout';
import { LoginForm } from 'components/LoginForm';
import { cacheFor } from 'lib/apollo';
import { GetServerSideProps } from 'next';
import Head from 'next/head';

export const getServerSideProps: GetServerSideProps = context => {
  return cacheFor(LoginPage, {}, context);
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <Head>
        <title>Soundchain - Login</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LoginForm />
    </AuthLayout>
  );
}

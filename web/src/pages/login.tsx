import { AuthLayout } from 'components/AuthLayout';
import { LoginForm } from 'components/LoginForm';
import Head from 'next/head';

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

import { LockedLayout } from 'components/LockedLayout';
import { LoginForm } from 'components/LoginForm';
import { LoginNavBar } from 'components/LoginNavBar';
import Head from 'next/head';

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

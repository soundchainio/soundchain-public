import { AuthLayout } from 'components/AuthLayout';
import { BackButton } from 'components/Buttons/BackButton';
import { LoginForm } from 'components/LoginForm';
import { TopNavBarProps } from 'components/TopNavBar';
import Head from 'next/head';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  showLoginSignUpButton: false,
};
export default function LoginPage() {
  return (
    <AuthLayout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Login</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicons/favicon.ico" />
      </Head>
      <LoginForm />
    </AuthLayout>
  );
}

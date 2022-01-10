import { AuthLayout } from 'components/AuthLayout';
import { BackButton } from 'components/Buttons/BackButton';
import { LoginForm } from 'components/LoginForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  showLoginSignUpButton: false,
};
export default function LoginPage() {
  return (
    <AuthLayout topNavBarProps={topNavBarProps}>
      <SEO title="Soundchain - Login" description="Log in to Soundchain" canonicalUrl="/login/" />
      <LoginForm />
    </AuthLayout>
  );
}

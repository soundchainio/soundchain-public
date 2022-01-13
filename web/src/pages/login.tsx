import { AuthLayout } from 'components/AuthLayout';
import { LoginForm } from 'components/LoginForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';

const topNavBarProps: TopNavBarProps = {
  isLogin: true,
};
export default function LoginPage() {
  return (
    <AuthLayout topNavBarProps={topNavBarProps}>
      <SEO title="Soundchain - Login" description="Log in to Soundchain" canonicalUrl="/login/" />
      <LoginForm />
    </AuthLayout>
  );
}

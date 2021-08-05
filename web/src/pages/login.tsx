import { LockedLayout } from 'components/LockedLayout';
import { LoginForm } from 'components/LoginForm';
import { LoginNavBar } from 'components/LoginNavBar';

export default function LoginPage() {
  return (
    <LockedLayout>
      <LoginNavBar />
      <LoginForm />
    </LockedLayout>
  );
}

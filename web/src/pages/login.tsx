import { LockedLayout } from 'components/LockedLayout';
import { LoginForm } from 'components/LoginForm';
import Image from 'next/image';
import Logo from '../../public/soundchain-logo.svg';

export default function LoginPage() {
  return (
    <LockedLayout>
      <div className="mx-auto h-28 w-auto relative">
        <Image src={Logo} alt="Soundchain Logo" layout="fill" />
      </div>
      <LoginForm />
    </LockedLayout>
  );
}

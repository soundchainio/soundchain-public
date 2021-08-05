import { LockedLayout } from 'components/LockedLayout';
import { LoginForm } from 'components/LoginForm';
import { LoginNavBar } from 'components/LoginNavBar';
import Image from 'next/image';
import Logo from '../../public/soundchain-logo.svg';

export default function LoginPage() {
  return (
    <LockedLayout>
      <LoginNavBar />
      <div className="my-12">
        <div className="mx-auto h-28 w-auto relative">
          <Image src={Logo} alt="Soundchain Logo" layout="fill" />
        </div>
      </div>
      <LoginForm />
    </LockedLayout>
  );
}

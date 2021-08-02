import Button from 'components/Button';
import Link from 'components/Link';
import { RegisterForm } from 'components/RegisterForm';
import useMe from 'hooks/useMe';
import { useRouter } from 'next/dist/client/router';
import { useEffect } from 'react';

export default function SignUpPage() {
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/complete-profile');
    }
  }, [me, router]);

  return (
    <div className="container mx-auto">
      <div className="mt-6 md:mt-12 flex flex-col items-center space-y-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <Link buttonVariant="outlined" href="/login">
            Login
          </Link>
          <Button>Create Account</Button>
        </div>
        <h1 className="text-2xl">Create your account</h1>
        <RegisterForm />
      </div>
    </div>
  );
}

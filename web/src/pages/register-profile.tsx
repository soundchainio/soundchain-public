import { useRouter } from 'next/dist/client/router';
import { useEffect } from 'react';
import { RegisterForm } from '../components/RegisterForm';
import useMe from '../hooks/useMe';
import Link from 'next/link';

export default function RegisterProfilePage() {
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  return (
    <div className="container mx-auto">
      <div className="mt-6 md:mt-12 flex flex-col items-center space-y-6 mb-6">
        <div className="grid grid-cols-2 gap-6">
          <Link href="/login" passHref>
            <button className="border-2 p-3">Login</button>
          </Link>
          <button className="p-3 bg-black text-white">Create Account</button>
        </div>
        <h1 className="text-2xl">Create your account</h1>
        <RegisterForm />
      </div>
    </div>
  );
}

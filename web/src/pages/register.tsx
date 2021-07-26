import { useRouter } from 'next/dist/client/router';
import { useEffect } from 'react';
import { RegisterForm } from '../components/RegisterForm';
import useMe from '../hooks/useMe';

export default function SignUpPage() {
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  const onRegister = () => {
    router.push(router.query.callbackUrl?.toString() ?? '/');
  };

  return (
    <div className="container mx-auto">
      <div className="mt-12 flex flex-col items-center space-y-6">
        <div className="grid grid-cols-2 gap-6"></div>
        <h1 className="text-2xl">Create your account</h1>
        <RegisterForm onRegister={onRegister} />
      </div>
    </div>
  );
}

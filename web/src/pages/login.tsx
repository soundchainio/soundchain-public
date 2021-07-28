import { LoginForm } from '../components/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="container mx-auto">
      <div className="mt-6 md:mt-12 flex flex-col items-center space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <button className="p-3 bg-black text-white ">Login</button>
          <Link href="/register" passHref>
            <button className="border-2 p-3">Create Account</button>
          </Link>
        </div>
        <h1 className="text-2xl">SoundChain</h1>
        <LoginForm />
      </div>
    </div>
  );
}

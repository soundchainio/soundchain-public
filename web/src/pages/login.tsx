import Button from 'components/Button';
import Link from 'components/Link';
import { LoginForm } from 'components/LoginForm';

export default function LoginPage() {
  return (
    <div className="container mx-auto">
      <div className="mt-6 md:mt-12 flex flex-col items-center space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <Button>Login</Button>
          <Link buttonVariant="outlined" href="/register">
            Create Account
          </Link>
        </div>
        <h1 className="text-2xl">SoundChain</h1>
        <LoginForm />
      </div>
    </div>
  );
}

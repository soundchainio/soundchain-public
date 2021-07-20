import LoginForm from '../components/login-form';

export default function LoginPage() {
  return (
    <div className="container mx-auto">
      <div className="mt-12 flex flex-col items-center space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <button className="border-2 p-3">Login</button>
          <button className="p-3 bg-black text-white">Create Account</button>
        </div>
        <h1 className="text-2xl">SoundChain</h1>
        <LoginForm />
      </div>
    </div>
  );
}

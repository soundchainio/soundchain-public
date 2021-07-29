import Link from 'next/link';
import { ProfileForm } from '../components/ProfileForm';

export default function CompleteProfilePage() {
  return (
    <div className="container mx-auto">
      <div className="mt-6 md:mt-12 flex flex-col items-center space-y-6 mb-6">
        <div className="grid grid-cols-1 gap-6">
          <Link href="/" passHref>
            <button className="border-2 p-3">Skip</button>
          </Link>
        </div>
        <h1 className="text-2xl">Profile information</h1>
        <ProfileForm />
      </div>
    </div>
  );
}

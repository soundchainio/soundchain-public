import Image from 'next/image';
import Logo from '../../public/soundchain-logo.svg';

export const LockedLayout: React.FC = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col sm:justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md py-8 px-4 sm:px-10 space-y-8">
        <div className="mx-auto h-28 w-auto relative">
          <Image src={Logo} alt="Soundchain Logo" layout="fill" />
        </div>
        {children}
      </div>
    </div>
  );
};

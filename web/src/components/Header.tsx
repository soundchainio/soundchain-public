import { Logo } from 'icons/Logo';
import { useRouter } from 'next/router';
import { Button } from './Button';

export const Header = () => {
  const router = useRouter();

  return (
    <header className="h-20">
      <div className="w-full h-20 my-0 flex items-center justify-between px-6 pt-4 lg:px-10">
        <div className='flex items-center'>
          <Logo className="h-[50px]" />
          <span className="text-white font-extrabold hidden md:block">SoundChain</span>
        </div>
        <Button className='h-12 w-96' variant="rainbow" onClick={() => router.push('/marketplace')}>
            ENTER SOUNDCHAIN
          </Button>
      </div>
    </header>
  );
};

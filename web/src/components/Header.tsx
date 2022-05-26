import { Logo } from 'icons/Logo';
import { useRouter } from 'next/router';
import { Button } from './Button';

interface NavItemProps {
  text: string;
  currentPage: string;
}

export const NavItem = ({text, currentPage}: NavItemProps) => {

  const underline = (currentPage.toLowerCase() === text.toLowerCase() ?
  "" : "") 

  return <div className={'flex justify-center items-center p-2' + underline}>
    {text}
  </div>
}

export const Header = () => {
  const router = useRouter();

  return (
    <header className="h-20">
      <div className="w-full h-20 my-0 flex items-center justify-between px-6 pt-4 lg:px-10">
        <div className='flex items-center'>
          <Logo className="h-[50px]" />
          <span className="text-white font-extrabold hidden md:block">SoundChain</span>
        </div>
        <nav className='text-white flex gap-3 justify-evenly items-center'>
          <Button className='h-12 w-96' variant="rainbow" onClick={() => router.push('/marketplace')}>
            CONTINUE TO SOUNDCHAIN
          </Button>
          </nav>
      </div>
    </header>
  );
};

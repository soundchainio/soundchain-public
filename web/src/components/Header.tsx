import { Logo } from 'icons/Logo';
import { useRouter } from 'next/router';
import { Button } from './Button';

interface NavItemProps {
  text: string;
  currentPage: string;
}

export const NavItem = ({ text }: NavItemProps) => {
  const router = useRouter();
  const currentPage = router.pathname.replace("/", "");
  const underline = currentPage.toLowerCase() === text.toLowerCase();

  return underline ? 
    (<div className="flex flex-col items-center">
        <div 
          className='flex items-center justify-center p-2'>{text}
        </div>
      <div className="bg-green-blue-gradient w-5/6 pb-1"/>
    </div>)
    :
    (<a href={"/" + text.toLowerCase()}>
      <div className='flex items-center justify-center p-2'>{text}</div>
     </a>)
};

export const Header = () => {
  const router = useRouter();

  return (
    <header className="h-20">
      <div className="my-0 flex h-20 w-full items-center justify-between px-6 pt-4 lg:px-10">
        <div className="flex items-center">
          <Logo className="h-[50px]" />
          <span className="hidden font-extrabold text-white md:block">SoundChain</span>
        </div>
        <nav className="flex items-center justify-evenly gap-3 text-white">
          <NavItem text="Tokenomics" />
          <NavItem text="Airdrop" />
          <NavItem text="Stake" />
          <Button className="h-12 w-96" variant="rainbow" onClick={() => router.push('/marketplace')}>
            CONTINUE TO SOUNDCHAIN
          </Button>
        </nav>
      </div>
    </header>
  );
};

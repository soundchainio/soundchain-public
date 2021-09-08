import { LeftArrow } from 'icons/LeftArrow';
import { useRouter } from 'next/router';
import { TopNavBarButton } from '../TopNavBarButton';

interface BackButtonProps {
  path?: string;
  scroll?: boolean;
}

export const BackButton = ({ path, scroll }: BackButtonProps) => {
  const router = useRouter();

  const onClick = () => {
    path ? router.push(path, undefined, { scroll }) : router.back();
  };

  return <TopNavBarButton onClick={onClick} label="Back" icon={LeftArrow} />;
};

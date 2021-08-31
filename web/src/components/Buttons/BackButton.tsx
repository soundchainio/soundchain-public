import { LeftArrow } from 'icons/LeftArrow';
import { useRouter } from 'next/router';
import { TopNavBarButton } from '../TopNavBarButton';

export const BackButton = () => {
  const router = useRouter();

  const onClick = () => {
    router.back();
  };

  return <TopNavBarButton onClick={onClick} label="Back" icon={LeftArrow} />;
};

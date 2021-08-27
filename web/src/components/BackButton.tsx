import { LeftArrow } from 'icons/LeftArrow';
import { useRouter } from 'next/router';
import { Label } from './Label';

export const BackButton = () => {
  const router = useRouter();

  const onClick = () => {
    router.back();
  };

  return (
    <div className="flex flex-col items-center" onClick={onClick}>
      <LeftArrow />
      <Label small className="pt-1">
        Back
      </Label>
    </div>
  );
};

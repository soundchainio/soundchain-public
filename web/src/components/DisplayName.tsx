import { Verified } from 'icons/Verified';

interface DisplayNameProps {
  name: string
  verified?: boolean | null
}

export const DisplayName = ({ name, verified, ...props }: DisplayNameProps) => {
  return (
    <a {...props} className="text-white font-semibold flex items-center">
      {name} {verified && <Verified className="ml-2" />}
    </a>
  );
};

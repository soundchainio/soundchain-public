import classNames from 'classnames';
import Image from 'next/image';
import ProfilePic from '../../public/profile.jpg';

interface AvatarProps extends React.ComponentPropsWithoutRef<'div'> {
  src?: string | null;
}

export const Avatar = ({ className, src }: AvatarProps) => {
  return (
    <div className={classNames('rounded-full w-8 h-8 border overflow-hidden relative', className)}>
      {src ? (
        <Image alt="Profile picture" src={src} layout="fill" objectFit="contain" />
      ) : (
        <Image alt="Profile picture" src={ProfilePic} />
      )}
    </div>
  );
};

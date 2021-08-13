import classNames from 'classnames';
import Image from 'next/image';
import ProfilePic from '../../public/profile.jpg';

export const Avatar = ({ className }: React.ComponentPropsWithoutRef<'div'>) => {
  return (
    <div className={classNames('rounded-full w-8 h-8 border overflow-hidden', className)}>
      <Image alt="Profile picture" src={ProfilePic} />
    </div>
  );
};

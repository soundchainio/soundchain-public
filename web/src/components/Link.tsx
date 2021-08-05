import classNames from 'classnames';
import NextLink from 'next/link';
import { buttonClassesByVariant, ButtonVariant } from './Button';

export interface LinkProps extends React.ComponentPropsWithoutRef<'a'> {
  href: string;
  buttonVariant?: ButtonVariant;
}

export default function Link({ className, buttonVariant, href, ...rest }: LinkProps) {
  const anchorProps = {
    className: classNames(
      className,
      buttonVariant ? buttonClassesByVariant[buttonVariant] : 'text-green-500 hover:underline',
    ),
    ...rest,
  };

  return (
    <NextLink href={href}>
      <a {...anchorProps} />
    </NextLink>
  );
}

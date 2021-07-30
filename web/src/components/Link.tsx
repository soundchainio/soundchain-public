import classNames from 'classnames';
import NextLink from 'next/link';
import { buttonClassesByVariant, ButtonVariant } from './Button';

export interface LinkProps extends React.ComponentPropsWithoutRef<'a'> {
  buttonVariant?: ButtonVariant;
}

export default function Link({ className, buttonVariant, href, ...rest }: LinkProps) {
  const anchorProps = {
    className: classNames(
      className,
      buttonVariant ? buttonClassesByVariant[buttonVariant] : 'text-blue-500 hover:underline',
    ),
    ...rest,
  };

  if (href?.startsWith('/')) {
    <NextLink href={href}>
      <a {...anchorProps} />
    </NextLink>;
  }

  return <a href={href} {...anchorProps} />;
}

import classNames from 'classnames';
import NextLink from 'next/link';

export interface LinkProps extends React.ComponentPropsWithoutRef<'a'> {
  href: string;
}

export default function Link({ className, href, ...rest }: LinkProps) {
  const anchorProps = {
    className: classNames('text-gray-400 font-medium underline', className),
    ...rest,
  };

  return (
    <NextLink href={href}>
      <a {...anchorProps} />
    </NextLink>
  );
}

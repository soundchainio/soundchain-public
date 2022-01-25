import classNames from 'classnames';
import { Close } from 'icons/Close';
import React from 'react';

interface ExtendedProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

type ButtonProps = React.ComponentPropsWithoutRef<'button'>;
type SpanProps = React.ComponentPropsWithoutRef<'span'>;
type BadgeProps = (ButtonProps | SpanProps) & ExtendedProps;

export const Badge = ({ label, selected, onClick, className, onDelete, ...rest }: BadgeProps) => {
  const Wrapper = onClick ? 'button' : 'span';

  return (
    <Wrapper
      className={classNames(
        className,
        'inline-flex items-center px-4 py-1 rounded-full text-xs',
        onClick ? 'cursor-pointer' : 'font-black',
        selected ? 'bg-white text-gray-light font-black' : 'bg-gray-30 text-white',
      )}
      type={Wrapper === 'button' ? 'button' : undefined}
      onClick={onClick}
      {...rest}
    >
      {label}
      {onDelete && (
        <button
          aria-label={`Remove tag ${label}`}
          className="ml-2 relative after:absolute after:-inset-2" //pseudo-element with absolute positioning and a negative inset value increases the touchable area for a better mobile UX
          onClick={onDelete}
        >
          <Close />
        </button>
      )}
    </Wrapper>
  );
};

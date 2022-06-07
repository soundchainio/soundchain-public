import React, { ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';

type TwElement<T> = React.FC<T>

type TwinderMorphComponent<T> = (component: React.FC<T>) => React.FC<T>;

interface TwinderUtils<T> {
  as: TwinderMorphComponent<T>;
  classes: string;
}

type TwinderFn<T> = (additionalClassname: string) => Twinder<T>

type Twinder<T> = Record<keyof JSX.IntrinsicElements, TwElement<T>> & TwinderUtils<T> & TwinderFn<T>

interface TwProps {
  className?: string;
  children?: ReactNode;

  [key: string]: string | number | boolean | Record<string, unknown> | ReactNode | undefined | null;
}

export function twd<T extends TwProps = TwProps>(className: string): Twinder<T> {
  const twdFn: TwinderFn<T> = (...additionalClassNames: string[]) =>
    twd(twMerge(
      className,
      ...additionalClassNames,
    ));

  return new Proxy(twdFn, {
    get(target, key: string) {
      if (key === 'as') {
        return ((Component) => {
          const twComponent: React.FC<T> = (props: T) => {


            return (
              <Component
                {...props}
                className={twMerge(className, props?.className || '')}
              />
            );
          };

          twComponent.displayName = 'TwComponent';

          return twComponent;
        }) as TwinderMorphComponent<T>;
      }

      if (key === 'classes') {
        return className;
      }

      return (props => {
        return React.createElement(key as string, {
          ...props,
          className: twMerge(props?.className || '', className),
        });
      }) as TwElement<T>;
    },
  }) as Twinder<T>;
}
import classNames from 'classnames';
import 'emoji-mart/css/emoji-mart.css';
import { default as React, ReactNode } from 'react';
import { ModalsPortal } from './ModalsPortal';

interface ModalProps {
  show: boolean;
  children: ReactNode;
  title: string;
  leftButton?: JSX.Element;
  rightButton?: JSX.Element;
}

const baseClasses =
  'fixed top-0  w-screen bottom-0 duration-500 bg-opacity-75 ease-in-out bg-gray-25 transform-gpu transform';

export const Modal = ({ show, children, title, leftButton, rightButton }: ModalProps) => {
  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': show,
          'translate-y-full opacity-0': !show,
        })}
      >
        <div className="mt-16">
          <div className="flex h-16 items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
            <div className="flex-1">{leftButton}</div>
            <div className="flex-1 text-center text-white font-bold">{title}</div>
            <div className="flex-1 ">{rightButton}</div>
          </div>
        </div>
        {children}
      </div>
    </ModalsPortal>
  );
};

import classNames from 'classnames';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';
import { UnderDevelopment } from 'icons/UnderDevelopment';
import { ModalsPortal } from './ModalsPortal';

const baseClasses =
  'fixed w-screen h-full bottom-0 duration-500 bg-opacity-75 ease-in-out bg-black transform-gpu transform';

export const UnderDevelopmentModal = () => {
  const { showUnderDevelopment } = useModalState();
  const { dispatchShowUnderDevelopmentModal } = useModalDispatch();

  const onOutsideClick = () => {
    dispatchShowUnderDevelopmentModal(false);
  };

  return (
    <ModalsPortal>
      <div
        className={classNames(baseClasses, {
          'translate-y-0 opacity-100': showUnderDevelopment,
          'translate-y-full opacity-0': !showUnderDevelopment,
        })}
      >
        <div className="flex flex-col h-full">
          <div className="flex-1" onClick={onOutsideClick}></div>
          <div className="text-white p-4 flex flex-col items-center bg-gray-30 rounded-tl-3xl rounded-tr-3xl">
            <div className="py-6">This feature is still under development.</div>
            <div className="py-4 pb-10">
              <UnderDevelopment />
            </div>
          </div>
        </div>
      </div>
    </ModalsPortal>
  );
};

import { useModalState } from 'contexts/providers/modal';

export const CheckBodyScroll = () => {
  const { anyModalOpened } = useModalState();

  return anyModalOpened ? (
    <style jsx global>{`
      // body {
      //   overflow: hidden;
      // }
    `}</style>
  ) : null;
};

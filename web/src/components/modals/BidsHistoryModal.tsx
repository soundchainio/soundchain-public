import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';

export const BidsHistoryModal = () => {
  const { showBidsHistory } = useModalState();
  const { dispatchShowBidsHistory } = useModalDispatch();

  const handleClose = () => {
    dispatchShowBidsHistory(false);
  };

  return (
    <Modal
      show={showBidsHistory}
      title={'Bid History'}
      onClose={() => handleClose}
      leftButton={
        <button className="p-2 ml-3 text-gray-400 font-bold flex-1 text-center text-sm" onClick={handleClose}>
          Cancel
        </button>
      }
    >
      <div></div>
    </Modal>
  );
};

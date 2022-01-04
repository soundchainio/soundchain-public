import { Modal } from 'components/Modal';
import { useModalDispatch, useModalState } from 'contexts/providers/modal';

export const BidsHistoryModal = () => {
  const { showBidsHistory } = useModalState();
  const { dispatchShowBidsHistory } = useModalDispatch();

  const handleClose = () => {
    dispatchShowBidsHistory(false);
  };

  return (
    <Modal show={showBidsHistory} title={'Filter'} onClose={() => handleClose}>
      <div></div>
    </Modal>
  );
};

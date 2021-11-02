import { Dialog } from "@reach/dialog";

interface DenyReasonModalProps {
  requestId: string
  showReason: boolean
  setShowReason: (val: boolean) => void
}

export const DenyReasonModal = ({ requestId, showReason, setShowReason }: DenyReasonModalProps) => {
  const close = () => setShowReason(false);

  return (
    <Dialog isOpen={showReason} onDismiss={close}>
      <button className="close-button" onClick={close}>
        <span aria-hidden>×</span>
      </button>
      <p>Hello there. I am a dialog- requestid: {requestId}</p>
    </Dialog>
  );
}
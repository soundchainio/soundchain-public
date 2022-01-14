import { Button } from 'components/Button';

interface ConfirmationDialogProps {
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  showDialog: boolean;
  setShowDialog: (val: boolean) => void;
}

export const ConfirmationDialog = ({
  onConfirm,
  confirmText,
  cancelText,
  title,
  description,
  showDialog,
  setShowDialog,
}: ConfirmationDialogProps) => {
  const close = () => setShowDialog(false);

  return (
    <>
      {showDialog && (
        <div className="fixed inset-0 p-4 bg-black z-50 bg-opacity-50 overflow-y-auto h-full w-full m-0">
          <div className="relative top-20 mx-auto p-5 shadow-lg rounded-md bg-gray-30">
            <div className="mt-3 text-center">
              <h3 className="text-lg leading-6 font-medium text-white">{title}</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-300">{description}</p>
              </div>
              <div className="items-center px-4 py-3">
                <Button variant="approve" onClick={() => onConfirm()}>
                  {confirmText}
                </Button>
              </div>
              <div className="items-center px-4 py-3">
                <Button variant="cancel" onClick={close}>
                  {cancelText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

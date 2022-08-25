import { Button } from 'components/Button'

interface ConfirmationDialogProps {
  onConfirm: () => void
  title: string
  description: string
  confirmText: string
  cancelText: string
  showDialog: boolean
  setShowDialog: (val: boolean) => void
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
  const close = () => setShowDialog(false)

  return (
    <>
      {showDialog && (
        <div className="fixed inset-0 z-50 m-0 h-full w-full overflow-y-auto bg-black bg-opacity-50 p-4">
          <div className="relative top-20 mx-auto rounded-md bg-gray-30 p-5 shadow-lg">
            <div className="mt-3 text-center">
              <h3 className="text-lg font-medium leading-6 text-white">{title}</h3>
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
  )
}

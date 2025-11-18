import { InputField } from 'components/InputField'
import { Matic } from 'components/Matic'
import { Modal } from 'components/Modal'
import { useModalDispatch, useModalState } from 'contexts/ModalContext'
import { Form, Formik } from 'formik'
import useBlockchainV2 from 'hooks/useBlockchainV2'
import { useMagicContext } from 'hooks/useMagicContext'
import { useMaxGasFee } from 'hooks/useMaxGasFee'
import { useMe } from 'hooks/useMe'
import { DefaultWallet } from 'lib/graphql'
import router from 'next/router'
import { authenticator } from 'otplib'
import { useState } from 'react'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { Button } from './common/Buttons/Button'
import { ConnectedNetwork } from './ConnectedNetwork'
import { CopyWalletAddress } from './CopyWalletAddress'
import { Label } from './Label'
import MaxGasFee from './MaxGasFee'
import { WalletSelected } from './WalletSelected'

interface FormValues {
  token: string
}

export const TransferConfirmationModal = () => {
  const me = useMe()
  const { showTransferConfirmation, walletRecipient, amountToTransfer } = useModalState()
  const { dispatchShowTransferConfirmationModal } = useModalDispatch()
  const [loading, setLoading] = useState(false)
  const { sendMatic } = useBlockchainV2()
  const { web3, account, balance, refetchBalance } = useMagicContext()

  const maxGasFee = useMaxGasFee(showTransferConfirmation)

  const handleClose = () => {
    dispatchShowTransferConfirmationModal(false)
  }

  const handleCancel = () => {
    handleClose()
  }

  const initialValues = {
    token: '',
  }

  const validationSchema = yup.object().shape({
    token: me?.otpSecret ? yup.string().required('Two-Factor token is required') : yup.string(),
  })

  const hasEnoughFunds = () => {
    if (balance && maxGasFee && amountToTransfer) {
      return +balance > +maxGasFee + +amountToTransfer
    }
    return false
  }

  const handleSubmit = ({ token }: FormValues) => {
    if (token) {
      const isValid = authenticator.verify({ token, secret: me?.otpSecret || '' })
      if (!isValid) {
        toast.error('Invalid token code')
        return
      }
    }

    if (hasEnoughFunds() && web3 && refetchBalance) {
      setLoading(true)
      const onReceipt = () => {
        toast.success('Transaction completed!')
        setLoading(false)
        handleClose()
        refetchBalance()
        router.push('/wallet')
      }
      if (account && walletRecipient && amountToTransfer) {
        sendMatic(walletRecipient, account, amountToTransfer)
          .onReceipt(onReceipt)
          .onError(() => toast.error('We had some trouble, please try again later!'))
          .finally(() => setLoading(false))
          .execute(web3)
      }
    } else {
      toast.error(
        "Uh-oh, it seems you don't have enough funds for this transaction. Please select an appropriate amount",
      )
      handleClose()
    }
  }

  return (
    <Modal
      show={showTransferConfirmation}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <button className="flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleCancel}>
          Cancel
        </button>
      }
    >
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex h-full w-full flex-col justify-between" autoComplete="off" placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
          <div className="mb-auto flex h-full flex-col justify-between">
            <div className="flex h-full flex-col justify-around">
              <div className="px-4 text-center text-sm font-bold text-gray-80">
                <p className="text-center">Are you sure you want to send</p>
                <span className="flex items-center justify-center">
                  <Matic value={amountToTransfer} />
                  <span>?</span>
                </span>
                <p className="pt-6">This transaction cannot be undone.</p>
              </div>
              {me?.otpSecret && (
                <InputField
                  label="Two-Factor token"
                  name="token"
                  type="text"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              )}
              <div className="flex flex-col space-y-6 py-6">
                <div className="space-y-2">
                  <div className="px-4">
                    <Label className="font-bold uppercase" textSize="xs">
                      FROM:
                    </Label>
                  </div>
                  <div className="flex flex-col items-center gap-2 px-3">
                    <WalletSelected wallet={DefaultWallet.Soundchain} />
                    <ConnectedNetwork />
                  </div>
                  {account && <CopyWalletAddress walletAddress={account} />}
                </div>
                <div className="space-y-2">
                  <div className="px-4">
                    <Label className="font-bold uppercase" textSize="xs">
                      TO:
                    </Label>
                  </div>
                  {walletRecipient && <CopyWalletAddress walletAddress={walletRecipient} />}
                </div>
              </div>
              <div className="flex flex-col bg-gray-20">
                <div className="flex flex-col p-4">
                  <MaxGasFee />
                </div>
                <div className="flex p-4">
                  <div className="flex flex-1 items-center justify-start text-xs font-bold uppercase text-gray-CC">
                    Total
                  </div>
                  <Matic value={Number(maxGasFee || '0') + Number(amountToTransfer || '0')} variant="currency-inline" />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Button type="submit" loading={loading}>
              Confirm Transaction
            </Button>
          </div>
        </Form>
      </Formik>
    </Modal>
  )
}

export default TransferConfirmationModal

import { InputField } from 'components/InputField';
import { Modal } from 'components/Modal';
import { Ogun } from 'components/Ogun';
import { useModalDispatch, useModalState } from 'contexts/ModalContext';
import { Form, Formik } from 'formik';
import useBlockchainV2 from 'hooks/useBlockchainV2';
import { useMaxGasFee } from 'hooks/useMaxGasFee';
import { useMe } from 'hooks/useMe';
import { useWalletContext } from 'hooks/useWalletContext';
import { useMagicContext } from 'hooks/useMagicContext';
import { DefaultWallet } from 'lib/graphql';
import router from 'next/router';
import { authenticator } from 'otplib';
import { useState } from 'react';
import { toast } from 'react-toastify';
import * as yup from 'yup';
import { Button } from './common/Buttons/Button';
import { ConnectedNetwork } from './ConnectedNetwork';
import { CopyWalletAddress } from './CopyWalletAddress';
import { Label } from './Label';
import MaxGasFee from './MaxGasFee';
import { WalletSelected } from './WalletSelected';
import Web3 from 'web3';

interface FormValues {
  token: string;
}

export const TransferOgunConfirmationModal = () => {
  const me = useMe();
  const { showOgunTransferConfirmation, walletRecipient, amountToTransfer } = useModalState();
  const { dispatchShowOgunTransferConfirmationModal } = useModalDispatch();
  const [loading, setLoading] = useState(false);
  const { sendOgun } = useBlockchainV2();
  const { web3, account, balance, OGUNBalance, refetchBalance } = useWalletContext();
  const { isLoggedIn } = useMagicContext();
  const maxGasFee = useMaxGasFee(showOgunTransferConfirmation);

  const handleClose = () => {
    dispatchShowOgunTransferConfirmationModal(false);
  };

  const handleCancel = () => {
    handleClose();
  };

  const initialValues = {
    token: '',
  };

  const validationSchema = yup.object().shape({
    token: (me as any)?.otpSecret ? yup.string().required('Two-Factor token is required') : yup.string(),
  });

  const hasEnoughFunds = () => {
    if (balance && maxGasFee && amountToTransfer && OGUNBalance) {
      return +balance > +maxGasFee && +OGUNBalance >= +amountToTransfer;
    }
    return false;
  };

  const validateAddress = (address: string) => {
    return Web3.utils.isAddress(address);
  };

  const handleSubmit = async ({ token }: FormValues) => {
    if (!isLoggedIn) {
      toast.error('Please log in to proceed');
      return;
    }

    if (token && (me as any)?.otpSecret) {
      const isValid = authenticator.verify({ token, secret: (me as any).otpSecret });
      if (!isValid) {
        toast.error('Invalid token code');
        return;
      }
    }

    if (!validateAddress(walletRecipient || '')) {
      toast.error('Invalid recipient address');
      return;
    }

    if (hasEnoughFunds() && web3 && refetchBalance && account && walletRecipient && amountToTransfer) {
      setLoading(true);
      try {
        await sendOgun(walletRecipient, account, amountToTransfer)
          .onReceipt(() => {
            toast.success('Transaction completed!');
            handleClose();
            refetchBalance();
            router.push('/wallet');
          })
          .onError(() => toast.error('We had some trouble, please try again later!'))
          .finally(() => setLoading(false))
          .execute(web3);
      } catch (e) {
        toast.error('Transaction failed');
        setLoading(false);
      }
    } else {
      toast.error("Uh-oh, it seems you don't have enough funds for this transaction.");
      handleClose();
    }
  };

  return (
    <Modal
      show={showOgunTransferConfirmation}
      title="Confirm Transaction"
      onClose={handleClose}
      leftButton={
        <button className="flex-1 p-2 text-center text-sm font-bold text-gray-400" onClick={handleCancel}>
          Cancel
        </button>
      }
    >
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex h-full w-full flex-col justify-between" autoComplete="off">
          <div className="mb-auto flex h-full flex-col justify-between">
            <div className="flex h-full flex-col justify-around">
              <div className="px-4 text-center text-sm font-bold text-gray-80">
                <p className="text-center">Are you sure you want to send</p>
                <span className="flex items-center justify-center">
                  <Ogun value={amountToTransfer} />
                  <span>?</span>
                </span>
                <p className="pt-6">This transaction cannot be undone.</p>
              </div>
              {(me as any)?.otpSecret && (
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
                  <Ogun value={Number(amountToTransfer || '0')} />
                </div>
              </div>
            </div>
          </div>
          <div>
            <Button type="submit" loading={loading} disabled={!isLoggedIn}>
              Confirm Transaction
            </Button>
          </div>
        </Form>
      </Formik>
    </Modal>
  );
};

export default TransferOgunConfirmationModal;

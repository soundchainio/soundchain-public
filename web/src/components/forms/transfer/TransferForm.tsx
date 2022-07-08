import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Matic } from 'components/Matic';
import { Form, Formik } from 'formik';
import useBlockchain, { gas } from 'hooks/useBlockchain';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { Matic as MaticIcon } from 'icons/Matic';
import { useEffect, useState } from 'react';
import * as yup from 'yup';

export interface FormValues {
  recipient: string;
  amount: string;
  gasPrice?: string;
  gasLimit?: number;
  totalGasFee?: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  recipient: yup.string().required('Please enter a valid wallet address'),
  amount: yup.string().required('Please enter a matic amount'),
  gasPrice: yup.string().default(''),
  gasLimit: yup.number().default(gas),
  totalGasFee: yup.string().default('0'),
});

export type InitialValues = Partial<FormValues>;

interface Props {
  initialValues?: InitialValues;
  handleSubmit: (values: FormValues) => void;
}

export const TransferForm = ({ handleSubmit }: Props) => {
  const me = useMe();
  const { web3, balance } = useMagicContext();
  const { getCurrentGasPrice } = useBlockchain();
  const [gasPrice, setGasPrice] = useState<string>('');

  useEffect(() => {
    const gasCheck = () => {
      if (web3) {
        getCurrentGasPrice(web3).then(price => setGasPrice(price));
      }
    };
    gasCheck();
  }, [web3, getCurrentGasPrice]);

  if (!me) return null;

  const defaultValues: FormValues = {
    recipient: '',
    amount: '',
    gasPrice: gasPrice,
    gasLimit: gas,
  };

  return (
    <Formik<FormValues>
      initialValues={defaultValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
    >
      <Form className="flex flex-col w-full h-full justify-between" autoComplete="off">
        <div className="flex flex-col mb-auto space-y-6 p-5 h-full justify-between">
          <div className="flex flex-col justify-between space-y-8">
            <div className="space-y-2">
              <span className="text-gray-80 text-sm font-bold">Please enter recipient wallet address:</span>
              <InputField
                type="text"
                label="wallet address"
                name="recipient"
                placeholder="0xDbaF8fB344D9E57fff48659A4Eb718c480A1Fd62"
              />
            </div>
            <div className="space-y-2">
              <span className="text-gray-80 text-sm uppercase font-bold">Amount to send:</span>
              <InputField
                type="number"
                name="amount"
                placeholder="00.00"
                min="0"
                step="0.000000000000000001"
                icon={MaticIcon}
              />
            </div>
            <div>
              <div className="space-y-3">
                <span className="text-gray-80 text-sm uppercase font-bold">Estimated Gas Fee: </span>
                <div className="flex space-x-4">
                  <div className="space-y-1">
                    <InputField type="text" label="gas price" name="gasPrice" value={gasPrice} disabled />
                  </div>
                  <div className="space-y-1">
                    <InputField type="text" label="gas limit" name="gasLimit" value={gas} disabled />
                  </div>
                </div>
              </div>
              <div className="space-y-3 flex self-end items-end content-end">
                <p className="py-6 text-xs text-gray-80 text-left">
                  Gas fees are paid to crypto miners who process transactions on the Polygon network. SoundChain does
                  not profit from gas fees. <br />
                  <br />
                  Gas fees are set by the network and fluctuate based on network traffic and transaction complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex bg-black justify-between p-5">
          <Matic value={balance} variant="currency" />
          <div className="w-6/12">
            <Button className="p-1" type="submit" variant="orange">
              SEND TOKENS
            </Button>
          </div>
        </div>
      </Form>
    </Formik>
  );
};

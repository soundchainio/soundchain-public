import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';
import { useMe } from 'hooks/useMe';
import { useModalDispatch } from 'contexts/providers/modal';
import { Layout } from 'components/Layout';
import Head from 'next/head';
import { useMagicContext } from 'hooks/useMagicContext';
import { Button } from 'components/Button';
import { Form, Formik } from 'formik';
import { Label } from 'components/Label';
import { InputField } from 'components/InputField';
import { Matic } from 'icons/Matic';
import * as yup from 'yup';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Send Tokens'
};

export default function TransferPage() {
  const me = useMe();
  const { account, balance } = useMagicContext();
  const { dispatchShowTransferConfirmationModal } = useModalDispatch();

  if (!me) return null;

  interface FormValues {
    recipient: string;
    amount: string;
    gasPrice: string,
    gasLimit: number,
  }
  
  const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
    recipient: yup.string().required('Please enter a valid wallet address'),
    amount: yup.string().required('Please enter a matic amount'),
    gasPrice: yup.string().default(() => '3.0'),
    gasLimit: yup.number().default(() => 21000)
  });

  const initialValues = {
    recipient: '',
    amount: '',
    gasPrice: '3.0',
    gasLimit: '21000',
  };
  
  const handleSubmit = () => {
    dispatchShowTransferConfirmationModal(true)
  }

  return (
    <Layout topNavBarProps={topNovaBarProps} fullHeight={true}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          <Form className="flex flex-col w-full h-full justify-between" autoComplete="off">
            <div className="flex flex-col mb-auto space-y-6 p-4 h-full justify-between">
              <div className="flex flex-col justify-between space-y-6">
                <div className="space-y-2">
                  <span className="text-gray-80 text-sm font-bold">
                    Please enter recipient wallet address:
                  </span>
                  <InputField type="text" label="wallet address" name="recipient" placeholder="0xDbaF8fB344D9E57fff48659A4Eb718c480A1Fd62" />
                </div>
                <div className="space-y-2">
                  <Label className="uppercase font-bold" textSize="sm">
                    Amount to send: 
                  </Label>
                  <InputField type="text" name="amount" placeholder="00.00" icon={Matic} />
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  <span className="text-gray-80 text-sm uppercase font-bold">Estimated Gas Fee: </span>
                  <div className="flex space-x-2">
                    <div className="space-y-1">
                      <InputField type="text" label="gas price" name="gasPrice" disabled />
                    </div>
                    <div className="space-y-1">
                      <InputField type="text" label="gas limit" name="gasLimit" disabled />
                    </div>
                  </div>
                </div>
                <div className="space-y-3 flex self-end items-end content-end">
                  <p className="py-6 text-xs text-gray-80 text-left">
                    Gas fees are paid to crypto miners who process transactions on the Polygon network. 
                    SoundChain does not profit from gas fees. <br/><br/>
                  
                    Gas fees are set by the network and fluctuate based on network traffic and transaction complexity.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex bg-gray-15 justify-between p-4">
              <div className="flex items-center">
                <Matic />
                <span className="mx-2 text-gray-CC font-bold text-md leading-tight">{balance}</span>
                <div className="items-end">
                  <span className="text-gray-80 font-bold text-xs leading-tight uppercase">matic</span>
                </div>
              </div>
              <div className="w-6/12">
                <Button className="p-1" type="submit" variant="orange">
                  SEND TOKENS
                </Button>
              </div>
            </div>
          </Form>
        </Formik>
    </Layout>
  )
}
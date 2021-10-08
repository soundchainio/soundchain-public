import { TopNavBarProps } from 'components/TopNavBar';
import { BackButton } from 'components/Buttons/BackButton';
import { useMe } from 'hooks/useMe';
import { useEffect, useState } from 'react';
import { Layout } from 'components/Layout';
import Head from 'next/head';
import useMagic from 'hooks/useMagic';
import useMetaMask from 'hooks/useMetaMask';
import { testNetwork } from 'lib/blockchainNetworks';
import { Button } from 'components/Button';
import { Form, Formik } from 'formik';
import { Label } from 'components/Label';
import { InputField } from 'components/InputField';
import { MetaMask } from 'icons/MetaMask';
import { Logo } from 'icons/Logo';
import { useRouter } from 'next/dist/client/router';
import { Matic } from 'icons/Matic';

const topNovaBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
  title: 'Send Tokens'
};

export default function TransferPage() {
  const me = useMe();
  const router = useRouter();
  const { account, web3, balance } = useMagic();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!account || !web3) {
      setConnected(false);
      return;
    }
    setConnected(true); 
  }, [account, web3]);

  if (!me) return null;

  const initialValues = {
    recipient: '',
    amount: '',
    gasPrice: '3.0',
    gasLimit: '21000',
  };
  
  const handleSubmit = () => {
    router.push('wallet/transfer/confirm')
  }

  return (
    <Layout topNavBarProps={topNovaBarProps} fullHeight={true}>
      <Head>
        <title>Soundchain - Wallet</title>
        <meta name="description" content="Wallet" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          <Form className="flex flex-col w-full h-full justify-between" autoComplete="off">
            <div className="flex flex-col mb-auto space-y-6 p-4">
              <div className="space-y-1">
                <Label className="uppercase" textSize="xs">
                  Recipient Wallet Address
                </Label>
                <InputField type="text" name="recipient" placeholder="0xDbaF8fB344D9E57fff48659A4Eb718c480A1Fd62" />
              </div>
              <div className="space-y-1">
                <Label className="uppercase" textSize="xs">
                  Amount to send
                </Label>
                <InputField type="text" name="amount" placeholder="00.00" />
              </div>
              <div className="space-y-3">
                <Label className="uppercase" textSize="xs">Max gas fee</Label>
                <div className="flex space-x-2">
                  <div className="space-y-1">
                    <Label className="uppercase" textSize="xs">Gas Price</Label>
                    <InputField type="text" name="gasPrice" />
                  </div>
                  <div className="space-y-1">
                    <Label className="uppercase" textSize="xs">Gas limit</Label>
                    <InputField type="text" name="gasLimit" />
                  </div>
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
                <Button className="p-1" type="submit" loading={!connected} disabled={!connected}>
                  SEND TOKENS
                </Button>
              </div>
            </div>
          </Form>
        </Formik>
      
    </Layout>
  )
}
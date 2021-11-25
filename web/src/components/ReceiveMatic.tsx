import { Jazzicon } from 'components/Jazzicon';
import { Layout } from 'components/Layout';
import { Copy2 as Copy } from 'icons/Copy2';
import { LeftArrow } from 'icons/LeftArrow';
import { Polygon } from 'icons/Polygon';
import QRCode from 'qrcode';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { TopNavBarButton } from './TopNavBarButton';

interface ReceiveMaticProps {
  address: string;
  backButton: () => void;
}

export default function ReceiveMatic({ address, backButton }: ReceiveMaticProps) {
  useEffect(() => {
    async function createQrCode() {
      const canvas = document.getElementById('addressQrCodeCanvas');
      await QRCode.toCanvas(canvas, address);
    }
    createQrCode();
  });

  return (
    <Layout
      topNavBarProps={{
        leftButton: <TopNavBarButton onClick={backButton} label="Back" icon={LeftArrow} />,
        title: 'Receive',
      }}
    >
      <div className="h-full flex flex-col gap-5 px-4 py-7 items-center">
        <div className="flex-1 flex flex-col gap-5 items-center w-full">
          {address && <Jazzicon address={address} size={54} />}
          <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between border border-gray-50 rounded-sm">
            <div className="flex flex-row items-center w-10/12 justify-start">
              <Polygon />
              <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{address}</span>
            </div>
            <button
              className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
              onClick={() => {
                navigator.clipboard.writeText(address + '');
                toast('Copied to clipboard');
              }}
              type="button"
            >
              <Copy />
              <span className="text-gray-80 uppercase leading-none">copy</span>
            </button>
          </div>
          <p className="text-gray-80 text-xs font-bold text-center">Send Matic on the Polygon chain this address.</p>
        </div>
        <canvas id="addressQrCodeCanvas" />
        <p className="text-gray-80 text-xs font-bold flex-1 text-center">
          Scan this address to send tokens to the address above.
        </p>
      </div>
    </Layout>
  );
}

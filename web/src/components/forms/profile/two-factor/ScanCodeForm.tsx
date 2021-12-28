import React, { useRef, useEffect } from 'react';
import qrcode from 'qrcode';
import { authenticator } from 'otplib';
import { toast } from 'react-toastify';
import { Label } from 'components/Label';
import { Copy2 as Copy } from 'icons/Copy2';
import { Locker as LockerIcon } from 'icons/Locker';
import { useMe } from 'hooks/useMe';
import { useFormikContext } from 'formik';

const service = 'Soundchain';

type FormValues = {
  secret: string;
};

export const ScanCodeForm = () => {
  const {
    values: { secret },
  } = useFormikContext<FormValues>();
  const me = useMe();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!me) {
      return;
    }

    const otpAuth = authenticator.keyuri(me?.email, service, secret);
    qrcode.toCanvas(canvasRef.current, otpAuth, error => error && console.error(error));
  }, [me, secret]);

  return (
    <div className="flex flex-col flex-grow">
      <Label textSize="base">SCAN CODE OR ENTER KEY</Label>
      <span className="text-gray-60 text-xs my-2">
        Scan the code below with your authenticator app to add this account.
      </span>

      <canvas className="self-center my-4" ref={canvasRef} />

      <span className="text-gray-60 text-xs my-2">
        Some autherticator apps also allow you to type in the text version instead.
      </span>
      <div className="flex flex-row text-xxs bg-gray-1A w-full pl-2 pr-3 py-2 items-center justify-between">
        <div className="flex flex-row items-center w-10/12 justify-start">
          <LockerIcon />
          <span className="text-gray-80 md-text-sm font-bold mx-1 truncate w-full">{secret}</span>
        </div>
        <button
          className="flex flex-row gap-1 items-center border-2 border-gray-30 border-opacity-75 rounded p-1"
          onClick={() => {
            navigator.clipboard.writeText(secret);
            toast('Copied to clipboard');
          }}
          type="button"
        >
          <Copy />
          <span className="text-gray-80 uppercase leading-none">copy</span>
        </button>
      </div>
    </div>
  );
};

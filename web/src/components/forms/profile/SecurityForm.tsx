import { Button, ButtonProps } from 'components/Button';
import { Label } from 'components/Label';
import { Field, Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateOtpSecretMutation } from 'lib/graphql';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as yup from 'yup';
import { Copy2 as Copy } from 'icons/Copy2';
import { Locker as LockerIcon } from 'icons/Locker';
import { toast } from 'react-toastify';
import qrcode from 'qrcode';
import { authenticator } from 'otplib';

interface SecurityFormProps {
  afterSubmit: () => void;
  submitProps?: ButtonProps;
  submitText: string;
}

interface FormValues {
  isEnabled?: boolean | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  isEnabled: yup.boolean().required(),
});

const service = 'Soundchain';

export const SecurityForm = ({ afterSubmit, submitText, submitProps }: SecurityFormProps) => {
  const [token, setToken] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const me = useMe();
  const [updateOTPSecret, { loading }] = useUpdateOtpSecretMutation();

  useEffect(() => {
    setIsEnabled(Boolean(me?.otpSecret));
    setSecret(me?.otpSecret || authenticator.generateSecret());
  }, [me?.otpSecret]);

  useEffect(() => {
    if (!me || !isEnabled) {
      return;
    }

    const otpAuth = authenticator.keyuri(me?.email, service, secret);
    qrcode.toCanvas(canvasRef.current, otpAuth, error => error && console.error(error));
  }, [me, secret, isEnabled]);

  const handleValidate = useCallback(() => {
    const isValid = authenticator.verify({ token, secret });
    isValid ? toast.success('Valid code') : toast.error('Invalid code');
    setToken('');
  }, [secret, token]);

  if (!me) return null;

  const handleOPTChange = (e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value);

  const onSubmit = async ({ isEnabled }: FormValues) => {
    await updateOTPSecret({ variables: { input: { otpSecret: isEnabled ? secret : '' } } });

    afterSubmit();
  };

  const initialFormValues: FormValues = {
    isEnabled,
  };

  return (
    <Formik
      initialValues={initialFormValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ values: { isEnabled }, handleChange }) => (
        <Form className="flex flex-1 flex-col">
          <Label textSize="base">
            <Field
              className="mr-2"
              type="checkbox"
              name="isEnabled"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIsEnabled(e.target.checked);
                handleChange(e);
              }}
            />
            Enable Two-Factor
          </Label>
          <div className="flex-grow mt-4">
            <div className={`flex flex-col ${isEnabled ? '' : 'hidden'}`}>
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

              <div className="mt-12">
                <Label className="text-white mb-4">To validate the secret, enter the 6-digit code from the app</Label>
                <div className="mt-2 flex justify-center gap-4">
                  <Field
                    className="w-48 px-4 tracking-[1em]"
                    onChange={handleOPTChange}
                    value={token}
                    maxLength={6}
                    placeholder="______"
                  />
                  <Button variant="edit-listing" onClick={handleValidate} disabled={!token}>
                    VALIDATE
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col">
            <Button type="submit" disabled={loading} variant="outline" className="h-12 mt-4" {...submitProps}>
              {submitText}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

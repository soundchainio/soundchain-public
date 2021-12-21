import { Button, ButtonProps } from 'components/Button';
import { Label } from 'components/Label';
import { Field, Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateOtpSecretMutation } from 'lib/graphql';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as yup from 'yup';

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
  const [isValid, setIsValid] = useState(false);
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

  const onVerify = useCallback(() => {
    if (!token) {
      return;
    }

    const isValid = authenticator.verify({ token, secret });
    setIsValid(isValid);
    setToken('');
  }, [secret, token]);

  if (!me) return null;

  const handleOPTChange = (e: React.ChangeEvent<HTMLInputElement>) => setToken(e.target.value);

  const onSubmit = async ({ isEnabled }: FormValues) => {
    console.log('submit', { secret, isEnabled });

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
          <label className="text-white">
            <Field
              type="checkbox"
              name="isEnabled"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setIsEnabled(e.target.checked);
                handleChange(e);
              }}
            />
            Enable 2FA
          </label>
          <div className="flex-grow space-y-8">
            <div className={`flex flex-col ${isEnabled ? '' : 'hidden'}`}>
              <Label textSize="base">SCAN QR CODE:</Label>

              <canvas ref={canvasRef} />

              <p className="text-white">{me?.otpSecret || secret}</p>
              <p className="text-white">Test the code: </p>

              <input type="text" onChange={handleOPTChange} value={token} />
              <Button variant="rainbow" onClick={onVerify}>
                VERIFY
              </Button>
              <p className={`${isValid ? 'text-green-500' : 'text-red-500'} `}>{isValid ? 'VALID' : 'INVALID'}</p>
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

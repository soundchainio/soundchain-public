import React from 'react';
import { Form, Formik } from 'formik';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { useMe } from 'hooks/useMe';
import { useUpdateOtpMutation } from 'lib/graphql';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';

interface Props {
  afterSubmit: () => void;
}

interface FormValues {
  recoveryPhrase: string;
}

const initialValues: FormValues = {
  recoveryPhrase: '',
};

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  recoveryPhrase: yup.string().required('Recovery Phrase is required'),
});

export const DisableRecoveryForm = ({ afterSubmit }: Props) => {
  const me = useMe();
  const [updateOTP, { loading }] = useUpdateOtpMutation();

  const handleSubmit = async (values: FormValues) => {
    const { recoveryPhrase } = values;
    if (me?.otpRecoveryPhrase !== recoveryPhrase) {
      toast.error('Invalid recovery phrase');
      return;
    }

    await updateOTP({
      variables: { input: { otpSecret: '', otpRecoveryPhrase: '' } },
    });

    afterSubmit();
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-1 flex-col">
        <div className="flex-grow">
          <Label textSize="base">Enter your Recovery Phrase to disable the Two-Factor</Label>
          <InputField type="text" name="recoveryPhrase" label="Recovery Phrase" />
        </div>

        <Button
          type="submit"
          disabled={loading}
          variant="outline"
          className="w-full h-12 mt-4"
          borderColor="bg-green-gradient"
        >
          SAVE
        </Button>
      </Form>
    </Formik>
  );
};

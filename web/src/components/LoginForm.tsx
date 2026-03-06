import { Button } from 'components/common/Buttons/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import * as yup from 'yup';

export interface FormValues {
  email: string;
}
const validationSchema = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Please enter your email address'),
});

interface LoginFormProps {
  handleMagicLogin: (values: FormValues) => void;
  disabled?: boolean;
}

export const LoginForm = ({ handleMagicLogin, disabled }: LoginFormProps) => {
  return (
    <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleMagicLogin}>
      {({ isSubmitting }) => (
        <Form className="flex flex-col gap-2">
          <InputField placeholder="Email address" type="email" name="email" disabled={disabled} className="text-sm py-2" />
          <Button type="submit" disabled={isSubmitting || disabled} loading={isSubmitting || disabled} className="w-full py-2 text-sm">
            {disabled ? 'Waiting...' : 'Login'}
          </Button>
        </Form>
      )}
    </Formik>
  );
};

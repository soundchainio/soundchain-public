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
}

export const LoginForm = ({ handleMagicLogin }: LoginFormProps) => {
  return (
    <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleMagicLogin}>
      {({ isSubmitting }) => (
        <Form className="flex flex-col">
          <div>
            <InputField placeholder="Email address" type="email" name="email" />
          </div>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="mt-4 w-full transition">
            Login
          </Button>
        </Form>
      )}
    </Formik>
  );
};

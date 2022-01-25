import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import * as yup from 'yup';
export interface FormValues {
  email: string;
}
const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Please enter your email address'),
});

interface LoginFormProps {
  handleMagicLogin: (values: FormValues) => void;
  showTerms?: boolean;
}

export const LoginForm = ({ handleMagicLogin, showTerms = true }: LoginFormProps) => {
  return (
    <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleMagicLogin}>
      {({ isSubmitting }) => (
        <Form className="flex flex-1 flex-col justify-between">
          <div>
            <InputField placeholder="Email address" type="email" name="email" />
          </div>
          <div>
            {showTerms && (
              <div className="text-center text-xs text-white font-thin">
                By clicking “Login”, you agree to SoundChain’s <br /> Terms &amp; Conditions and Privacy Policy.
              </div>
            )}
            <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="w-full mt-6">
              Login
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

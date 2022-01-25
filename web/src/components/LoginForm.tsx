import classNames from 'classnames';
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import { Checkbox } from 'icons/Checkbox';
import { CheckboxFilled } from 'icons/CheckboxFilled';
import Link from 'next/link';
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
  termsAccepted: boolean;
  setTermsAccepted: (val: boolean) => void;
}

export const LoginForm = ({ handleMagicLogin, termsAccepted, setTermsAccepted, showTerms = true }: LoginFormProps) => {
  const toggleTerms = () => {
    setTermsAccepted(!termsAccepted);
  };

  return (
    <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleMagicLogin}>
      {({ isSubmitting }) => (
        <Form className="flex flex-1 flex-col justify-between">
          <div>
            <InputField placeholder="Email address" type="email" name="email" />
          </div>
          <div>
            {showTerms && (
              <div className="text-center text-xs text-white font-thin flex items-start">
                <button onClick={toggleTerms} className="px-2 relative">
                  <span className="after:absolute after:-inset-2">
                    {termsAccepted ? <CheckboxFilled /> : <Checkbox />}
                  </span>
                </button>
                <div className="relative">
                  <span onClick={toggleTerms}>I agree to the SoundChain’s</span>
                  <Link href={`/terms-and-conditions`} passHref>
                    <a className="text-white underline px-2 relative">
                      <span className="after:absolute after:-inset-1">Terms &amp; Conditions</span>
                    </a>
                  </Link>
                  and
                  <Link href={`/privacy-policy`} passHref>
                    <a className="text-white underline px-2 relative">
                      <span className="after:absolute after:-inset-1">Privacy Policy.</span>
                    </a>
                  </Link>
                </div>
              </div>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || !termsAccepted}
              loading={isSubmitting}
              className={classNames('w-full mt-6 transition', !termsAccepted ? 'opacity-50' : '')}
            >
              Login
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

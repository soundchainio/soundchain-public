/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthLayout } from 'components/AuthLayout';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik, FormikHelpers } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { setJwt } from 'lib/apollo';
import { useRegisterMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatValidationErrors } from 'utils/errorHelpers';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';

interface FormValues {
  displayName: string;
  handle: string;
}

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
};

export default function CreateAccountPage() {
  const router = useRouter();
  const { magic } = useMagicContext();
  const [register, { loading }] = useRegisterMutation();
  const [email, setEmail] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  useEffect(() => {
    async function isLoggedInMagic() {
      const user = magic.user;
      const isLoggedIn = await user?.isLoggedIn();

      if (user && isLoggedIn) {
        const token = await user.getIdToken();
        const metaData = await user.getMetadata();
        const email = metaData?.email;
        setToken(token);
        email && setEmail(email);
      } else {
        router.push('/login');
      }
    }
    isLoggedInMagic();
  }, []);

  const toggleTerms = () => {
    setTermsAccepted(!termsAccepted);
  };

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      const { data } = await register({ variables: { input: { token, ...values } } });
      setJwt(data?.register.jwt);
      router.push(router.query.callbackUrl?.toString() ?? '/create-account/profile-picture');
    } catch (error: any) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0]);
      setErrors(formatted);
    }
  };

  const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
    displayName: yup.string().min(3).max(255).required().label('Name'),
    handle: yup
      .string()
      .min(1)
      .max(32)
      .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
      .required()
      .label('Username'),
  });

  const initialValues = {
    displayName: '',
    handle: '',
  };

  if (!email || !token) {
    return null;
  }

  return (
    <>
      <SEO
        title="Create Account | SoundChain"
        canonicalUrl="/create-account/"
        description="Create your account on SoundChain"
      />
      <AuthLayout topNavBarProps={topNavBarProps}>
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          <Form className="flex flex-col flex-1" autoComplete="off">
            <div className="flex flex-col mb-auto space-y-6">
              <div className="space-y-3">
                <InputField label="Name" type="text" name="displayName" />
              </div>
              <div className="space-y-3">
                <InputField label="Enter username. (Only letters and numbers allowed)" type="text" name="handle" />
              </div>
            </div>
            <div className="text-center text-xs text-white font-thin flex items-start mb-6">
              <input
                type="checkbox"
                id="termsCheckbox"
                className="h-5 w-5 focus:ring-0 border-2 border-green-500 bg-black text-green-500 rounded"
                onChange={toggleTerms}
              />
              <div className="relative">
                <label htmlFor="termsCheckbox">I agree to the SoundChain’s</label>
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

            <Button
              type="submit"
              className={'transition ' + (termsAccepted ? 'opacity-100' : 'opacity-50')}
              loading={loading}
              disabled={loading || !termsAccepted}
            >
              CREATE ACCOUNT
            </Button>
          </Form>
        </Formik>
      </AuthLayout>
    </>
  );
}

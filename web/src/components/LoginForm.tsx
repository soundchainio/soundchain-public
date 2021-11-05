import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { config } from 'config';
import { Form, Formik } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { LogoAndText } from 'icons/LogoAndText';
import { useRouter } from 'next/dist/client/router';
import { useEffect, useState } from 'react';
import * as yup from 'yup';

interface FormValues {
  email: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().required('Please enter your email address'),
});

export const LoginForm = () => {
  const [loading, setLoading] = useState(false);
  const [emailLinkSent, setEmailLinkSent] = useState(false);
  const me = useMe();
  const { magic } = useMagicContext();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  async function handleSubmit(values: FormValues) {
    try {
      setLoading(true);
      magic.preload();
      await magic.auth.loginWithMagicLink({
        email: values.email,
        redirectURI: `${config.domainUrl}/callback-login`,
      });
      setEmailLinkSent(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (emailLinkSent) {
    return (
      <>
        <div className="h-36 mb-2 flex items-center justify-center">
          <LogoAndText />
        </div>
        <div className="text-white flex items-center justify-center text-center">
          Now you can close this tab
          <br />
          Or refresh the page to continue using here.
        </div>
        <button
          className="text-white flex items-center justify-center border border-white mt-6 w-60 h-8 self-center"
          onClick={() => document.location.reload()}
        >
          Refresh
        </button>
      </>
    );
  }

  return (
    <>
      <div className="h-36 mb-2 flex items-center justify-center">
        <LogoAndText />
      </div>
      <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6 mb-auto">
            <InputField label="Email address" type="text" name="email" />
          </div>
          <Button type="submit" disabled={loading} loading={loading} className="w-full mt-12">
            Login / Sign up
          </Button>
        </Form>
      </Formik>
    </>
  );
};

import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { LoaderAnimation } from 'components/LoaderAnimation';
import { config } from 'config';
import { Form, Formik } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
import { Google } from 'icons/Google';
import { LogoAndText } from 'icons/LogoAndText';
import { setJwt } from 'lib/apollo';
import { useLoginMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import { useEffect, useState } from 'react';
import * as yup from 'yup';
interface FormValues {
  email: string;
}
const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  email: yup.string().email('Please enter a valid email address').required('Please enter your email address'),
});

export const LoginForm = () => {
  const [login] = useLoginMutation();
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const me = useMe();
  const { magic } = useMagicContext();
  const router = useRouter();
  const magicParam = router.query.magic_credential?.toString();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? `${config.redirectUrlPostLogin}`);
    }
  }, [me, router]);

  const handleOAuthCallback = async () => {
    setLoggingIn(true);
    try {
      let result;
      if (magic.oauth) {
        result = await magic.oauth.getRedirectResult();
      }
      if (result) {
        const loginResult = await login({ variables: { input: { token: result.magic.idToken } } });
        setJwt(loginResult.data?.login.jwt);
      }
    } catch (error) {
      router.push('/create-account');
    }
  };

  const handleGoogleLogin = async () => {
    await magic.oauth.loginWithRedirect({
      provider: 'google',
      redirectURI: `${config.domainUrl}/login`,
      scope: ['openid', 'https://www.googleapis.com/auth/userinfo.email'],
    });
  };

  useEffect(() => {
    if (magic && magicParam) {
      handleOAuthCallback();
    }
  }, [magic, magicParam]);

  async function handleSubmit(values: FormValues) {
    try {
      setLoading(true);
      magic.preload();
      const token = await magic.auth.loginWithMagicLink({
        email: values.email,
      });

      if (!token) {
        throw new Error('Error connecting Magic');
      }

      const result = await login({ variables: { input: { token } } });
      setJwt(result.data?.login.jwt);
    } catch (error) {
      router.push('/create-account');
    } finally {
      setLoading(false);
    }
  }

  return loggingIn ? (
    <div className="flex items-center justify-center w-full h-full text-center font-bold sm:px-4 py-3">
      <LoaderAnimation ring />
      <span className="text-white">Logging in</span>
    </div>
  ) : (
    <>
      <div className="h-36 mb-2 flex items-center justify-center">
        <LogoAndText />
      </div>
      <Formik initialValues={{ email: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6">
            <InputField label="Email address" type="email" name="email" />
          </div>
          <Button type="submit" disabled={loading} loading={loading} className="w-full mt-6">
            Login / Sign up
          </Button>
        </Form>
      </Formik>
      <button
        className="flex items-center justify-center rounded-sm w-full font-bold sm:px-4 py-3 text-gray-60 bg-white"
        onClick={handleGoogleLogin}
      >
        <Google className="mr-1 h-5 w-5" />
        <span>Sign in With Google</span>
      </button>
    </>
  );
};

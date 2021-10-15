import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { useMe } from 'hooks/useMe';
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
  email: yup.string().required('Please enter your email address'),
});

export const LoginForm = () => {
  const [login] = useLoginMutation();
  const [loading, setLoading] = useState(false);
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
      magic?.preload();
      const token = await magic?.auth.loginWithMagicLink({
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

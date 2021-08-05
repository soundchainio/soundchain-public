import { LockClosedIcon, UserIcon } from '@heroicons/react/solid';
import Button from 'components/Button';
import { InputField } from 'components/InputField';
import Link from 'components/Link';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { setJwt } from 'lib/apollo';
import { useLoginMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import { useEffect } from 'react';
import * as yup from 'yup';

interface FormValues {
  username: string;
  password: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  username: yup.string().required(),
  password: yup.string().required(),
});

export const LoginForm = () => {
  const [login, { loading, error }] = useLoginMutation();
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  async function handleSubmit(values: FormValues) {
    try {
      const result = await login({ variables: { input: values } });
      setJwt(result.data?.login.jwt);
    } catch (error) {
      // handled by error state
    }
  }

  return (
    <div className="flex flex-col flex-1 mt-6">
      <Formik
        initialValues={{ username: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6 mb-auto">
            <InputField type="text" name="username" placeholder="Username or Email" icon={UserIcon} />
            <InputField type="password" name="password" placeholder="Password" icon={LockClosedIcon} />
            {error && <p>{error.message}</p>}
            <div>
              <Link href="/forgot-password">Forgot Password?</Link>
            </div>
          </div>
          <Button type="submit" disabled={loading} className="mt-12 pinned-bottom-mobile">
            Login
          </Button>
        </Form>
      </Formik>
    </div>
  );
};

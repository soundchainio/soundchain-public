import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRouter } from 'next/dist/client/router';
import Link from 'next/link';
import { useEffect } from 'react';
import * as yup from 'yup';
import useMe from '../hooks/useMe';
import { setJwt } from '../lib/apollo';
import { useLoginMutation } from '../lib/graphql';

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
    <Formik initialValues={{ username: '', password: '' }} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-col items-center space-y-6">
        <div>
          <Field type="text" name="username" />
          <ErrorMessage name="username" component="div" />
        </div>
        <div>
          <Field type="password" name="password" />
          <ErrorMessage name="password" component="div" />
        </div>
        {error && <p>{error.message}</p>}
        <Link href="/forgot-password">
          <a>Forgot password?</a>
        </Link>
        <button type="submit" disabled={loading} className="p-3 border-2 w-full">
          Login
        </button>
      </Form>
    </Formik>
  );
};

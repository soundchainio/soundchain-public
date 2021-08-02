import { ErrorMessage, Field, Form, Formik } from 'formik';
import useMe from 'hooks/useMe';
import { setJwt } from 'lib/apollo';
import { useLoginMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import { useEffect } from 'react';
import * as yup from 'yup';
import Button from './Button';

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
        <a href="#">Forgot password?</a>
        <Button variant="outlined" type="submit" disabled={loading} className="w-full">
          Login
        </Button>
      </Form>
    </Formik>
  );
};

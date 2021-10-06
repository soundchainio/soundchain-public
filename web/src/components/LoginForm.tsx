import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import useMagicAuth from 'hooks/useMagicAuth';
import { useMe } from 'hooks/useMe';
import { LogoAndText } from 'icons/LogoAndText';
import { setJwt } from 'lib/apollo';
import { useLoginMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import { useEffect } from 'react';
import * as yup from 'yup';

interface FormValues {
  username: string;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  username: yup.string().required(),
});

export const LoginForm = () => {
  const [login, { loading }] = useLoginMutation();
  const me = useMe();
  const { connect: magicConnect } = useMagicAuth();

  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  async function handleSubmit(values: FormValues) {
    try {
     const token =  await magicConnect(values.username)

      if(token){
        const result = await login({ variables: { input: {token} } });
        setJwt(result.data?.login.jwt);
      }
    } catch (error) {
      window.localStorage.setItem("soundChainUserMagicEmail", values.username);
      router.push('/create-account');
    }
  }

  return (
    <>
      <div className="h-36 mb-2 flex items-center justify-center">
        <LogoAndText />
      </div>
      <Formik
        initialValues={{ username: '' }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        <Form className="flex flex-1 flex-col">
          <div className="space-y-6 mb-auto">
            <InputField type="text" name="username" placeholder="Username or Email Address" />
          </div>
          <Button type="submit" disabled={loading} loading={loading} className="w-full mt-12">
            Login / Sign up
          </Button>
        </Form>
      </Formik>
    </>
  );
};

import { AuthLayout } from 'components/AuthLayout';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik, FormikHelpers } from 'formik';
import { useMagicContext } from 'hooks/useMagicContext';
import { setJwt } from 'lib/apollo';
import { useRegisterMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
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

  useEffect(() => {
    async function isLoggedInMagic() {
      const user = magic?.user;
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

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      const { data } = await register({ variables: { input: { token, ...values } } });
      setJwt(data?.register.jwt);
      router.push(router.query.callbackUrl?.toString() ?? '/create-account/profile-picture');
    } catch (error) {
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
    <AuthLayout topNavBarProps={topNavBarProps}>
      <Head>
        <title>Soundchain - Create Account</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        <Form className="flex flex-col flex-1" autoComplete="off">
          <div className="flex flex-col mb-auto space-y-6">
            <div className="space-y-3">
              <InputField type="text" name="displayName" placeholder="Name" />
            </div>
            <div className="space-y-3">
              <Label textSize="xs">
                Enter username. <i>(Only letters and numbers allowed)</i>
              </Label>
              <InputField type="text" name="handle" placeholder="Username" />
            </div>
          </div>
          <Button type="submit" loading={loading} disabled={loading}>
            CREATE ACCOUNT
          </Button>
        </Form>
      </Formik>
    </AuthLayout>
  );
}

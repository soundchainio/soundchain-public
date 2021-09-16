import { AuthLayout } from 'components/AuthLayout';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik, FormikHelpers } from 'formik';
import { setJwt } from 'lib/apollo';
import { useRegisterMutation } from 'lib/graphql';
import { omit } from 'lodash';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { formatValidationErrors } from 'utils/errorHelpers';
import { handleRegex } from 'utils/Validation';
import * as yup from 'yup';

interface FormValues {
  email: string;
  displayName: string;
  handle: string;
  password: string;
  passwordConfirmation: string;
}

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
};

export default function CreateAccountPage() {
  const router = useRouter();
  const [register, { loading }] = useRegisterMutation();

  const handleSubmit = async (values: FormValues, { setErrors }: FormikHelpers<FormValues>) => {
    try {
      const { data } = await register({ variables: { input: omit(values, 'passwordConfirmation') } });
      setJwt(data?.register.jwt);
      router.push(router.query.callbackUrl?.toString() ?? '/settings/profile-picture?newAccount=true');
    } catch (error) {
      const formatted = formatValidationErrors<FormValues>(error.graphQLErrors[0]);
      setErrors(formatted);
    }
  };

  const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
    email: yup.string().email().required().label('Email'),
    displayName: yup.string().min(3).max(255).required().label('Name'),
    handle: yup
      .string()
      .min(1)
      .max(32)
      .matches(handleRegex, 'Invalid characters. Only letters and numbers are accepted.')
      .required()
      .label('Username'),
    password: yup.string().min(8).required().label('Password'),
    passwordConfirmation: yup
      .string()
      .required()
      .test('passwords-match', 'Passwords must match', function (value) {
        return this.parent.password === value;
      })
      .label('Password confirmation'),
  });

  const initialValues = {
    email: '',
    displayName: '',
    handle: '',
    password: '',
    passwordConfirmation: '',
  };

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
              <p className="text-center">
                <Label textSize="xs">
                  A link will be sent to the email address you enter below which must be clicked to activate your
                  account.
                </Label>
              </p>
              <InputField type="email" name="email" placeholder="Email Address" />
              <InputField type="text" name="displayName" placeholder="Name" />
            </div>
            <div className="space-y-3">
              <Label textSize="xs">
                Enter username. <i>(Only letters and numbers allowed)</i>
              </Label>
              <InputField type="text" name="handle" placeholder="Username" />
            </div>
            <div className="space-y-3">
              <Label textSize="xs">Create a password to secure your account:</Label>
              <InputField type="password" name="password" placeholder="Password" autoComplete="new-password" />
              <InputField type="password" name="passwordConfirmation" placeholder="Confirm Password" />
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

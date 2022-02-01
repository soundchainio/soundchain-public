import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { InputField } from 'components/InputField';
import { Layout } from 'components/Layout';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateProfileDisplayNameMutation } from 'lib/graphql';
import { useRouter } from 'next/router';
import React from 'react';
import * as yup from 'yup';

interface FormValues {
  displayName: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  displayName: yup.string().min(3).max(255).required().label('Name'),
});

const topNavBarProps: TopNavBarProps = {
  title: 'Name',
  leftButton: <BackButton />,
};

export default function NamePage() {
  const me = useMe();
  const router = useRouter();
  const initialFormValues: FormValues = { displayName: me?.profile?.displayName };
  const [updateDisplayName, { loading }] = useUpdateProfileDisplayNameMutation();

  const onSubmit = async ({ displayName }: FormValues) => {
    await updateDisplayName({ variables: { input: { displayName: displayName as string } } });
    router.push('/settings');
  };

  if (!me) return null;

  return (
    <Layout topNavBarProps={topNavBarProps} hideBottomNavBar>
      <SEO title="Edit Name | SoundChain" canonicalUrl="/settings/name/" description="SoundChain Edit Name" />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={onSubmit}>
          <Form className="flex flex-1 flex-col space-y-6">
            <div>
              <InputField
                label="First or full name"
                type="text"
                name="displayName"
                placeholder="Name"
                maxLength={255}
              />
            </div>
            <p className="text-gray-50 flex-grow"> This will be displayed publically to other users. </p>
            <div className="flex flex-col">
              <Button
                type="submit"
                disabled={loading}
                variant="outline"
                borderColor="bg-green-gradient"
                className="h-12"
              >
                SAVE
              </Button>
            </div>
          </Form>
        </Formik>
      </div>
    </Layout>
  );
}

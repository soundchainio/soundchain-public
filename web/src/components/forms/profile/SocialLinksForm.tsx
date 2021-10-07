import { Button, ButtonProps } from 'components/Button';
import { InputField } from 'components/InputField';
import { Label } from 'components/Label';
import { Form, Formik } from 'formik';
import { useMe } from 'hooks/useMe';
import { useUpdateSocialMediasMutation } from 'lib/graphql';
import * as yup from 'yup';

interface SocialLinksFormProps {
  afterSubmit: () => void;
  submitProps?: ButtonProps;
  submitText: string;
}

interface FormValues {
  facebook: string | undefined;
  instagram: string | undefined;
  twitter: string | undefined;
  soundcloud: string | undefined;
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  facebook: yup.string().label('Facebook'),
  instagram: yup.string().label('Instagram'),
  twitter: yup.string().label('Twitter'),
  soundcloud: yup.string().label('Soundcloud'),
});

export const SocialLinksForm = ({ afterSubmit, submitText, submitProps }: SocialLinksFormProps) => {
  const me = useMe();
  const initialFormValues: FormValues = {
    facebook: me?.profile?.socialMedias.facebook || '',
    instagram: me?.profile?.socialMedias.instagram || '',
    twitter: me?.profile?.socialMedias.twitter || '',
    soundcloud: me?.profile?.socialMedias.soundcloud || ''
  };
  const [updateSocialMedias, { loading }] = useUpdateSocialMediasMutation();

  const handleSubmit = async ({ facebook, instagram, twitter, soundcloud }: FormValues) => {
    await updateSocialMedias({ variables: { input: { socialMedias: { facebook, instagram, twitter, soundcloud } } } });
    afterSubmit();
  };

  return (
    <Formik initialValues={initialFormValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      <Form className="flex flex-1 flex-col space-y-6">
        <div className="flex items-center">
          <Label>facebook.com/</Label>
          <InputField type="text" name="facebook" />
        </div>
        <div className="flex items-center">
          <Label>instagram.com/</Label>
          <InputField type="text" name="instagram" />
        </div>
        <div className="flex items-center">
          <Label>twitter.com/</Label>
          <InputField type="text" name="twitter" />
        </div>
        <div className="flex items-center">
          <Label>soundcloud.com/</Label>
          <InputField type="text" name="soundcloud" />
        </div>
        <div className="flex flex-col">
          <Button type="submit" disabled={loading} variant="outline" className="h-12" {...submitProps}>
            {submitText}
          </Button>
        </div>
      </Form>
    </Formik>
  );
};

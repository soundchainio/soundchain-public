import { Form, Formik, FormikHelpers } from 'formik';
import * as yup from 'yup';

import { PostBodyField } from './PostBodyField';
import { PostFormType } from 'types/PostFormType'
import { Button } from './Button';
import { setMaxInputLength } from './PostModal';

interface InitialValues {
  body: string
}

interface PostFormProps {
  type: PostFormType
  initialValues: InitialValues
  onSubmit: (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => void
  onCancel: (setFieldValue: (field: string, value: string) => void) => void
}

export interface FormValues {
  body: string;
  mediaLink?: string;
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required(),
  mediaLink: yup.string(),
});

const defaultInitialValues = { body: '' };

export const PostForm = ({ ...props }: PostFormProps) => {
  return (
    <Formik enableReinitialize={true} initialValues={props.initialValues || defaultInitialValues} validationSchema={postSchema} onSubmit={props.onSubmit}>
      {({ values, setFieldValue }) => (
        <Form className="flex flex-col h-full">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-30">
            <div className="p-2 text-gray-400 font-bold flex-1 text-center" onClick={() => props.onCancel(setFieldValue)}>
              Cancel
            </div>
            <div className="flex-1 text-center text-white font-bold">
              {props.type === PostFormType.REPOST && 'Repost'}
              {props.type === PostFormType.EDIT && 'Edit Post'}
              {props.type === PostFormType.NEW && 'New Post'}
            </div>
            <div className="flex-1 text-center m-2">
              <div className="ml-6">
                <Button className="bg-gray-30 text-sm " type="submit" variant="rainbow-rounded">
                  {props.type === PostFormType.EDIT && 'Save'}
                  {props.type !== PostFormType.EDIT && 'Post'}
                </Button>
              </div>
            </div>
          </div>
          <PostBodyField
            name="body"
            placeholder="What's happening?"
            maxLength={setMaxInputLength(values.body)}
          />

          {/* <Field
        component="textarea"
        name="body"
        className="w-full h-24 resize-none focus:ring-0 bg-gray-20 border-none focus:outline-none outline-none text-white flex-auto"
        placeholder=""

        inputprops={{ onChange: onTextareaChange(values.body), value: bodyValue }}
      /> */}
        </Form>
      )}
    </Formik>
  )
};
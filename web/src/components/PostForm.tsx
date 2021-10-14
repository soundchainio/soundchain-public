import { useModalState } from 'contexts/providers/modal';
import { Form, Formik, FormikHelpers } from 'formik';
import {
  CreatePostInput,
  UpdatePostInput,
  useCreatePostMutation,
  useCreateRepostMutation,
  useUpdatePostMutation,
} from 'lib/graphql';
import { useState } from 'react';
import { PostFormType } from 'types/PostFormType';
import * as yup from 'yup';
import { Button } from './Button';
import { PostBar } from './PostBar';
import { PostBodyField } from './PostBodyField';
import { setMaxInputLength } from './PostModal';
import { RepostPreview } from './RepostPreview';

interface InitialValues {
  body: string;
}

interface PostFormProps {
  type: PostFormType;
  initialValues: InitialValues;
  postLink?: string;
  afterSubmit: () => void;
  onCancel: (setFieldValue: (field: string, value: string) => void) => void;
  showNewPost: boolean;
  setOriginalLink: (val: string) => void;
  setPostLink: (val: string) => void;
  setBodyValue: (val: string) => void;
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
  const [isEmojiPickerVisible, setEmojiPickerVisible] = useState(false);
  const [createPost] = useCreatePostMutation({ refetchQueries: ['Posts', 'Feed'] });
  const [createRepost] = useCreateRepostMutation({ refetchQueries: ['Posts', 'Feed'] });
  const [editPost] = useUpdatePostMutation({ refetchQueries: ['Post'] });
  const { repostId, editPostId } = useModalState();

  const onEmojiPickerClick = () => {
    setEmojiPickerVisible(!isEmojiPickerVisible);
  };

  const onSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    switch (props.type) {
      case PostFormType.REPOST:
        await createRepost({ variables: { input: { body: values.body, repostId: repostId! } } });
        break;
      case PostFormType.EDIT:
        const updateParams: UpdatePostInput = { body: values.body, postId: editPostId! };

        if (props.postLink?.length) {
          updateParams.mediaLink = props.postLink;
        }

        await editPost({ variables: { input: updateParams } });
        break;
      case PostFormType.NEW:
        const newPostParams: CreatePostInput = { body: values.body };

        if (props.postLink?.length) {
          newPostParams.mediaLink = props.postLink;
        }

        await createPost({ variables: { input: newPostParams } });
    }

    resetForm();

    props.afterSubmit();
  };

  const onTextAreaChange = (newVal: string) => {
    props.setBodyValue(newVal);
  };

  return (
    <Formik
      enableReinitialize={true}
      initialValues={props.initialValues || defaultInitialValues}
      validationSchema={postSchema}
      onSubmit={onSubmit}
    >
      {({ values, setFieldValue }) => (
        <Form className="flex flex-col h-full">
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
            <div
              className="p-2 text-gray-400 font-bold flex-1 text-center"
              onClick={() => props.onCancel(setFieldValue)}
            >
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
            updatedValue={onTextAreaChange}
          />
          {props.type === PostFormType.REPOST && (
            <div className="p-4 bg-gray-20">
              <RepostPreview postId={repostId as string} />
            </div>
          )}
          {props.postLink && props.type !== PostFormType.REPOST && (
            <iframe className="w-full bg-gray-20" frameBorder="0" allowFullScreen src={props.postLink} />
          )}
          <PostBar
            onEmojiPickerClick={onEmojiPickerClick}
            isEmojiPickerVisible={isEmojiPickerVisible}
            isRepost={props.type === PostFormType.REPOST}
            showNewPost={props.showNewPost}
            setOriginalLink={props.setOriginalLink}
            setFieldValue={setFieldValue}
            values={values}
            postLink={props.postLink || ''}
            setPostLink={props.setPostLink}
          />
        </Form>
      )}
    </Formik>
  );
};

import { useModalState } from 'contexts/providers/modal'
import { Form, Formik, FormikHelpers } from 'formik'
import { UpdateCommentInput, useUpdateCommentMutation } from 'lib/graphql'
import * as yup from 'yup'
import { Button } from '../common/Buttons/Button'
import { PostBodyField } from '../Post/PostBodyField'

interface InitialValues {
  body: UpdateCommentInput['body']
}

interface CommentFormProps {
  initialValues: InitialValues
  afterSubmit: () => void
  onCancel: (setFieldValue: (field: string, value: string) => void) => void
}

export interface FormValues {
  body: UpdateCommentInput['body']
}

const postSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
})

const defaultInitialValues = { body: '' }

export const CommentForm = ({ afterSubmit, initialValues, onCancel }: CommentFormProps) => {
  const { editCommentId } = useModalState()
  const [updateComment] = useUpdateCommentMutation()

  const onSubmit = async (values: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    if (!editCommentId) {
      resetForm()
      afterSubmit()
      return
    }

    await updateComment({
      variables: { input: { body: values.body, commentId: editCommentId } },
    })

    resetForm()
    afterSubmit()
  }

  return (
    <Formik
      enableReinitialize={true}
      initialValues={initialValues || defaultInitialValues}
      validationSchema={postSchema}
      onSubmit={onSubmit}
    >
      {({ setFieldValue, isValid }) => (
        <Form className="flex h-full flex-col" placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
          <div className="flex items-center rounded-tl-3xl rounded-tr-3xl bg-gray-20">
            <div className="flex-1 p-2 text-center font-bold text-gray-400" onClick={() => onCancel(setFieldValue)}>
              Cancel
            </div>
            <div className="flex-1 text-center font-bold text-white">Edit Comment</div>
            <div className="m-2 flex-1 text-center">
              <div className="ml-6">
                <Button className="bg-gray-30 text-sm " type="submit" disabled={!isValid} variant="rainbow-rounded">
                  Save
                </Button>
              </div>
            </div>
          </div>
          <PostBodyField name="body" placeholder="What's happening?" maxLength={160} />
        </Form>
      )}
    </Formik>
  )
}

import { ApolloCache, FetchResult } from '@apollo/client'
import { Form, Formik, FormikHelpers, FormikProps } from 'formik'
import { useMe } from 'hooks/useMe'
import { Send } from 'icons/Send'
import { useRouter } from 'next/router'
import * as yup from 'yup'
import { AddCommentMutation, CommentDocument, useAddCommentMutation } from '../lib/graphql'
import { Avatar } from 'components/Avatar'
import { FlexareaField } from './FlexareaField'

export interface NewCommentFormProps {
  postId: string
}

interface FormValues {
  body: string
}

const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  body: yup.string().required().max(160),
})

const initialValues: FormValues = { body: '' }

export const NewCommentForm = ({ postId }: NewCommentFormProps) => {
  const me = useMe()
  const router = useRouter()
  const [addComment] = useAddCommentMutation({
    update: (cache, result) => {
      if (router.pathname === '/posts/[id]' && !router.query.cursor) {
        updateCache(cache, result)
      } else {
        cache.evict({ fieldName: 'comments', args: { postId } })
      }
    },
  })

  const handleSubmit = async ({ body }: FormValues, { resetForm }: FormikHelpers<FormValues>) => {
    await addComment({ variables: { input: { postId, body } } })

    if (router.query.commentId) {
      router.replace({ pathname: '/posts/[id]', query: { id: postId } }, `/posts/${postId}`, {
        shallow: true,
      })
    } else {
      resetForm()
    }

    document.querySelector('#main')?.scrollTo(0, 0)
  }

  if (!me) return null

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
      {({ isSubmitting, isValid, dirty }: FormikProps<FormValues>) => (
        <Form placeholder="" onPointerEnterCapture={() => {}} onPointerLeaveCapture={() => {}}>
          <div className="flex flex-row items-start space-x-3 bg-gray-25 p-3">
            <Avatar profile={me.profile} linkToProfile={false} />
            <FlexareaField id="commentField" name="body" maxLength={160} placeholder="Write a comment..." />
            <button type="submit" disabled={isSubmitting} className="pt-1">
              <Send color={dirty && isValid ? 'green-blue' : undefined} />
            </button>
          </div>
        </Form>
      )}
    </Formik>
  )
}

function updateCache(cache: ApolloCache<AddCommentMutation>, { data }: FetchResult) {
  const newComment = data?.addComment.comment

  cache.writeQuery({
    query: CommentDocument,
    variables: { id: newComment.id },
    data: { comment: newComment },
  })

  cache.modify({
    fields: {
      comments({ nodes, pageInfo }, {}) {
        const newNode = { __ref: cache.identify(newComment) }
        return {
          nodes: [newNode, ...nodes],
          pageInfo,
        }
      },
    },
  })
}

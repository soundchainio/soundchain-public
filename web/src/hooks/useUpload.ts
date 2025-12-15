import axios from 'axios'
import { apolloClient } from 'lib/apollo'
import { UploadUrlDocument, UploadUrlQuery } from 'lib/graphql-hooks'
import { gql } from '@apollo/client'
import { useCallback, useState } from 'react'

// Guest upload URL query - doesn't require authentication
const GuestUploadUrlDocument = gql`
  query GuestUploadUrl($fileType: String!) {
    guestUploadUrl(fileType: $fileType) {
      uploadUrl
      fileName
      readUrl
    }
  }
`

type GuestUploadUrlQuery = {
  guestUploadUrl: {
    uploadUrl: string
    fileName: string
    readUrl: string
  }
}

export const useUpload = (value?: string, onChange?: (value: string) => void, isGuest?: boolean) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | undefined>(value)
  const [fileType, setFileType] = useState<string>('')

  const upload = useCallback(
    async ([file]: File[]) => {
      const objectUrl = URL.createObjectURL(file)
      setUploading(true)
      setPreview(objectUrl)
      setFileType(file.type)

      // Use guest endpoint for unauthenticated users (image only)
      // Use authenticated endpoint for logged-in users (all media types)
      if (isGuest) {
        const { data } = await apolloClient.query<GuestUploadUrlQuery>({
          query: GuestUploadUrlDocument,
          variables: { fileType: file.type },
          fetchPolicy: 'no-cache',
        })

        if (!data) {
          throw Error('Could not get upload URL')
        }

        const { uploadUrl, readUrl } = data.guestUploadUrl

        await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })

        setUploading(false)
        onChange && onChange(readUrl)

        return readUrl
      } else {
        const { data } = await apolloClient.query<UploadUrlQuery>({
          query: UploadUrlDocument,
          variables: { fileType: file.type },
          fetchPolicy: 'no-cache',
        })

        if (!data) {
          throw Error('Could not get upload URL')
        }

        const { uploadUrl, readUrl } = data.uploadUrl

        await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })

        setUploading(false)
        onChange && onChange(readUrl)

        return readUrl
      }
    },
    [onChange, setPreview, setUploading, setFileType, isGuest],
  )

  return { preview, fileType, uploading, upload }
}

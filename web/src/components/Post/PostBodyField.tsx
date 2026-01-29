import { useField } from 'formik'
import React, { useEffect } from 'react'

interface PostBodyFieldProps extends React.ComponentPropsWithoutRef<'textarea'> {
  name: string
  maxLength?: number
  updatedValue?: (val: string) => void
}

export const PostBodyField = ({ ...props }: PostBodyFieldProps) => {
  const [field, meta] = useField(props)

  useEffect(() => {
    if (props.updatedValue) props.updatedValue(meta.value)
  }, [meta.value])

  return (
    <textarea
      {...field}
      className="w-full min-h-[80px] text-sm focus:ring-0 focus:outline-none border-0 resize-none p-4"
      style={{
        backgroundColor: '#171717',
        color: '#ffffff',
        WebkitTextFillColor: '#ffffff',
      }}
      placeholder="What's happening?"
      maxLength={props.maxLength}
    />
  )
}

import { Field, FieldProps } from 'formik'
import { ImageUpload, ImageUploadProps } from './ImageUpload'

export interface ImageUploadFieldProps extends Omit<ImageUploadProps, 'value' | 'onChange'> {
  name: string
}

export const ImageUploadField = ({ name, ...rest }: ImageUploadFieldProps) => {
  return (
    <Field
      name={name}
      component={({ field: { value, onChange } }: FieldProps<string>) => (
        <ImageUpload value={value} onChange={onChange(name)} {...rest} />
      )}
    />
  )
}

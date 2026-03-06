import { Field, FieldProps } from 'formik'
import { ImageUpload, ImageUploadProps } from './ImageUpload'

export interface ImageUploadFieldProps extends Omit<ImageUploadProps, 'value' | 'onChange'> {
  name: string
}

export const ImageUploadField = ({ name, ...rest }: ImageUploadFieldProps) => {
  return (
    <Field
      name={name}
      component={({ field: { value }, form: { setFieldValue } }: FieldProps<string>) => (
        <ImageUpload
          value={value}
          onChange={(newValue: string) => setFieldValue(name, newValue)}
          {...rest}
        />
      )}
    />
  )
}

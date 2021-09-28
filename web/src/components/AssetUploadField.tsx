import { Field, FieldProps } from 'formik';
import { AssetUpload, AssetUploadProps } from './AssetUpload';

export interface AssetUploadFieldProps extends Omit<AssetUploadProps, 'value' | 'onChange'> {
  name: string;
}

export function AssetUploadField({ name, ...rest }: AssetUploadFieldProps) {
  return (
    <Field
      name={name}
      component={({ field: { value, onChange } }: FieldProps<string>) => (
        <AssetUpload value={value} onChange={onChange(name)} {...rest} />
      )}
    />
  );
}

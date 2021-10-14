import classNames from 'classnames';
import { useField } from 'formik';
import React, { useEffect } from 'react';

interface PostBodyFieldProps extends React.ComponentPropsWithoutRef<'textarea'> {
  name: string;
  maxLength?: number;
  updatedValue?: (val: string) => void;
}

const commonClasses = 'flex-1 bg-gray-10 text-white text-sm placeholder-gray-50 focus:ring-0 border-0 resize-none';

export const PostBodyField = ({ ...props }: PostBodyFieldProps) => {
  const [field, meta] = useField(props);

  useEffect(() => {
    if (props.updatedValue) props.updatedValue(meta.value);
  }, [meta.value]);

  return (
    <textarea
      {...field}
      className={classNames(commonClasses)}
      placeholder="What's happening?"
      maxLength={props.maxLength}
    />
  );
};

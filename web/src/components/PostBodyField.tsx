import classNames from 'classnames';
import { useField } from 'formik';
import React from 'react';

interface PostBodyFieldProps extends React.ComponentPropsWithoutRef<'textarea'> {
  name: string;
  maxLength?: number;
}

const commonClasses = 'flex-1 bg-gray-35 text-white text-sm placeholder-gray-50 focus:ring-0 border-0 resize-none';

export const PostBodyField = ({ ...props }: PostBodyFieldProps) => {
  const [field] = useField(props);

  return (
    <textarea
      {...field}
      className={classNames(commonClasses)}
      placeholder="What's happening?"
      maxLength={props.maxLength}
    />
  );
};

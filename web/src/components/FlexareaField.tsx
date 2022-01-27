import classNames from 'classnames';
import { useField } from 'formik';
import React, { useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

interface FlexareaFieldProps extends React.ComponentPropsWithoutRef<'textarea'> {
  name: string;
}

const commonClasses = 'flex-1 bg-gray-35 text-white text-sm placeholder-gray-50 focus:ring-0 border-0 resize-none';

export const FlexareaField = ({ ...props }: FlexareaFieldProps) => {
  const [field] = useField(props);

  const [roundedFull, setRoundedFull] = useState(true);

  const handleHeightChange = (height: number, { rowHeight }: { rowHeight: number }) => {
    setRoundedFull(height < 2 * rowHeight);
  };

  return (
    <TextareaAutosize
      {...field}
      onHeightChange={handleHeightChange}
      maxRows={10}
      id={props.id}
      placeholder={props.placeholder}
      className={classNames(commonClasses, roundedFull ? 'rounded-full' : 'rounded-xl')}
      maxLength={props.maxLength}
    />
  );
};

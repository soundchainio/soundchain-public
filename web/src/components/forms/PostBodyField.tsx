import React from 'react';

interface PostBodyFieldProps {
  name: string;
  as?: React.ElementType;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
}

const PostBodyField: React.FC<PostBodyFieldProps> = ({
  name,
  as: Component = 'textarea',
  placeholder,
  maxLength,
  disabled,
  ...props
}) => (
  <Component
    name={name}
    placeholder={placeholder}
    maxLength={maxLength}
    disabled={disabled}
    className="w-full p-2 border rounded"
    {...props}
  />
);

export default PostBodyField;

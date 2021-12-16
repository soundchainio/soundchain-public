import { useField } from 'formik';
import { createRef } from 'react';
import { Label } from './Label';

interface InputFieldProps extends React.ComponentPropsWithoutRef<'input'> {
  name: string;
  type: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
  symbol?: string;
}

const commonInputClasses = `relative appearance-none block w-full p-3 rounded-md border bg-gray-1A border-gray-30 text-gray-200 cursor-text`;
const validInputClasses = `${commonInputClasses} border-gray-30`;
const errorInputClasses = `${commonInputClasses} border-red-500`;

export const InputField = ({ label, icon: Icon, ...props }: InputFieldProps) => {
  const [field, meta] = useField(props);
  const inputRef = createRef<HTMLInputElement>();
  return (
<<<<<<< HEAD
    <>
      <div className="flex flex-col gap-2">
        <div
          className={meta.touched && meta.error ? errorInputClasses : validInputClasses}
          onClick={() => inputRef.current?.focus()}
        >
          {label && (
            <Label className="block font-bold text-sm uppercase cursor-auto" htmlFor={props.name}>
              {label}
            </Label>
          )}
          <input
            className="text-sm font-bold bg-gray-30 w-full p-0 text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold"
            id={props.name}
            {...field}
            {...props}
            ref={inputRef}
          />
          {Icon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </div>
          )}
          {props.symbol && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">{props.symbol}</div>
          )}
        </div>
=======
    <div className="flex flex-col gap-2">
      <div
        className={meta.touched && meta.error ? errorInputClasses : validInputClasses}
        onClick={() => inputRef.current?.focus()}
      >
        {label && (
          <Label className="block font-bold uppercase cursor-auto" textSize="xs" htmlFor={props.name}>
            {label}
          </Label>
        )}
        <input
          className="text-sm font-bold bg-gray-1A w-full p-0 text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-50 placeholder-semibold"
          id={props.name}
          {...field}
          {...props}
          ref={inputRef}
        />
        {Icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        {props.symbol && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">{props.symbol}</div>
        )}
>>>>>>> 4f240e85cc0d9475abd99fec8b09b68735afd9c3
      </div>
      {meta.touched && meta.error ? <div className="text-red-500 text-sm">{meta.error}</div> : null}
    </>
  );
};

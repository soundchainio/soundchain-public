import { useField } from 'formik';
import { Label } from './Label';

interface InputFieldProps extends React.ComponentPropsWithoutRef<'input'> {
  name: string;
  type: 'text' | 'email' | 'password' | 'number';
  label?: string;
  placeholder?: string;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
  symbol?: string;
}

const commonInputClasses = `relative appearance-none block w-full p-3 rounded-md border-2 bg-gray-30 border-gray-80 text-gray-200 cursor-text`;
const validInputClasses = `${commonInputClasses} border-gray-80`;
const errorInputClasses = `${commonInputClasses} border-red-500`;

export const InputField = ({ label, icon: Icon, ...props }: InputFieldProps) => {
  const [field, meta] = useField(props);
  return (
    <div className="flex flex-col gap-2">
      <div className={meta.touched && meta.error ? errorInputClasses : validInputClasses}>
        {label && (
          <Label className="block font-bold text-sm uppercase cursor-text" htmlFor={props.name}>
            {label}
          </Label>
        )}
        <input
          className="text-sm font-bold bg-gray-30 w-full p-0 text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold"
          id={props.name}
          {...field}
          {...props}
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
      {meta.touched && meta.error ? <div className="text-red-500 text-sm">{meta.error}</div> : null}
    </div>
  );
};

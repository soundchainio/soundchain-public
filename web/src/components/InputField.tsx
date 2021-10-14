import { useField } from 'formik';
import { Label } from './Label';

interface InputFieldProps extends React.ComponentPropsWithoutRef<'input'> {
  name: string;
  type: 'text' | 'email' | 'password';
  label?: string;
  placeholder?: string;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
}

const commonInputClasses = `appearance-none block w-full px-2 py-1 rounded-md border bg-gray-30 border-gray-700 text-gray-200 shadow-sm`;
const validInputClasses = `${commonInputClasses} border-gray-30`;
const errorInputClasses = `${commonInputClasses} border-green-500`;

export const InputField = ({ label, icon: Icon, ...props }: InputFieldProps) => {
  const [field, meta] = useField(props);
  return (
    <div className={meta.touched && meta.error ? errorInputClasses : validInputClasses}>
      {label && (
        <div className="mb-1 pl-3">
          <Label htmlFor={props.name}>{label}</Label>
        </div>
      )}
      <div className="relative">
        <input className="bg-gray-30 w-full py-0 text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold" {...field} {...props} />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {Icon && <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
        </div>
      </div>
      {meta.touched && meta.error ? <div className="text-green-500 pl-1 text-sm">{meta.error}</div> : null}
    </div >
  );
};

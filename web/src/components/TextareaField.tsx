import { useField } from 'formik';
import { Label } from './Label';

interface TextareaFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
  maxLength?: number;
  rows?: number;
}

const commonInputClasses = `appearance-none block w-full px-2 py-1 rounded-md border border-gray-700 bg-gray-30 text-gray-200`;
const validInputClasses = `${commonInputClasses} border-gray-30`;
const errorInputClasses = `${commonInputClasses} border-green-500`;

export const TextareaField = ({ label, icon: Icon, maxLength, rows = 4, ...props }: TextareaFieldProps) => {
  const [field, meta] = useField(props);
  return (
    <div className={meta.touched && meta.error ? errorInputClasses : validInputClasses}>
      {label && (
        <div className="pl-3">
          <Label htmlFor={props.name}>{label}</Label>
        </div>
      )}
      <div className="relative">
        <textarea
          maxLength={maxLength}
          className="bg-gray-30 w-full py-0 text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold resize-none"
          {...field}
          {...props}
          rows={rows}
        ></textarea>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {Icon && <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
        </div>
      </div>
      {meta.touched && meta.error ? <div className="text-green-500 pl-1 text-sm">{meta.error}</div> : null}
    </div>
  );
};

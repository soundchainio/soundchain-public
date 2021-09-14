import { useField } from 'formik';
import { Label } from './Label';

interface TextareaFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element;
  maxLength?: number;
}

const commonInputClasses = `appearance-none block w-full px-3 py-2 border-1 bg-gray-1A text-gray-200 shadow-sm placeholder-gray-60 placeholder-semibold focus:outline-none focus:ring-green-500 focus:border-green-500`;
const validInputClasses = `${commonInputClasses} border-gray-30`;
const errorInputClasses = `${commonInputClasses} border-green-500`;

export const TextareaField = ({ label, icon: Icon, maxLength, ...props }: TextareaFieldProps) => {
  const [field, meta] = useField(props);
  return (
    <div>
      {label && (
        <div className="mb-1 pl-1">
          <Label htmlFor={props.name}>{label}</Label>
        </div>
      )}
      <div className="relative">
        <textarea maxLength={maxLength} className={meta.touched && meta.error ? errorInputClasses : validInputClasses} {...field} {...props} rows={4} ></textarea>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {Icon && <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />}
        </div>
      </div>
      {meta.touched && meta.error ? <div className="text-green-500 pl-1 text-sm">{meta.error}</div> : null}
    </div>
  );
};

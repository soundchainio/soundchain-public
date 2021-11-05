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

const commonInputClasses = `appearance-none block w-full p-3 rounded-md border-2 border-gray-80 bg-gray-30 text-gray-200 cursor-text`;
const validInputClasses = `${commonInputClasses} border-gray-80`;
const errorInputClasses = `${commonInputClasses} border-red-500`;

export const TextareaField = ({ label, icon: Icon, maxLength, rows = 4, ...props }: TextareaFieldProps) => {
  const [field, meta] = useField(props);
  return (
    <div className="flex flex-col gap-2">
      <div className={meta.touched && meta.error ? errorInputClasses : validInputClasses}>
        {label && (
          <Label className="font-bold text-sm block cursor-text" htmlFor={props.name}>
            {label}
          </Label>
        )}
        <textarea
          maxLength={maxLength}
          className="font-bold text-sm bg-gray-30 w-full p-0 text-gray-200 border-none focus:outline-none focus:ring-transparent placeholder-gray-60 placeholder-semibold resize-none"
          id={props.name}
          {...field}
          {...props}
          rows={rows}
        ></textarea>
        {Icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
      </div>
      {meta.touched && meta.error ? <div className="text-red-500 pl-1 text-sm">{meta.error}</div> : null}
    </div>
  );
};

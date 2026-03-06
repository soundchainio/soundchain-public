import { useField } from 'formik'
import { Label } from './Label'

interface TextareaFieldProps {
  name: string
  label?: string
  placeholder?: string
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element
  maxLength?: number
  rows?: number
}

const commonInputClasses = `appearance-none block w-full p-3 rounded-md border border-gray-30 bg-gray-1A text-gray-200 cursor-text`
const validInputClasses = `${commonInputClasses} border-gray-30`
const errorInputClasses = `${commonInputClasses} border-red-500`

export const TextareaField = ({ label, icon: Icon, maxLength, rows = 4, ...props }: TextareaFieldProps) => {
  const [field, meta] = useField(props)
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className={meta.touched && meta.error ? errorInputClasses : validInputClasses}>
        {label && (
          <Label className="block cursor-text font-bold uppercase" htmlFor={props.name} textSize="xxs">
            {label}
          </Label>
        )}
        <textarea
          maxLength={maxLength}
          className="placeholder-semibold resize-none bg-transparent p-0 text-xs font-bold text-gray-200 placeholder-gray-50 focus:outline-none focus:ring-0 focus:ring-transparent"
          style={{ width: '100%', border: 'none', outline: 'none' }}
          id={props.name}
          {...field}
          {...props}
          rows={rows}
        ></textarea>
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
      </div>
      {meta.touched && meta.error ? <div className="pl-1 text-sm text-red-500">{meta.error}</div> : null}
    </div>
  )
}

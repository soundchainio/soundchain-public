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

const commonInputClasses = `relative appearance-none block w-full p-3 rounded-md border bg-gray-900 border-white/20 text-white cursor-text`
const validInputClasses = `${commonInputClasses} border-white/20`
const errorInputClasses = `${commonInputClasses} border-red-500`

export const TextareaField = ({ label, icon: Icon, maxLength, rows = 4, ...props }: TextareaFieldProps) => {
  const [field, meta] = useField(props)
  return (
    <div className="flex flex-col gap-2">
      <div className={meta.touched && meta.error ? errorInputClasses : validInputClasses}>
        {label && (
          <Label className="block cursor-text font-bold uppercase" htmlFor={props.name} textSize="xxs">
            {label}
          </Label>
        )}
        <textarea
          maxLength={maxLength}
          className="placeholder-semibold w-full resize-none border-none bg-transparent p-0 text-xs font-bold text-white placeholder-gray-50 focus:outline-none focus:ring-transparent focus:bg-transparent focus:text-white caret-white [&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:text-white [-webkit-text-fill-color:white]"
          id={props.name}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
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

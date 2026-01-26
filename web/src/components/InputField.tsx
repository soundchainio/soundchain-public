import { useField } from 'formik'
import { createRef } from 'react'
import { Label } from './Label'

interface InputFieldProps extends React.ComponentPropsWithoutRef<'input'> {
  name: string
  type: 'text' | 'email' | 'password' | 'number'
  label?: string
  placeholder?: string
  icon?: (props: React.ComponentProps<'svg'>) => JSX.Element
  symbol?: string
  alignTextCenter?: boolean
}

const commonInputClasses = `relative appearance-none block w-full p-3 rounded border bg-gray-900 border-white/20 text-gray-200 cursor-text`
const validInputClasses = `${commonInputClasses} border-white/20`
const errorInputClasses = `${commonInputClasses} border-red-500`

export const InputField = ({ label, icon: Icon, alignTextCenter, ...props }: InputFieldProps) => {
  const [field, meta] = useField(props)
  const inputRef = createRef<HTMLInputElement>()
  return (
    <>
      <div
        className={`flex flex-col ${meta.touched && meta.error ? errorInputClasses : validInputClasses}`}
        onClick={() => inputRef.current?.focus()}
      >
        {label && (
          <Label className="block cursor-auto rounded font-bold uppercase" textSize="xxs" htmlFor={props.name}>
            {label}
          </Label>
        )}
        <input
          className={`placeholder-semibold w-full border-none bg-transparent p-0 text-xs font-bold leading-3 text-gray-200 placeholder-gray-50 focus:outline-none focus:ring-transparent focus:bg-transparent focus:text-gray-200 caret-white [-webkit-text-fill-color:rgb(229,231,235)] ${
            alignTextCenter && 'text-center'
          }`}
          id={props.name}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
          {...field}
          {...props}
          ref={inputRef}
        />
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <Icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </div>
        )}
        {props.symbol && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">{props.symbol}</div>
        )}
      </div>
      {meta.touched && meta.error ? <div className="text-sm text-red-500">{meta.error}</div> : null}
    </>
  )
}

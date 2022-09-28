import { ButtonProps } from 'components/Buttons/Button'

export const CancelButton = ({ className, type = 'button', children, loading, ...rest }: ButtonProps) => {
  return (
    <div className={className}>
      <button
        className="m:px-4 w-full border-2 border-transparent border-opacity-60 bg-gray-60 bg-opacity-25 p-2 px-6 text-xs font-bold text-white"
        type={type}
        {...rest}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span className="uppercase">{children}</span>
        )}
      </button>
    </div>
  )
}

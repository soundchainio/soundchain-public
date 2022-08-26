import { ButtonProps } from 'components/Button'

export const ListNFTButton = ({ className, type = 'button', children, loading, disabled, ...rest }: ButtonProps) => {
  return (
    <div className={className}>
      <button
        className={`w-full border-2 border-blue-600 bg-blue-900 bg-opacity-60 p-2 px-6 text-xs font-medium text-white md:px-4 ${
          disabled ? 'cursor-not-allowed' : ''
        }`}
        type={type}
        disabled={disabled}
        {...rest}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </button>
    </div>
  )
}

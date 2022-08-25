import { ButtonProps } from 'components/Button'

export const BuyNFTButton = ({ className, type = 'button', children, disabled, loading, ...rest }: ButtonProps) => {
  return (
    <div className={className}>
      <button
        disabled={disabled}
        className={`m:px-4 w-full border-2 border-green-600 bg-green-900 bg-opacity-60 p-2 px-6 text-xs font-bold text-white ${
          disabled && 'cursor-not-allowed'
        }`}
        type={type}
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

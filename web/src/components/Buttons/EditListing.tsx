import { ButtonProps } from 'components/Button'
import { LinkAnchor } from '../LinkAnchor'

export const EditListingButton = ({ className, href, type = 'button', children, loading, ...rest }: ButtonProps) => {
  const Component = href ? LinkAnchor : 'button'
  return (
    <div className={className}>
      <Component
        className="bg-yellow-gradient w-full border-2 border-yellow-300 bg-opacity-60 p-2 text-xs font-bold text-white md:px-4"
        type={type}
        href={href}
        {...rest}
      >
        {loading ? (
          <div className="flex items-center justify-center px-6">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{children}</span>
        )}
      </Component>
    </div>
  )
}

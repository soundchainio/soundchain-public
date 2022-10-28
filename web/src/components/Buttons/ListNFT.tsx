import { ButtonProps } from 'components/Buttons/Button'
import { SpinAnimation } from 'components/common/SpinAnimation'

import tw from 'tailwind-styled-components'

export const ListNFTButton = (props: ButtonProps) => {
  const { className, type = 'button', children, loading, ...rest } = props

  return (
    <Button type={type} {...rest} className={className}>
      {loading ? (
        <Loading>
          <SpinAnimation />
        </Loading>
      ) : (
        <span>{children}</span>
      )}
    </Button>
  )
}

const Button = tw.button<ButtonProps>`
  ${({ disabled }) => disabled && 'cursor-not-allowed'}
  ${({ outlined }) => (outlined ? 'bg-transparent hover:bg-blue-900' : 'bg-blue-900')}

  w-full
  border-2 
  border-blue-600 
  bg-opacity-60
  p-2 
  px-6
  text-xs 
  font-medium 
  text-white 

  md:px-4
`
const Loading = tw.div`
  flex 
  items-center 
  justify-center
  px-6
`

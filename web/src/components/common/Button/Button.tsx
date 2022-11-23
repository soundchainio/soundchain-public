import tw from 'tailwind-styled-components'
import { ComponentProps } from 'react'
import { SpinAnimation } from '../SpinAnimation'

type Colors = 'blue' | 'green' | 'disabled' | 'rainbow' | 'purple'

interface ButtonProps extends ComponentProps<'button'> {
  color: Colors
  text: string
  isLoading?: boolean
}

export const Button = (props: ButtonProps) => {
  const { color, text, isLoading = false, ...rest } = props

  return (
    <Border color={color}>
      <ButtonContainer color={color} {...rest}>
        <Text color={color}>{isLoading ? <SpinAnimation /> : text}</Text>
      </ButtonContainer>
    </Border>
  )
}

const Border = tw.div<{ color: Colors }>`
  relative 
  rounded-lg
  p-[2px]
  w-full
  
  ${({ color }) => color === 'blue' && 'bg-blue-border-gradient'}
  ${({ color }) => color === 'disabled' && 'bg-disabled-border-gradient'}
  ${({ color }) => color === 'green' && 'bg-green-border-gradient'}
  ${({ color }) => color === 'purple' && 'bg-purple-border-gradient'}
  ${({ color }) => color === 'rainbow' && 'bg-rainbow-border-gradient'}
`
const ButtonContainer = tw.button<{ color: Colors }>`
  rounded-lg
  w-full
  h-full
  p-2

  ${({ color }) => color === 'blue' && 'bg-blue-background-gradient'}
  ${({ color }) => color === 'disabled' && 'bg-disabled-background-gradient'}
  ${({ color }) => color === 'green' && 'bg-green-background-gradient'}
  ${({ color }) => color === 'purple' && 'bg-purple-background-gradient'}
  ${({ color }) => color === 'rainbow' && 'bg-rainbow-background-gradient'}
`
const Text = tw.span<{ color: Colors }>`
  text-transparent
  bg-clip-text
  font-black
  text-lg
  flex
  items-center
  justify-center
  h-[30px]

  ${({ color }) => color === 'blue' && 'bg-blue-text-gradient'}
  ${({ color }) => color === 'disabled' && 'bg-disabled-text-gradient'}
  ${({ color }) => color === 'green' && 'bg-green-text-gradient'}
  ${({ color }) => color === 'purple' && 'bg-purple-text-gradient'}
  ${({ color }) => color === 'rainbow' && 'bg-rainbow-text-gradient'}
`

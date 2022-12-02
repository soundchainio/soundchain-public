import tw from 'tailwind-styled-components'
import { ComponentProps } from 'react'
import { SpinAnimation } from '../SpinAnimation'
import { CurrencyType } from 'lib/graphql'
import { Matic } from 'icons/Matic'
import { Logo as OgunIcon } from 'icons/Logo'

type Colors = 'blue' | 'green' | 'disabled' | 'rainbow' | 'purple' | 'yellow' | 'pink'
type Width = 'full' | 'contain'
interface ButtonProps extends ComponentProps<'button'> {
  color: Colors
  buttonType: 'text' | 'currency'
  currency?: {
    type?: CurrencyType
    value?: number
  }
  text: string
  isLoading?: boolean
  width?: Width
}

export const Button = (props: ButtonProps) => {
  const { color, text, isLoading = false, buttonType, currency, width = 'full', ...rest } = props

  return (
    <Border color={color} width={width}>
      <ButtonContainer color={color} {...rest}>
        {buttonType === 'text' || !currency ? (
          <Text color={color}>{isLoading ? <SpinAnimation /> : text}</Text>
        ) : (
          <Currency>
            <Buy>BUY</Buy>
            <span className="flex items-center justify-center gap-2">
              <Value>{isLoading ? <SpinAnimation /> : currency.value}</Value>
              {currency.type === CurrencyType.Matic && <Matic className="mb-[2px] h-4 w-4" />}
              {currency.type === CurrencyType.Ogun && <OgunIcon className="h-4 w-4" />}
            </span>
          </Currency>
        )}
      </ButtonContainer>
    </Border>
  )
}

const Border = tw.div<{ color: Colors; width: Width }>`
  relative 
  rounded-lg
  p-[2px]

  ${({ width }) => width === 'full' && 'w-full'}
  ${({ width }) => width === 'contain' && ''}

  ${({ color }) => color === 'blue' && 'bg-blue-300'}
  ${({ color }) => color === 'disabled' && 'bg-neutral-500'}
  ${({ color }) => color === 'green' && 'bg-green-400'}
  ${({ color }) => color === 'purple' && 'bg-fuchsia-500'}
  ${({ color }) => color === 'purple' && 'bg-yellow-400'}
  ${({ color }) => color === 'rainbow' && 'bg-rainbow-bg-gradient'}
  ${({ color }) => color === 'pink' && 'bg-rose-400'}
`
const ButtonContainer = tw.button<{ color: Colors }>`
  rounded-lg
  w-full
  h-full
  p-2
  bg-neutral-800

  ${({ color }) => color === 'blue' && 'hover:bg-blue-background-gradient'}
  ${({ color }) => color === 'disabled' && 'hover:bg-disabled-background-gradient'}
  ${({ color }) => color === 'green' && 'hover:bg-green-background-gradient'}
  ${({ color }) => color === 'purple' && 'hover:bg-purple-background-gradient'}
  ${({ color }) => color === 'rainbow' && 'hover:bg-rainbow-background-gradient'}
`
const Text = tw.span<{ color: Colors }>`
  font-bold
  text-lg
  flex
  items-center
  justify-center
  h-[30px]
  px-4
  tracking-wide

  ${({ color }) => color === 'blue' && 'text-blue-300'}
  ${({ color }) => color === 'disabled' && 'text-neutral-500'}
  ${({ color }) => color === 'green' && 'text-green-400'}
  ${({ color }) => color === 'purple' && 'text-fuchsia-500'}
  ${({ color }) => color === 'yellow' && 'text-yellow-500'}
  ${({ color }) => color === 'pink' && 'text-rose-400'}
  ${({ color }) => color === 'rainbow' && 'text-transparent bg-clip-text font-blackbg-rainbow-text-gradient'}
`

const Currency = tw.div`
  flex
  items-center
  justify-center
  gap-3
`

const Value = tw.span`
  text-white
  font-bold
  overflow-hidden
`
const Buy = tw.h2`
  text-green-400
  font-bold
`

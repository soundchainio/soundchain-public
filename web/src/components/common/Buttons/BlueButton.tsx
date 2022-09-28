import styled from 'styled-components'
import { BaseButton, BaseButtonProps } from './Base'

export const BlueButton = (props: BaseButtonProps) => {
  return <BaseButton {...props} />
}

// const StyledButton = styled(BaseButton)`
//   > div {
//     background: ${({ theme }) => theme.colors.secondary};
//   }
//`

import styled from 'styled-components'
import { BaseButton, BaseButtonProps } from './Base'

export const RainbowButton = (props: BaseButtonProps) => {
  return <BaseButton {...props} />
}

// const StyledButton = styled(BaseButton)`
//   div {
//     background: ${({ theme }) => theme.gradients.rainbow};

//     button {
//       background: ${({ theme }) => theme.gradients.rainbow};

//       &:before {
//       content: '';
//       position: absolute;
//       top: 0;
//       left: 0;
//       width: 100%;
//       height: 100%;
//       background-color: rgba(0, 0, 0, 0.4);
//       border-radius: 0.5rem;
//     }
//     }
//   }
// `

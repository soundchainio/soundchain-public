import styled, { keyframes } from 'styled-components'

export const SpinAnimation = () => {
  return <Spin />
}

const spin = keyframes`
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
`

const Spin = styled.div`
  animation: ${spin} 1s linear infinite;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  border-top-width: 2px;
  border-color: #ffffff;
`

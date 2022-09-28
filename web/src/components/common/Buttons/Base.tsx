import { IconComponent } from 'icons/types/IconComponent'
import styled from 'styled-components'
import { SpinAnimation } from '../SpinAnimation'

export interface BaseButtonProps {
  text: React.ReactNode
  icon?: IconComponent
  isLoading?: boolean
}

export const BaseButton = (props: BaseButtonProps) => {
  const { icon: Icon, isLoading, text } = props

  return (
    <Container>
      <Button>
        {Icon && (
          <IconContainer>
            <Icon />
          </IconContainer>
        )}

        {isLoading ? (
          <FlexCenter>
            <SpinAnimation />
          </FlexCenter>
        ) : (
          <Span>{text}</Span>
        )}
      </Button>
    </Container>
  )
}

export const Container = styled.div`
  background: ${({ theme }) => theme.gradients.blue};
  padding: 2px;
  border-radius: 0.5rem;
`
export const IconContainer = styled.div`
  > * {
    margin-right: 0.25rem;
    width: 1.25rem;
    height: 1.25rem;
  }
`
export const FlexCenter = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
`

export const Span = styled.span`
  z-index: 2;
`

export const Button = styled.button`
  display: flex;
  align-items: center;
  padding: 0.25rem 1rem 0.25rem 1rem;
  font-size: 0.875rem;
  line-height: 1.25rem;
  font-weight: 700;
  background: black;
  border-radius: 0.5rem;
  color: white;
  position: relative;
  text-shadow: ${({ theme }) => theme.shadows.text};

  :hover {
    background-color: transparent;
  }
`

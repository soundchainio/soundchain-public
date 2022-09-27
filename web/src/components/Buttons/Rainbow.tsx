import { IconComponent } from 'icons/types/IconComponent'
import styled from 'styled-components'

interface Props {
  text: React.ReactNode
  icon?: IconComponent
  isLoading?: boolean
}

export const RainbowButton = (props: Props) => {
  const { icon: Icon, isLoading, text } = props

  return (
    <Container className="border-4 bg-rainbow-gradient p-[2px]">
      <Button className="flex items-center bg-transparent px-4 py-1 text-sm font-bold text-slate-50">
        {Icon && <Icon className="mr-1 h-5 w-5" />}
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-t-2 border-white"></div>
          </div>
        ) : (
          <span>{text}</span>
        )}
      </Button>
    </Container>
  )
}

const Container = styled.div`
  background-color: ${({ theme }) => theme.gradients.rainbow};
`

const Button = styled.button``

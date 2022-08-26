import { IconProps } from 'icons/types/IconProps'
import { Subtitle } from './Subtitle'

interface NoResultFoundProps {
  Icon?: (props: IconProps) => JSX.Element
  type?: string
}

export const NoResultFound = ({ Icon, type }: NoResultFoundProps) => {
  return (
    <div className="flex w-full flex-col items-center py-5 px-2">
      {Icon && <Icon className="h-10 w-10" />}
      <Subtitle className="text-gray-50">
        <span>No {type ? type : 'result'} found</span>
      </Subtitle>
    </div>
  )
}

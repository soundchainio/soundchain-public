import { IconProps } from 'icons/types/IconProps';
import { Subtitle } from "./Subtitle";

interface NoResultFoundProps {
  Icon?: (props: IconProps) => JSX.Element;
  type?: string;
}

export const NoResultFound = ({ Icon, type }: NoResultFoundProps) => {
  return (
    <div className="w-full py-5 px-2 flex flex-col items-center">
      {Icon && <Icon className="h-10 w-10" />}
      <Subtitle className="text-gray-50">
        <span>
          No {type ? type : 'result'} found
        </span>
      </Subtitle>
    </div>
  )
}
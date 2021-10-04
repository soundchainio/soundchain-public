import { Subtitle } from 'components/Subtitle';

interface DescriptionProps {
  description: string;
}

export const Description = ({ description }: DescriptionProps) => {
  return (
    <div className="mx-4">
      <Subtitle size="sm"> DESCRIPTION </Subtitle>
      <p className="text-gray-80 text-xs">{description}</p>
    </div>
  )
}
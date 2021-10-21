import { Subtitle } from 'components/Subtitle';

interface DescriptionProps {
  description: string;
}

export const Description = ({ description }: DescriptionProps) => {
  return (
    <div className="">
      <Subtitle className="font-bold" size="sm">
        DESCRIPTION
      </Subtitle>
      <p className="text-gray-80 text-xs py-2 font-bold">{description}</p>
    </div>
  );
};

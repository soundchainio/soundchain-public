import { Subtitle } from 'components/Subtitle';

interface DescriptionProps {
  description: string;
  className?: string;
}

export const Description = ({ description, className }: DescriptionProps) => {
  return (
    <div className={className}>
      <Subtitle className="font-bold" size="xs">
        DESCRIPTION
      </Subtitle>
      <p className="text-gray-80 text-xs py-2 font-bold">{description}</p>
    </div>
  );
};

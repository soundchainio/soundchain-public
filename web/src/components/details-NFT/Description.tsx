import { Subtitle } from 'components/Subtitle';

interface DescriptionProps {
  description: string;
  className?: string;
}

export const Description = ({ description, className }: DescriptionProps) => {
  return (
    <div className={className}>
      <Subtitle className="font-bold text-gray-CC" size="xs">
        DESCRIPTION
      </Subtitle>
      <p className="py-2 text-xs font-medium text-gray-80">{description}</p>
    </div>
  );
};

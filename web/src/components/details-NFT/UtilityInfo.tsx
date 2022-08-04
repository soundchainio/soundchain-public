import { Subtitle } from 'components/Subtitle';

interface UtilityInfoProps {
  content: string;
  className?: string;
  label?: string;
}

export const UtilityInfo = ({ content, className }: UtilityInfoProps) => {
  if (!content) return null

  return (
    <div className={className}>
      <Subtitle className="font-bold text-gray-CC" size="xs">
        UTILITY
      </Subtitle>
      <p className="py-2 text-xs font-medium text-gray-80"><pre className="whitespace-pre-wrap">{content}</pre></p>
    </div>
  );
};

import { Ellipsis } from 'icons/Ellipsis';
import { TrackQuery } from 'lib/graphql';

export interface NFTContextButtonProps {
  track: TrackQuery['track'];
}

export const NFTContextButton = ({ track }: NFTContextButtonProps) => {
  const onEllipsisClick = () => {
    console.log('hi');
  };

  return (
    <div className="h-full flex items-center text-white" onClick={onEllipsisClick}>
      <Ellipsis className=" pl-4 w-full h-2 cursor-pointer" />
    </div>
  );
};

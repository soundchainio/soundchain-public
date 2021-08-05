import React from 'react';

interface PostStatsProps {
  likes: number;
  comments: number;
  reposts: number;
}

export const PostStats = ({ likes, comments, reposts }: PostStatsProps) => {

  const validatePlural = (word: string, qty: number) => {
    return (
      <div className="ml-1 mr-4 text-gray-400">
        {word + (qty > 1 ? 's':'')}
      </div>
    );
  };

  return (
    <div className="px-0 mt-2 py-2">
      <div className="flex items-center">
          <div className="text-sm text-gray-100 flex items-center">
            ❤️😃
            <div className="text-white font-bold">
              { likes }
            </div>
            { validatePlural('like', likes) }
          </div>
          <div className="text-sm text-gray-100 flex items-center">
            <div className="text-white font-bold">
              { comments }
            </div>
            { validatePlural('comment', comments) }
          </div>
          <div className="text-sm text-gray-100 flex items-center">
            <div className="text-white font-bold">
              { reposts }
            </div>
            { validatePlural('repost', reposts) }
          </div>
        </div>
    </div>
  );
};

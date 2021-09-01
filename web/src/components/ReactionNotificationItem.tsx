// import classNames from 'classnames';
// import { Comment } from 'icons/Comment';
import { ReactionNotification } from 'lib/graphql';
// import NextLink from 'next/link';
import React from 'react';
// import { Avatar } from './Avatar';
// import { Timestamp } from './Timestamp';

interface ReactionNotificationProps {
  notification: ReactionNotification;
  index: number;
}

export const ReactionNotificationItem = ({ notification: { id, link }, index }: ReactionNotificationProps) => {
  return (
    <div>Reaction notification</div>
    // <NextLink href={link}>
    //   <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
    //     <div className="break-words flex">
    //       <div className="flex items-center pr-4">
    //         <Avatar src={authorPicture} pixels={40} />
    //         <div className="relative">
    //           <Comment className="absolute -right-1" />
    //         </div>
    //       </div>
    //       <div>
    //         <div className="text-gray-100  flex text-sm">
    //           <div className="font-semibold">{authorName}</div>&nbsp;{body}
    //         </div>
    //         <Timestamp small datetime={createdAt} className="text-sm" />
    //       </div>
    //     </div>
    //     <div className="flex mt-4">
    //       <div className="p-4 bg-gray-30 w-full break-words text-gray-100 rounded-xl text-sm">{previewBody}</div>
    //     </div>
    //   </div>
    // </NextLink>
  );
};

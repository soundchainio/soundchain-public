import classNames from 'classnames';
import { DeletedCommentNotification } from 'lib/graphql';
import React from 'react';
import { Timestamp } from './Timestamp';

interface DeletedCommentNotificationProps {
  notification: DeletedCommentNotification;
  index: number;
}

export const DeletedCommentNotificationItem = ({
  notification: { createdAt, previewBody },
  index,
}: DeletedCommentNotificationProps) => {
  return (
    <div className={classNames('flex flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="break-words flex">
        <div>
          <div className="text-gray-100 text-sm items-center w-full inline-block">
            <span className="flex flex-wrap">The following comment was removed by an admin from our platform</span>
          </div>
          <Timestamp small datetime={createdAt} className="text-sm" />
        </div>
      </div>
      <div className="flex mt-4">
        <div className="p-4 bg-gray-30 w-full break-words text-gray-100 rounded-xl text-sm">{previewBody}</div>
      </div>
    </div>   
  );
};

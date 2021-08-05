import React, { useState } from 'react';
import { RefreshIcon, ShareIcon, ThumbUpIcon, ChatAltIcon } from '@heroicons/react/solid';
import { PostLikeOptions } from './PostLikeOptions';

export const PostActions = () => {
    const [likeOptionsOpened, setLikeOptionsOpened] = useState(false);
    const sharedClasses = `
        text-white
        text-sm
        text-gray-400
        text-center
        font-bold
        flex-1
        flex
        justify-center
        px-1
    `;

    const handleLikeButton = () => {
        setLikeOptionsOpened(!likeOptionsOpened);
    };

    return (
        <div className="bg-gray-600 px-0 py-2 flex items-center relative overflow-hidden">
            <div className={sharedClasses}>
                <div className="flex items-center" onClick={handleLikeButton}>
                    <ThumbUpIcon className="h-4 w-4 mr-1" />
                    Like
                </div>
            </div>
            <PostLikeOptions
                setLikeOptionsOpened={setLikeOptionsOpened}
                likeOptionsOpened={likeOptionsOpened}
            />
            <div className={sharedClasses}>
                <div className="flex items-center">
                    <ChatAltIcon className="h-4 w-4 mr-1" />
                    Comment
                </div>
            </div>
            <div className={sharedClasses}>
                <div className="flex items-center">
                    <RefreshIcon className="h-4 w-4 mr-1" />
                    Repost
                </div>
            </div>
            <div className={sharedClasses}>
                <div className="flex items-center">
                    <ShareIcon className="h-4 w-4 mr-1" />
                    Share
                </div>
            </div>
        </div>
    );
};

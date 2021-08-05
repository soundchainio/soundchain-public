import React from 'react';

interface PostLikeOptionsProps {
  setLikeOptionsOpened: (val: boolean) => void;
  likeOptionsOpened: boolean;
}

export const PostLikeOptions = ({ setLikeOptionsOpened, likeOptionsOpened }: PostLikeOptionsProps) => {
    const likeOptions = ["❤️", "🤘", "😃", "😢", "😎"];

    const ListOptions = likeOptions.map(option => {
        return (
            <li
                key={option}
                className="flex-1 text-center"
                onClick={() => setLikeOptionsOpened(false)}
            >
                { option }
            </li>
        )
    });

    return (
        <ul className={`
            list-none
            flex
            absolute
            duration-300
            ease-in-out
            bg-gray-600
            transform-gpu
            transform
            w-3/4
            right-0
            ${likeOptionsOpened ? "translate-x-4/4" : "translate-x-full"}
        `}>
            { ListOptions }
        </ul>
    );
};

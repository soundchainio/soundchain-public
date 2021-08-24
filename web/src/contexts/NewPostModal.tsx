import { createContext, useContext } from 'react';

type NewPostModalContextType = {
  showNewPost: boolean;
  setShowNewPost: (val: boolean) => void;
  repostId: string;
  setRepostId: (val: string) => void;
};

export const NewPostModalContext = createContext<NewPostModalContextType>({
  showNewPost: false,
  setShowNewPost: () => {},
  repostId: '',
  setRepostId: () => {},
});

export const useNewPostModalContext = () => useContext(NewPostModalContext);

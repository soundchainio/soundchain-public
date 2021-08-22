import { createContext, useContext } from 'react';

type RepostModalContextType = {
  showRepostModal: boolean;
  setShowRepostModal: (val: boolean) => void;
  repostId: string;
  setRepostId: (val: string) => void;
};

export const RepostModalContext = createContext<RepostModalContextType>({
  showRepostModal: false,
  setShowRepostModal: () => {},
  repostId: '',
  setRepostId: () => {},
});

export const useRepostModalContext = () => useContext(RepostModalContext);

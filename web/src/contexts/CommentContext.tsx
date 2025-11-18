import React, { createContext, useContext, useState } from 'react';

interface CommentContextType {
  editCommentId: string | null;
  setEditCommentId: (id: string | null) => void;
  initialValues: { body: string };
  afterSubmit: () => void;
}

const CommentContext = createContext<CommentContextType>({
  editCommentId: null,
  setEditCommentId: () => {},
  initialValues: { body: '' },
  afterSubmit: () => {},
});

export const CommentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editCommentId, setEditCommentId] = useState<string | null>(null);
  const [initialValues] = useState({ body: '' });
  const afterSubmit = () => {};

  return (
    <CommentContext.Provider value={{ editCommentId, setEditCommentId, initialValues, afterSubmit }}>
      {children}
    </CommentContext.Provider>
  );
};

export const useComment = () => useContext(CommentContext);

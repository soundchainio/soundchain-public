
import { default as React, ReactNode } from 'react';

interface ModalProps {
  show: boolean;
  children: ReactNode;
  onClose: () => void;
}

export function CustomModal({ children, show, onClose }: ModalProps) {
  if (!show) return null;

  const handleOnBackDropClick = (e) => {
    //e: React.MouseEvent
    if (e.target.id === "backdrop") onClose && onClose();
    
  };

  return (
    <div
      id="backdrop"
      onClick={handleOnBackDropClick}
      className="bg-black bg-opacity-50 backdrop-blur-sm fixed inset-0 flex items-center justify-center"
    >
      {children}
    </div>
  );
}
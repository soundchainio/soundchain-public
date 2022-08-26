import { default as React, ReactNode } from 'react'

interface ModalProps {
  show: boolean
  children: ReactNode
  onClose: () => void
}

export function CustomModal({ children, show, onClose }: ModalProps) {
  if (!show) return null

  const handleOnBackDropClick = (e: React.MouseEvent) => {
    if (e.currentTarget.id === 'backdrop') onClose && onClose()
  }

  return (
    <div
      id="backdrop"
      onClick={handleOnBackDropClick}
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
    >
      {children}
    </div>
  )
}

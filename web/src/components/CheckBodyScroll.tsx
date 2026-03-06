import { useModalState } from 'contexts/ModalContext'

export const CheckBodyScroll = () => {
  const modalState = useModalState()
  
  // Safe fallback if ModalProvider isn't mounted yet
  if (!modalState) return null
  
  const { anyModalOpened } = modalState

  return anyModalOpened ? (
    <style jsx global>{`
      body,
      main,
      html {
        overflow: hidden !important;
      }
    `}</style>
  ) : null
}
import { useModalState } from 'contexts/providers/modal'

export const CheckBodyScroll = () => {
  const { anyModalOpened } = useModalState()

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

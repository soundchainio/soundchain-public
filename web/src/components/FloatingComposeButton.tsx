import { useModalDispatch } from 'contexts/ModalContext'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import { Plus, Feather } from 'lucide-react'

/**
 * Floating Action Button (FAB) for creating posts
 * Instagram/Twitter-style compose button
 */
export const FloatingComposeButton = () => {
  const { dispatchShowCreateModal } = useModalDispatch()
  const me = useMe()
  const router = useRouter()

  const handleClick = () => {
    if (me) {
      dispatchShowCreateModal(true, 'post')
    } else {
      router.push('/login')
    }
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-110 active:scale-95 transition-all duration-200"
      aria-label="Create post"
    >
      <Feather className="w-6 h-6 text-white" />
    </button>
  )
}

export default FloatingComposeButton

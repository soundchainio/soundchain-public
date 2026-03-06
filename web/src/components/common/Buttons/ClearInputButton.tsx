import { XCircleIcon } from '@heroicons/react/24/outline'

interface ClearInputButtonProps {
  resetLink: () => void
}

export const ClearInputButton = ({ resetLink }: ClearInputButtonProps) => {
  return (
    <button className="w-6" aria-label="Close" onClick={resetLink}>
      <XCircleIcon className="w-6" stroke="#737373" />
    </button>
  )
}

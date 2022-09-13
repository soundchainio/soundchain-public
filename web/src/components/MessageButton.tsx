import { Button } from 'components/Button'
import { useMe } from 'hooks/useMe'
import { Mail } from 'icons/Mail'
import { useRouter } from 'next/router'

interface MessageButtonProps {
  profileId: string
}

export const MessageButton = ({ profileId }: MessageButtonProps) => {
  const router = useRouter()
  const me = useMe()

  if (!me || me?.profile.id === profileId) {
    return null
  }

  const handleClick = () => {
    return router.push(`/messages/${profileId}`)
  }

  return (
    <div className="h-8">
      <Button
        variant="outline-rounded"
        icon={Mail}
        className="text-md w-[100px] bg-gray-10 py-[5px] brightness-150"
        borderColor="bg-blue-gradient"
        textColor="blue-gradient-text"
        onClick={handleClick}
      >
        Message
      </Button>
    </div>
  )
}

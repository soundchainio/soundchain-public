import { Button } from 'components/common/Buttons/Button'
import { useMe } from 'hooks/useMe'
import { Checkmark } from 'icons/Checkmark'
import { useRouter } from 'next/router'
import React from 'react'

interface FollowButtonProps {
  followedId: string
  isFollowed: boolean
  showIcon?: boolean
  followedHandle: string
}

export const FollowButton = ({ followedId, isFollowed, showIcon, followedHandle }: FollowButtonProps) => {
  const me = useMe()
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  const handleClick = async () => {
    if (pending) return
    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } })
      return
    }

    setPending(true)
    try {
      await fetch('/api/follow/toggle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followedId, action: isFollowed ? 'unfollow' : 'follow' }),
      })
      router.replace(router.asPath)
    } finally {
      setPending(false)
    }
  }

  if (me?.profile.id === followedId) {
    return null
  }

  const icon = showIcon ? () => <Checkmark color={!isFollowed ? 'green' : undefined} /> : null

  return (
    <Button
      onClick={handleClick}
      variant="outline-rounded"
      borderColor="bg-green-gradient"
      bgColor={isFollowed ? 'bg-green-gradient' : undefined}
      className={`text-md w-[100px] bg-gray-10 py-1 ${isFollowed ? 'brightness-100' : 'brightness-150'}`}
      textColor={isFollowed ? 'text-white' : 'green-gradient-text'}
      icon={icon}
    >
      {isFollowed ? 'Following' : 'Follow'}
    </Button>
  )
}

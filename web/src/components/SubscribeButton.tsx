import { useMe } from 'hooks/useMe'
import { SubscribeBell } from 'icons/SubscribeBell'
import { useRouter } from 'next/router'
import React from 'react'

interface SubscribeButtonProps {
  profileId: string
  isSubscriber: boolean
  small?: boolean
}

export const SubscribeButton = ({ profileId, isSubscriber, small = false }: SubscribeButtonProps) => {
  const [pending, setPending] = React.useState(false)
  const router = useRouter()
  const me = useMe()

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (pending) return

    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } })
      return
    }

    setPending(true)
    try {
      await fetch('/api/profile/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetProfileId: profileId, action: isSubscriber ? 'unsubscribe' : 'subscribe' }),
      })
    } catch {} finally {
      setPending(false)
    }
  }

  if (me?.profile.id === profileId) {
    return null
  }

  return (
    <div
      className="-mt-2 -ml-2 p-2"
      onClick={e => {
        handleClick(e)
      }}
    >
      <button
        className={`flex-shrink-0 ${small === false ? 'h-9 w-9' : 'h-5 w-5'} ${
          isSubscriber ? 'brightness-100' : 'brightness-125'
        }`}
      >
        <SubscribeBell isSubscriber={isSubscriber} />
      </button>
    </div>
  )
}

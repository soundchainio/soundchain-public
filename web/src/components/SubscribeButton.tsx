import { useMe } from 'hooks/useMe'
import { SubscribeBell } from 'icons/SubscribeBell'
import { useSubscribeToProfileMutation, useUnsubscribeFromProfileMutation } from 'lib/graphql'
import { useRouter } from 'next/router'
import React from 'react'

interface SubscribeButtonProps {
  profileId: string
  isSubscriber: boolean
  small?: boolean
}

export const SubscribeButton = ({ profileId, isSubscriber, small = false }: SubscribeButtonProps) => {
  const [subscribeProfile, { loading: subscribeLoading }] = useSubscribeToProfileMutation()
  const [unsubscribeProfile, { loading: unsubscribeLoading }] = useUnsubscribeFromProfileMutation()
  const router = useRouter()
  const me = useMe()

  const handleClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (subscribeLoading || unsubscribeLoading) {
      return
    }

    if (!me) {
      router.push({ pathname: '/login', query: { callbackUrl: window.location.href } })
      return
    }

    const opts = { variables: { input: { profileId } } }

    if (!isSubscriber) {
      await subscribeProfile(opts)
    } else {
      await unsubscribeProfile(opts)
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

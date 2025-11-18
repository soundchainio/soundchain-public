import React from 'react'
import dynamic from 'next/dynamic'

const Player = dynamic(
  () => import('@lottiefiles/react-lottie-player').then((mod) => mod.Player),
  { ssr: false }
)

interface LoaderProps {
  loadingMessage?: string
  ring?: boolean
}

export const LoaderAnimation = ({ loadingMessage, ring }: LoaderProps) => {
  return (
    <>
      {ring ? (
        <div className="lds-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      ) : (
        <div className="flex items-center">
          <Player autoplay loop src="/animations/loading-dots.json" className="h-12 w-12" />
          <span className="text-xs font-bold text-gray-80">{loadingMessage}</span>
        </div>
      )}
    </>
  )
}
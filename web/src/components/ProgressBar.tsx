import React from 'react'

interface Props {
  progress: number
}

export const ProgressBar = ({ progress }: Props) => {
  return (
    <div className="h-[2px] w-full bg-gray-20">
      <div className={`h-full bg-rainbow-gradient`} style={{ width: `${progress}%` }}></div>
    </div>
  )
}

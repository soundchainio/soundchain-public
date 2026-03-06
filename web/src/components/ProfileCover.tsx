import classNames from 'classnames'
import Image from 'next/image'

import { VantaEffectContainer } from './VantaEffectContainer'

interface ProfileCoverProps extends React.ComponentPropsWithoutRef<'div'> {
  coverPicture: string
}

const isVideoCover = (url: string) =>
  /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) || url.includes('video/')

export const ProfileCover = ({ coverPicture, className }: ProfileCoverProps) => {
  const isDefault = coverPicture.startsWith('/')
  const effectName = coverPicture.split('/').pop()?.split('.').shift()

  return (
    <div className={classNames('relative', className)}>
      {isDefault ? (
        <VantaEffectContainer effectName={effectName as string} />
      ) : isVideoCover(coverPicture) ? (
        <video
          src={coverPicture}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <Image src={coverPicture || '/default-pictures/cover/fog.jpeg'} alt="Cover pic" fill objectFit="cover" />
      )}
    </div>
  )
}

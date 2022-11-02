import classNames from 'classnames'
import { Matic } from 'components/Matic'
import { Logo as OgunIcon } from 'icons/Logo'
import { Matic as MaticIcon } from 'icons/Matic'
import { NftSoldNotification, SellType } from 'lib/graphql'
import NextLink from 'next/link'
import Asset from './Asset/Asset'
import { Avatar } from './Avatar'
import { Ogun } from './Ogun'
import { Timestamp } from './Timestamp'

interface NFTSoldNotificationProps {
  notification: NftSoldNotification
  index: number
}

export const NFTSoldNotificationItem = ({
  notification: {
    buyerName,
    createdAt,
    buyerPicture,
    price,
    trackId,
    trackName,
    artist,
    artworkUrl,
    sellType,
    isPaymentOgun,
  },
  index,
}: NFTSoldNotificationProps) => {
  return (
    <div className={classNames('flex cursor-pointer flex-col p-4', index % 2 === 0 ? 'bg-gray-25' : 'bg-gray-20')}>
      <div className="flex break-words">
        <div className="flex min-w-[50px] items-center pr-4">
          <Avatar profile={{ profilePicture: buyerPicture }} linkToProfile={false} pixels={40} />
          <div className="relative">
            {isPaymentOgun ? (
              <OgunIcon className="absolute -right-1 h-[20px] w-[20px]" />
            ) : (
              <MaticIcon className="absolute -right-1" />
            )}
          </div>
        </div>
        <div>
          {sellType === SellType.BuyNow && (
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <span className="font-semibold">{buyerName}</span> purchased your NFT:
            </div>
          )}
          {sellType === SellType.Auction && (
            <div className="inline-block w-full items-center text-sm text-gray-100">
              <span className="font-semibold">{buyerName}</span> won the auction:
            </div>
          )}
          <Timestamp small datetime={createdAt} className="text-sm" />
        </div>
      </div>
      <NextLink href={`/tracks/${trackId}`}>
        <div className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg bg-gray-30 p-3">
          <div className="relative h-10 w-10">
            <Asset src={artworkUrl} sizes="2.5rem" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{trackName}</div>
            <div className="text-xs font-bold text-gray-80">{artist}</div>
          </div>
          {isPaymentOgun ? <Ogun value={price} className="ml-auto" /> : <Matic className="ml-auto" value={price} />}
        </div>
      </NextLink>
    </div>
  )
}

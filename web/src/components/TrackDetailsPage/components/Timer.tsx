import { TimeCounter } from 'components/TimeCounter'
import { useRouter } from 'next/router'

interface Props {
  date: Date
  endedMessage?: string
  reloadOnEnd?: boolean
}
export const Timer = (props: Props) => {
  const { date, endedMessage, reloadOnEnd } = props
  const router = useRouter()

  if (endedMessage && new Date().getTime() > date.getTime()) {
    return <div className="text-[#FF4D4D]">{endedMessage}</div>
  }

  return (
    <TimeCounter
      date={date}
      onEndTimer={() => {
        if (reloadOnEnd) {
          router.reload()
        }
      }}
    >
      {(days, hours, minutes, seconds) => (
        <div className="text-white">
          {days !== 0 && (
            <>
              {days} <span className="text-gray-80">days </span>
            </>
          )}
          {hours !== 0 && (
            <>
              {hours} <span className="text-gray-80">hours </span>
            </>
          )}
          {minutes !== 0 && (
            <>
              {minutes} <span className="text-gray-80">minutes </span>
            </>
          )}
          {seconds !== 0 && (
            <>
              {seconds} <span className="text-gray-80">seconds </span>
            </>
          )}
        </div>
      )}
    </TimeCounter>
  )
}

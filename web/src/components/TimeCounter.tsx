/* eslint-disable react-hooks/exhaustive-deps */
import { useTimer } from 'hooks/useTimer'
import { useEffect } from 'react'

export type TimeCounterProps = {
  date: Date
  onEndTimer?: () => void
  children: (days: number, hours: number, minutes: number, seconds: number) => React.ReactNode
}

export const TimeCounter = ({ date, children, onEndTimer }: TimeCounterProps) => {
  const { time, finished } = useTimer(date)

  useEffect(() => {
    if (finished && onEndTimer) {
      onEndTimer()
    }
  }, [finished])

  return <>{children(time.days, time.hours, time.minutes, time.seconds)}</>
}

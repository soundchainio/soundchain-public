/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react'

const initialState = {
  time: {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  },
  finished: false,
}

export const useTimer = (countDownDate: Date) => {
  const [data, setData] = useState(initialState)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    setData(data => ({ ...data, loading: true }))
    getTime()
    timer.current = window.setInterval(getTime, 1000)

    // Pause timer when tab hidden to save battery
    const handleVisibility = () => {
      if (document.hidden) {
        window.clearInterval(timer.current || 0)
      } else {
        getTime() // Recalculate immediately when visible
        timer.current = window.setInterval(getTime, 1000)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearInterval(timer.current || 0)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [countDownDate])

  function getTime() {
    const now = new Date().getTime()
    const distance = countDownDate.getTime() - now

    const days = Math.floor(distance / (1000 * 60 * 60 * 24))
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((distance % (1000 * 60)) / 1000)

    if (days <= 0 && hours <= 0 && minutes <= 0 && seconds <= 0) {
      setData(data => ({
        ...data,
        time: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        finished: true,
        loading: false,
      }))
      window.clearInterval(timer.current || 0)
      return
    }

    setData(data => ({
      ...data,
      time: { days, hours, minutes, seconds },
    }))
  }

  return data
}

import { useEffect, useState } from 'react'
import { breakpointsNumber } from 'utils/breakpoints'

export const useIsMobile = () => {
  const [width, setWidth] = useState(0)

  const handleWindowSizeChange = () => {
    setWidth(window.innerWidth)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWidth(window.innerWidth)
      window.addEventListener('resize', handleWindowSizeChange)
      return () => {
        window.removeEventListener('resize', handleWindowSizeChange)
      }
    }
  }, [])

  return width <= breakpointsNumber.mobileLarge
}

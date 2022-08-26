import { useEffect, useRef, useState } from 'react'

export function useMountedState<T>(value: T) {
  const [state, setState] = useState(value)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  function setStateIfMounted(newValue: T) {
    if (isMounted.current) {
      setState(newValue)
    }
  }

  return [state, setStateIfMounted] as const
}

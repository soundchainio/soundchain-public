export const timeFromSecs = (secs: number) => {
  const minutes = Math.floor(secs / 60)
  const seconds = Math.floor(secs % 60)
  const returnedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`
  return `${minutes}:${returnedSeconds}`
}

export const remainingTime = (current: number, total: number) => {
  return '-' + timeFromSecs(total - current)
}

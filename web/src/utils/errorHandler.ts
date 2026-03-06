export const errorHandler = (error: unknown) => {
  if (error instanceof Error) {
    console.error('[Soundchain Error]', error.message, error.stack)
  } else {
    console.error('[Soundchain Error] Unknown:', error)
  }
}
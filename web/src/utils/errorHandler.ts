import { captureException } from '@sentry/react';

export const errorHandler = (error: unknown) => {
  if (error instanceof Error) console.error(error.message)
  
  captureException(error);
}
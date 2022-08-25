import { captureException } from '@sentry/react';
import { Event } from '@sentry/types';
interface KeyValue {
    [key: string]: unknown
}
interface SentryErrorHandlerParams {
  error: InstanceType<ErrorConstructor>;
  tags?: KeyValue;
}

export const errorHandler = (error: unknown) => {
    if (error instanceof Error) console.error(error.message)
    
    captureException(error);
}


export const sentryDispatchManualError = (params: SentryErrorHandlerParams) => {
  if (process.env.NODE_ENV !== 'production') return;

  const { error, tags } = params;

  captureException(error, {
    tags: { ...tags, manuallyDispatched: true },
  });
};

export const sentryErrorFilter = (event: Event) => {
  if (event.tags?.manuallyDispatched) return null;

  return event;
};
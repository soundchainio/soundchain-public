import { init } from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { config } from 'config';
import { sentryErrorFilter } from 'utils/errorHandler';

export const sentryInitializer = () => {
  if (process.env.NODE_ENV !== 'production') return;
  
  init({
    dsn: config.sentryUrl,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: `${process.env.NEXT_PUBLIC_VERCEL_ENV}`,
    beforeSend: sentryErrorFilter,
  });
};
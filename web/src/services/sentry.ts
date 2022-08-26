import { init } from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { config } from 'config';

export const sentryInitializer = () => {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  
  const isProduction = Boolean(env === 'production');
  const isStaging = Boolean(env === 'preview');

  if (!isProduction || !isStaging) return;
  
  init({
    dsn: config.sentryUrl,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: env,
  });
};
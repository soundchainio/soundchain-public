import * as Sentry from "@sentry/react";

export const errorHandler = (error: unknown) => {
    const errorMessage = error.message

    console.error(errorMessage || error)
    Sentry.captureException(error);
}
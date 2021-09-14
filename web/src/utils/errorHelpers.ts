import { FormikValues } from 'formik';
import { GraphQLFormattedError } from 'graphql';

type ValidationError<T extends FormikValues> = {
  property: keyof T;
  constraints: {
    [key: string]: string;
  };
};

type FormattedErrors<T extends FormikValues> = {
  [K in keyof T]?: string;
};

export const formatValidationErrors = <T extends FormikValues>(error: GraphQLFormattedError): FormattedErrors<T> => {
  return error.extensions?.exception.validationErrors.reduce(
    (errors: FormattedErrors<T>, error: ValidationError<T>) => {
      errors[error.property] = Object.values(error.constraints).join('. ');
      return errors;
    },
    {},
  );
};

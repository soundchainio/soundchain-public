import { ApolloError } from '@apollo/client';
import React from 'react';
import { Button } from './Button';
import { Subtitle } from './Subtitle';
import { Title } from './Title';

interface FormProps {
  onBack: () => void;
  error: ApolloError | undefined;
}

export const RegisterErrorStep = ({ onBack, error }: FormProps) => {
  return (
    <div className="flex flex-col flex-1">
      <Title>Create Account Error</Title>
      {error && <Subtitle className="mt-1 mb-auto text-red-500">{error.message}</Subtitle>}
      <Button className="w-full mt-6" onClick={onBack}>
        BACK
      </Button>
    </div>
  );
};

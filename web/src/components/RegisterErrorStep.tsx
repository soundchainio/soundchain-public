import { ApolloError } from '@apollo/client';
import React from 'react';
import Button from './Button';
import { Subtitle } from './Subtitle';
import { Title } from './Title';

interface FormProps {
  onNext: () => void;
  error: ApolloError | undefined;
}

export const RegisterErrorStep = ({ onNext, error }: FormProps) => {
  return (
    <div className="flex flex-col flex-1">
      <div className="h-60 flex items-center justify-center">
        <Title className="text-center">Soundchain</Title>
      </div>
      <Title>Create Account Error</Title>
      {error && <Subtitle className="mt-1 mb-auto text-red-500">{error.message}</Subtitle>}
      <Button className="border-2 border-white border-solid w-full my-6" variant="default" onClick={onNext}>
        BACK
      </Button>
    </div>
  );
};

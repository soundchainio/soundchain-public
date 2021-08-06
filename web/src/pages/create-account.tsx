import { CompleteProfileForm } from 'components/CompleteProfileForm';
import { LockedLayout } from 'components/LockedLayout';
import { LoginNavBar } from 'components/LoginNavBar';
import { RegisterEmailForm } from 'components/RegisterEmailForm';
import { RegisterErrorStep } from 'components/RegisterErrorStep';
import { SetupProfileForm } from 'components/SetupProfileForm';
import { setJwt } from 'lib/apollo';
import { Genre, RegisterInput, useRegisterMutation, useUpdateFavoriteGenresMutation } from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { useState } from 'react';

interface RegistrationValues {
  handle?: string;
  email?: string;
  displayName?: string;
  password?: string;
  favoriteGenres?: Genre[];
}

export default function CreateAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [registrationValues, setRegistrationValues] = useState<RegistrationValues>({});
  const [register, { loading, error }] = useRegisterMutation();
  const [updateGenres, { loading: loadingProfile, error: errorProfile }] = useUpdateFavoriteGenresMutation();

  const onSubmit = async (input: RegistrationValues) => {
    const newValues = { ...registrationValues, ...input };
    setRegistrationValues(newValues);
    if (step < 2) setStep(step + 1);
    else {
      try {
        const { email, handle, displayName, password, favoriteGenres } = newValues;
        const result = await register({
          variables: { input: { email, displayName, handle, password } as RegisterInput },
        });
        setJwt(result.data?.register.jwt);
        await updateGenres({ variables: { input: { favoriteGenres: favoriteGenres as Genre[] } } });
        router.push('/');
      } catch (error) {
        setStep(-1);
      }
    }
  };

  const onBackError = () => {
    setStep(0);
  };

  return (
    <LockedLayout>
      <Head>
        <title>Soundchain - Create Account</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LoginNavBar />
      {step === 0 && <RegisterEmailForm onSubmit={onSubmit} />}
      {step === 1 && <SetupProfileForm onSubmit={onSubmit} />}
      {step === 2 && <CompleteProfileForm onSubmit={onSubmit} loading={loading || loadingProfile} />}
      {step === -1 && (error || errorProfile) && (
        <RegisterErrorStep error={error || errorProfile} onBack={onBackError} />
      )}
    </LockedLayout>
  );
}

import { CompleteProfileForm } from 'components/CompleteProfileForm';
import { RegisterEmailForm } from 'components/RegisterEmailForm';
import { SetupProfileForm } from 'components/SetupProfileForm';
import { setJwt } from 'lib/apollo';
import { Genre, RegisterInput, useRegisterMutation, useUpdateFavoriteGenresMutation } from 'lib/graphql';
import { useState } from 'react';

interface RegistrationValues {
  handle?: string;
  email?: string;
  displayName?: string;
  password?: string;
  favoriteGenres?: Genre[];
}

export default function CreateAccountPage() {
  const [step, setStep] = useState(0);
  const [registrationValues, setRegistrationValues] = useState<RegistrationValues>({});
  const [register, { loading, error }] = useRegisterMutation();
  const [updateGenres, { loading: loadingProfile, error: errorProfile }] = useUpdateFavoriteGenresMutation();

  const onSubmit = async (input: RegistrationValues) => {
    const newValues = { ...registrationValues, ...input };
    console.log(newValues);
    setRegistrationValues(newValues);
    if (step < 2) setStep(step + 1);
    else {
      const { email, handle, displayName, password, favoriteGenres } = newValues;
      try {
        const result = await register({
          variables: { input: { email, displayName, handle, password } as RegisterInput },
        });
        setJwt(result.data?.register.jwt);
        await updateGenres({ variables: { input: { favoriteGenres: favoriteGenres as Genre[] } } });
      } catch (error) {
        // handled by error state
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 lg:px-8 bg-black">
      <div className="flex flex-1 flex-col sm:mx-auto sm:w-full sm:max-w-lg bg-black">
        {step === 0 && <RegisterEmailForm onSubmit={onSubmit} />}
        {step === 1 && <SetupProfileForm onSubmit={onSubmit} />}
        {step === 2 && (
          <CompleteProfileForm
            onSubmit={onSubmit}
            loading={loading || loadingProfile}
            error={error?.message || errorProfile?.message}
          />
        )}
      </div>
    </div>
  );
}

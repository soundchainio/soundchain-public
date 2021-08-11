import { CompleteProfileForm } from 'components/CompleteProfileForm';
import { LockedLayout } from 'components/LockedLayout';
import { LoginNavBar } from 'components/LoginNavBar';
import { RegisterEmailForm } from 'components/RegisterEmailForm';
import { RegisterErrorStep } from 'components/RegisterErrorStep';
import { SetupProfileForm } from 'components/SetupProfileForm';
import { useMe } from 'hooks/useMe';
import { setJwt } from 'lib/apollo';
import {
  Genre,
  RegisterInput,
  useGenerateUploadUrlMutation,
  useRegisterMutation,
  useUpdateFavoriteGenresMutation,
  useUpdateProfilePictureMutation,
} from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

interface RegistrationValues {
  handle?: string;
  email?: string;
  displayName?: string;
  password?: string;
  favoriteGenres?: Genre[];
  profilePicture?: File;
  coverPicture?: File;
}

export default function CreateAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [registrationValues, setRegistrationValues] = useState<RegistrationValues>();
  const [register, { loading, error }] = useRegisterMutation();
  const [updateGenres] = useUpdateFavoriteGenresMutation();
  const [updateProfilePicture] = useUpdateProfilePictureMutation();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [profilePicture, setProfilePicture] = useState<File>();

  const me = useMe();

  const updateProfile = useCallback(async () => {
    if (genres) {
      await updateGenres({ variables: { input: { favoriteGenres: genres } } });
    }
    if (profilePicture) {
      const response = await generateUploadUrl({
        variables: { input: { fileType: profilePicture.type } },
      });
      await axios.put(response.data?.generateUploadUrl.uploadUrl as string, profilePicture, {
        headers: { 'Content-Type': profilePicture.type },
      });
      await updateProfilePicture({
        variables: { input: { profilePicture: response.data?.generateUploadUrl.readUrl as string } },
      });
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [generateUploadUrl, genres, profilePicture, router, updateGenres, updateProfilePicture]);

  useEffect(() => {
    if (me && registrationValues) {
      updateProfile();
    } else if (me && !registrationValues) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, registrationValues, router, updateProfile]);

  const onSubmit = async (input: RegistrationValues) => {
    const newValues = { ...registrationValues, ...input };
    setRegistrationValues(newValues);
    if (step < 2) setStep(step + 1);
    else {
      try {
        const { email, handle, displayName, password, favoriteGenres, profilePicture } = newValues;
        setGenres(favoriteGenres as Genre[]);
        setProfilePicture(profilePicture);
        const result = await register({
          variables: { input: { email, displayName, handle, password } as RegisterInput },
        });
        setJwt(result.data?.register.jwt);
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
      {step === 2 && <CompleteProfileForm onSubmit={onSubmit} loading={loading} />}
      {step === -1 && error && <RegisterErrorStep error={error} onBack={onBackError} />}
    </LockedLayout>
  );
}

import { ApolloError } from '@apollo/client';
import { AuthLayout } from 'components/AuthLayout';
import { CompleteProfileForm, CompleteProfileFormValues } from 'components/CompleteProfileForm';
import { RegisterEmailForm, RegisterEmailFormValues } from 'components/RegisterEmailForm';
import { RegisterErrorStep } from 'components/RegisterErrorStep';
import { SetupProfileForm, SetupProfileFormValues } from 'components/SetupProfileForm';
import { useMe } from 'hooks/useMe';
import { cacheFor, setJwt } from 'lib/apollo';
import {
  RegisterInput,
  useRegisterMutation,
  useUpdateCoverPictureMutation,
  useUpdateFavoriteGenresMutation,
  useUpdateMusicianTypeMutation,
  useUpdateProfilePictureMutation,
} from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';

export const getServerSideProps: GetServerSideProps = context => {
  return cacheFor(CreateAccountPage, {}, context);
};

export default function CreateAccountPage() {
  const router = useRouter();

  const [register] = useRegisterMutation();
  const [updateGenres] = useUpdateFavoriteGenresMutation();
  const [updateMusicianType] = useUpdateMusicianTypeMutation();
  const [updateProfilePicture] = useUpdateProfilePictureMutation();
  const [updateCoverPicture] = useUpdateCoverPictureMutation();

  const [registerEmailValues, setRegisterEmailValues] = useState<RegisterEmailFormValues>();
  const [setupProfileValues, setSetupProfileValues] = useState<SetupProfileFormValues>();
  const [completeProfileValues, setCompleteProfileValues] = useState<CompleteProfileFormValues>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApolloError>();

  const me = useMe();

  const updateProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (completeProfileValues && completeProfileValues.favoriteGenres.length) {
        await updateGenres({ variables: { input: { favoriteGenres: completeProfileValues.favoriteGenres } } });
      }

      if (completeProfileValues && completeProfileValues.musicianType.length) {
        await updateMusicianType({ variables: { input: { musicianTypes: completeProfileValues.musicianType } } });
      }

      if (setupProfileValues) {
        const { profilePicture, coverPicture } = setupProfileValues;

        if (profilePicture) {
          await updateProfilePicture({ variables: { input: { picture: profilePicture } } });
        }

        if (coverPicture) {
          await updateCoverPicture({ variables: { input: { picture: coverPicture } } });
        }
      }

      router.push(router.query.callbackUrl?.toString() ?? '/');
    } catch (err) {
      setError(err as ApolloError);
      setLoading(false);
    }
  }, [completeProfileValues, router, setupProfileValues, updateGenres, updateCoverPicture, updateProfilePicture]);

  const registerUser = useCallback(async () => {
    if (registerEmailValues && setupProfileValues && completeProfileValues) {
      setLoading(true);
      try {
        const result = await register({
          variables: {
            input: {
              email: registerEmailValues.email,
              displayName: setupProfileValues.displayName,
              handle: setupProfileValues.handle,
              password: completeProfileValues.password,
            } as RegisterInput,
          },
        });
        setJwt(result.data?.register.jwt);
      } catch (err) {
        setError(err as ApolloError);
        setLoading(false);
      }
    }
  }, [completeProfileValues, register, registerEmailValues, setupProfileValues]);

  useEffect(() => {
    registerUser();
  }, [completeProfileValues, registerUser]);

  useEffect(() => {
    if (me && completeProfileValues) {
      updateProfile();
    } else if (me && !completeProfileValues) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [completeProfileValues, me, router, updateProfile]);

  const onBackError = () => {
    setRegisterEmailValues(undefined);
    setSetupProfileValues(undefined);
    setCompleteProfileValues(undefined);
    setError(undefined);
  };

  return (
    <AuthLayout>
      <Head>
        <title>Soundchain - Create Account</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {!error && (
        <>
          {!registerEmailValues && <RegisterEmailForm onSubmit={setRegisterEmailValues} />}
          {registerEmailValues && !setupProfileValues && <SetupProfileForm onSubmit={setSetupProfileValues} />}
          {registerEmailValues && setupProfileValues && (
            <CompleteProfileForm onSubmit={setCompleteProfileValues} loading={loading} />
          )}
        </>
      )}
      {error && <RegisterErrorStep error={error} onBack={onBackError} />}
    </AuthLayout>
  );
}

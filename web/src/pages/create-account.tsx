import { ApolloError } from '@apollo/client';
import axios from 'axios';
import { CompleteProfileForm, CompleteProfileFormValues } from 'components/CompleteProfileForm';
import { LockedLayout } from 'components/LockedLayout';
import { LoginNavBar } from 'components/LoginNavBar';
import { RegisterEmailForm, RegisterEmailFormValues } from 'components/RegisterEmailForm';
import { RegisterErrorStep } from 'components/RegisterErrorStep';
import { SetupProfileForm, SetupProfileFormValues } from 'components/SetupProfileForm';
import { useMe } from 'hooks/useMe';
import { setJwt } from 'lib/apollo';
import {
  RegisterInput,
  useGenerateUploadUrlMutation,
  useRegisterMutation,
  useUpdateCoverPictureMutation,
  useUpdateFavoriteGenresMutation,
  useUpdateProfilePictureMutation,
} from 'lib/graphql';
import { useRouter } from 'next/dist/client/router';
import Head from 'next/head';
import { useCallback, useEffect, useState } from 'react';
import { parseProfileImageFileType } from 'utils/ParsePrfofileImageFileType';

export default function CreateAccountPage() {
  const router = useRouter();

  const [register] = useRegisterMutation();
  const [updateGenres] = useUpdateFavoriteGenresMutation();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [updateProfilePicture] = useUpdateProfilePictureMutation();
  const [updateCoverPicture] = useUpdateCoverPictureMutation();

  const [registerEmailValues, setRegisterEmailValues] = useState<RegisterEmailFormValues>();
  const [setupProfileValues, setSetupProfileValues] = useState<SetupProfileFormValues>();
  const [completeProfileValues, setCompleteProfileValues] = useState<CompleteProfileFormValues>();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApolloError>();

  const me = useMe();

  const uploadProfilePicture = useCallback(
    async (profilePicture: File) => {
      const response = await generateUploadUrl({
        variables: { input: { fileType: parseProfileImageFileType(profilePicture.type) } },
      });
      await axios.put(response.data?.generateUploadUrl.uploadUrl as string, profilePicture, {
        headers: { 'Content-Type': profilePicture.type },
      });
      await updateProfilePicture({
        variables: { input: { picture: response.data?.generateUploadUrl.readUrl as string } },
      });
    },
    [generateUploadUrl, updateProfilePicture],
  );

  const uploadCoverPicture = useCallback(
    async (coverPicture: File) => {
      const response = await generateUploadUrl({
        variables: { input: { fileType: parseProfileImageFileType(coverPicture.type) } },
      });
      await axios.put(response.data?.generateUploadUrl.uploadUrl as string, coverPicture, {
        headers: { 'Content-Type': coverPicture.type },
      });
      await updateCoverPicture({
        variables: { input: { picture: response.data?.generateUploadUrl.readUrl as string } },
      });
    },
    [generateUploadUrl, updateCoverPicture],
  );

  const updateProfile = useCallback(async () => {
    setLoading(true);
    try {
      if (completeProfileValues && completeProfileValues.favoriteGenres.length) {
        await updateGenres({ variables: { input: { favoriteGenres: completeProfileValues.favoriteGenres } } });
      }

      if (setupProfileValues) {
        const { profilePicture, coverPicture } = setupProfileValues;

        if (profilePicture) {
          await uploadProfilePicture(profilePicture);
        }

        if (coverPicture) {
          await uploadCoverPicture(coverPicture);
        }
      }

      router.push(router.query.callbackUrl?.toString() ?? '/');
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  }, [completeProfileValues, router, setupProfileValues, updateGenres, uploadCoverPicture, uploadProfilePicture]);

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
        setError(err);
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
    <LockedLayout>
      <Head>
        <title>Soundchain - Create Account</title>
        <meta name="description" content="Soundchain" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <LoginNavBar />
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
    </LockedLayout>
  );
}

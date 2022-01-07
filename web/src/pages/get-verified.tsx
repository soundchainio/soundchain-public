import { Button } from 'components/Button';
import { InboxButton } from 'components/Buttons/InboxButton';
import { CopyLink } from 'components/CopyLink';
import { Layout } from 'components/Layout';
import { FormValues, RequestVerificationForm } from 'components/RequestVerificationForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { format as formatTimestamp } from 'date-fns';
import { useMe } from 'hooks/useMe';
import { Verified } from 'icons/Verified';
import { cacheFor } from 'lib/apollo';
import {
  ProfileVerificationRequest,
  useCreateProfileVerificationRequestMutation,
  useProfileVerificationRequestQuery,
  useRemoveProfileVerificationRequestMutation,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ManageRequestTab } from 'types/ManageRequestTabType';

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(GetVerified, {}, context, apolloClient);
});

export default function GetVerified() {
  const [createRequestVerification] = useCreateProfileVerificationRequestMutation();
  const [removeRequestVerification] = useRemoveProfileVerificationRequestMutation();
  const { data: request } = useProfileVerificationRequestQuery();
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState<ProfileVerificationRequest>();
  const [myProfileLink, setMyProfileLink] = useState('');
  const me = useMe();

  const handleSubmit = async (values: FormValues) => {
    if (values.soundcloud || values.youtube || values.bandcamp) {
      setLoading(true);
      const req = await createRequestVerification({ variables: { input: values } });
      setRequested(req.data?.createProfileVerificationRequest.profileVerificationRequest);
      setLoading(false);
    }
  };

  const topNavBarProps: TopNavBarProps = {
    rightButton: <InboxButton />,
    title: 'Get Verified',
  };

  const handleResend = async () => {
    if (requested) {
      await removeRequestVerification({ variables: { id: requested.id } });
      setRequested(undefined);
    }
  };

  useEffect(() => {
    setMyProfileLink(`${window.location.origin}/profiles/${me?.handle}`);
  }, [me]);

  useEffect(() => {
    if (request?.profileVerificationRequest.id) setRequested(request.profileVerificationRequest);
  }, [request]);

  return (
    <Layout topNavBarProps={topNavBarProps}>
      <SEO
        title="Soundchain - Get Verified"
        description="Request your profile verification"
        canonicalUrl="/get-verified/"
      />
      <div className="text-white font-bold text-center w-full px-4 py-10 flex items-center justify-center">
        Receive a blue checkmark <Verified className="ml-4 scale-150" />
      </div>
      {!requested && (
        <>
          <div className="text-gray-400 text-sm px-4 pb-10 text-center">
            In order to get verified on the SoundChain platform, please submit at least one of the following:
          </div>
          <ol className="text-gray-300 text-sm space-y-4">
            <li className="font-bold text-white px-4">1. Copy your SoundChain profile link:</li>
            <CopyLink link={myProfileLink} />
            <li className="font-bold text-white px-4">
              2. Add your SoundChain link to the socials on at least one of the following platforms:
              <RequestVerificationForm loading={loading} handleSubmit={handleSubmit} />
            </li>
          </ol>
        </>
      )}
      {requested?.status === ManageRequestTab.PENDING && (
        <div className="text-gray-400 text-sm px-4 pb-10 text-center">
          Your request has been sent!
          <div className="mt-6 mb-6">
            {formatTimestamp(new Date(requested.createdAt), 'MM-dd-yyyy')} at{' '}
            {formatTimestamp(new Date(requested.createdAt), "hh:mmaaaaa'm'")}
          </div>
          <div className="mt-6 mb-6">You will get notified when we review the information you submitted.</div>
          <Image alt="Status: Pending" height="100" width="100" className="animate-spin" src="/vinyl-record.png" />
        </div>
      )}

      {requested?.status === ManageRequestTab.APPROVED && (
        <div className="text-gray-400 text-sm px-4 pb-10 text-center">Your account is legitimate!</div>
      )}

      {requested?.status === ManageRequestTab.DENIED && (
        <div className="text-gray-400 text-sm px-4 pb-10 text-center">
          Your request was <span className="font-bold text-red-500">DENIED</span>.
          <div className="mt-5">Reason: {requested.reason}</div>
          <div className="mt-5 flex items-center">
            <Button
              variant="outline"
              borderColor="bg-green-gradient"
              className="h-12 mx-6 mt-5 w-full"
              onClick={handleResend}
            >
              RESEND THE FORM
            </Button>
          </div>
        </div>
      )}
    </Layout>
  );
}

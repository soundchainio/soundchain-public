import { Avatar } from 'components/Avatar';
import { BottomSheet } from 'components/BottomSheet';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { Delete as DeleteButton } from 'components/Buttons/Delete';
import { DenyReasonModal } from 'components/DenyReasonModal';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { Bandcamp } from 'icons/Bandcamp';
import { Soundcloud } from 'icons/Soundcloud';
import { Youtube } from 'icons/Youtube';
import { cacheFor, createApolloClient } from 'lib/apollo';
import { ProfileVerificationRequest, ProfileVerificationRequestDocument, useProfileQuery, useUpdateProfileVerificationRequestMutation } from 'lib/graphql';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useState } from 'react';
import { ManageRequestTab } from 'types/ManageRequestTabType';

export interface RequestPageProps {
  data: ProfileVerificationRequest
}

interface RequestPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps: GetServerSideProps<RequestPageProps, RequestPageParams> = async context => {
  const requestId = context.params?.id;

  if (!requestId) {
    return { notFound: true };
  }

  const apolloClient = createApolloClient(context);

  const { data, error } = await apolloClient.query({
    query: ProfileVerificationRequestDocument,
    variables: { id: requestId },
    context,
  });

  if (error) {
    return { notFound: true };
  }

  return cacheFor(RequestPage, { data: data.profileVerificationRequest }, context, apolloClient);
};

export default function RequestPage({ data }: RequestPageProps) {
  const [showReason, setShowReason] = useState<boolean>(false);
  const { data: profile } = useProfileQuery({ variables: { id: data.profileId } });
  const [updateRequestVerification] = useUpdateProfileVerificationRequestMutation();
  const me = useMe();
  const router = useRouter();

  if (!profile) return null;

  const sourceList = [
    { name: 'SoundCloud', fieldName: 'soundcloud', icon: <Soundcloud className="h-7 w-7" />, link: data.soundcloud },
    { name: 'YouTube', fieldName: 'youtube', icon: <Youtube className="h-7 w-7" />, link: data.youtube },
    { name: 'BandCamp', fieldName: 'bandcamp', icon: <Bandcamp className="h-6 scale-50" />, link: data.bandcamp },
  ];

  const topNovaBarProps: TopNavBarProps = {
    leftButton: <BackButton />,
    title: "Verification Request"
  };

  const handleApprove = async () => {
    await updateRequestVerification({
      variables: {
        id: data.id,
        input: {
          reviewerProfileId: me?.profile.id,
          status: ManageRequestTab.APPROVED
        }
      }
    });
    router.push('/manage-requests');
  };

  const handleDeny = () => {
    setShowReason(true);
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="flex flex-col text-white cursor-pointer">
        <div className="relative flex items-center p-4">
          <Avatar
            profile={profile.profile}
            pixels={40}
            className="rounded-full min-w-max flex items-center"
          />
          <div className="mx-4">
            <span className="font-bold text-md text-white overflow-ellipsis overflow-hidden">{profile.profile.displayName}</span>
            <p className="text-gray-80 text-sm">@{profile.profile.userHandle}</p>
          </div>
        </div>
      </div>
      {sourceList.map((src) => (
        <div key={src.name} className="flex items-center my-8 text-white">
          <div className="flex flex-col items-center justify-center  text-xs px-2">
            <div className="w-20 flex flex-col text-xs items-center">
              {src.icon}
            </div>
            {src.name}
          </div>
          <a
            href={src.link || ''}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-400 underline"
          >
            {src.link}
          </a>
        </div>
      ))}
      <BottomSheet>
        <div className="flex items-center my-5">
          <DeleteButton onClick={handleDeny} className="h-12 w-full mx-6 mt-5 text-white text-sm">
            DENY
          </DeleteButton>
          <Button
            variant="outline"
            borderColor="bg-green-gradient"
            className="h-12 mx-6 mt-5 w-full"
            onClick={handleApprove}
          >
            APPROVE
          </Button>
        </div>
      </BottomSheet>
      <DenyReasonModal showReason={showReason} setShowReason={setShowReason} requestId={data.id} />
    </Layout>
  );
}

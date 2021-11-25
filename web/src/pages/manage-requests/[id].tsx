import { Avatar } from 'components/Avatar';
import { Button } from 'components/Button';
import { BackButton } from 'components/Buttons/BackButton';
import { Delete as DeleteButton } from 'components/Buttons/Delete';
import { CurrentRequestStatus } from 'components/CurrentRequestStatus';
import { DenyReasonModal } from 'components/DenyReasonModal';
import { DisplayName } from 'components/DisplayName';
import { Layout } from 'components/Layout';
import { TopNavBarProps } from 'components/TopNavBar';
import { useMe } from 'hooks/useMe';
import { Bandcamp } from 'icons/Bandcamp';
import { Soundcloud } from 'icons/Soundcloud';
import { Youtube } from 'icons/Youtube';
import { cacheFor } from 'lib/apollo';
import {
  ProfileVerificationRequest,
  ProfileVerificationRequestDocument,
  ProfileVerificationRequestsDocument,
  Role,
  useProfileQuery,
  useUpdateProfileVerificationRequestMutation,
} from 'lib/graphql';
import { protectPage } from 'lib/protectPage';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { ParsedUrlQuery } from 'querystring';
import { useState } from 'react';
import { ManageRequestTab } from 'types/ManageRequestTabType';

export interface RequestPageProps {
  data: ProfileVerificationRequest;
}

interface RequestPageParams extends ParsedUrlQuery {
  id: string;
}

export const getServerSideProps = protectPage<RequestPageProps, RequestPageParams>(async (context, apolloClient) => {
  const requestId = context.params?.id;

  if (!requestId) {
    return { notFound: true };
  }

  const { data, error } = await apolloClient.query({
    query: ProfileVerificationRequestDocument,
    variables: { id: requestId },
    context,
  });

  if (!context.user?.roles.includes(Role.Admin)) return { notFound: true };

  if (error) {
    return { notFound: true };
  }

  return cacheFor(RequestPage, { data: data.profileVerificationRequest }, context, apolloClient);
});

export default function RequestPage({ data }: RequestPageProps) {
  const [showReason, setShowReason] = useState<boolean>(false);
  const { data: profile } = useProfileQuery({ variables: { id: data.profileId } });
  const [updateRequestVerification] = useUpdateProfileVerificationRequestMutation({
    fetchPolicy: 'network-only',
    refetchQueries: [ProfileVerificationRequestsDocument],
  });
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
    title: 'Verification Request',
  };

  const handleApprove = async () => {
    await updateRequestVerification({
      variables: {
        id: data.id,
        input: {
          reviewerProfileId: me?.profile.id,
          status: ManageRequestTab.APPROVED,
        },
      },
    });
    router.push('/manage-requests');
  };

  const handleDeny = () => {
    setShowReason(true);
  };

  return (
    <Layout topNavBarProps={topNovaBarProps}>
      <div className="flex flex-col justify-between h-full">
        <div>
          <NextLink href={`/profiles/${data.profileId}`}>
            <div className="flex flex-col text-white cursor-pointer">
              <div className="relative flex items-center p-4">
                <Avatar profile={profile.profile} pixels={40} className="rounded-full min-w-max flex items-center" />
                <div className="mx-4">
                  <DisplayName
                    name={profile.profile.displayName}
                    verified={profile.profile.verified}
                    teamMember={profile.profile.teamMember}
                  />
                  <p className="text-gray-80 text-sm">@{profile.profile.userHandle}</p>
                </div>
              </div>
            </div>
          </NextLink>
          <CurrentRequestStatus reason={data.reason || ''} status={data.status as ManageRequestTab} />
          {sourceList.map(src => (
            <div key={src.name} className="flex items-center my-8 text-white">
              <div className="flex flex-col items-center justify-center  text-xs px-2">
                <div className="w-20 flex flex-col text-xs items-center">{src.icon}</div>
                {src.name}
              </div>
              <a
                href={normalizeURL(src.link)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 underline"
              >
                {src.link}
              </a>
            </div>
          ))}
        </div>
        <div className="flex gap-4 px-4 md:px-0 items-center my-5 mt-auto">
          {data.status !== ManageRequestTab.DENIED && (
            <DeleteButton onClick={handleDeny} className="h-12 w-full text-white text-sm">
              {data.status === ManageRequestTab.APPROVED ? 'REMOVE VERIFICATION' : 'DENY'}
            </DeleteButton>
          )}
          {data.status !== ManageRequestTab.APPROVED && (
            <Button variant="outline" borderColor="bg-green-gradient" className="h-12 w-full" onClick={handleApprove}>
              APPROVE
            </Button>
          )}
        </div>
      </div>
      <DenyReasonModal showReason={showReason} setShowReason={setShowReason} requestId={data.id} />
    </Layout>
  );
}

const normalizeURL = (url: string | undefined | null) => {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `https://${url}`;
};

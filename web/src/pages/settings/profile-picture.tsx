import { BackButton } from 'components/Buttons/BackButton';
import { ProfilePictureForm } from 'components/forms/profile/ProfilePictureForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  leftButton: <BackButton />,
};

export default function ProfilePicturePage() {
  const router = useRouter();
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext();

  useEffect(() => {
    setTopNavBarProps(topNavBarProps);
    setHideBottomNavBar(true);

    return () => {
      setHideBottomNavBar(false);
    };
  }, [setHideBottomNavBar, setTopNavBarProps]);

  return (
    <>
      <SEO
        title="Profile Picture | SoundChain"
        canonicalUrl="/settings/profile-picture/"
        description="SoundChain Profile Picture"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <ProfilePictureForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </>
  );
}

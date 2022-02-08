import { BackButton } from 'components/Buttons/BackButton';
import { CoverPictureForm } from 'components/forms/profile/CoverPictureForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Cover Picture',
  leftButton: <BackButton />,
};

export default function CoverPicturePage() {
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
        title="Cover Picture | SoundChain"
        canonicalUrl="/settings/cover-picture"
        description="SoundChain Cover Picture"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <CoverPictureForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </>
  );
}

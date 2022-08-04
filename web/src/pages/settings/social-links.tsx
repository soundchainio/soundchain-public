import { BackButton } from 'components/Buttons/BackButton';
import { SocialLinksForm } from 'components/forms/profile/SocialLinksForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Social Links',
  leftButton: <BackButton />,
};

export default function SocialLinksPage() {
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
        title="Social Links | SoundChain"
        canonicalUrl="/settings/social-links/"
        description="SoundChain Social Links"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <SocialLinksForm
          afterSubmit={() => router.push('/settings')}
          submitText="SAVE"
          submitProps={{ borderColor: 'bg-green-gradient' }}
        />
      </div>
    </>
  );
}

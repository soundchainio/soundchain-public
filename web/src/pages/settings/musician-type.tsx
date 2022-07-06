import { MusicianTypesForm } from 'components/forms/profile/MusicianTypesForm';
import SEO from 'components/SEO';
import { TopNavBarProps } from 'components/TopNavBar';
import { useLayoutContext } from 'hooks/useLayoutContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

const topNavBarProps: TopNavBarProps = {
  title: 'Musician Type',
};

export default function MusicianTypePage() {
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
        title="Musician Type | SoundChain"
        canonicalUrl="/settings/musician-type/"
        description="SoundChain Musician Type"
      />
      <div className="min-h-full flex flex-col px-6 lg:px-8 py-6">
        <div className="flex flex-1 flex-col space-y-6">
          <MusicianTypesForm
            afterSubmit={() => router.push('/settings')}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-green-gradient' }}
          />
        </div>
      </div>
    </>
  );
}

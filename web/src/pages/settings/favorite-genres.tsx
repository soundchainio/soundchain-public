import { FavoriteGenresForm } from 'components/forms/profile/FavoriteGenresForm'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { useMe } from 'hooks/useMe'
import { useRouter } from 'next/router'
import React, { useEffect } from 'react'

const topNavBarProps: TopNavBarProps = {
  title: 'Favorite Genres',
}

export default function EditFavoriteGenresPage() {
  const me = useMe()
  const router = useRouter()
  const { setTopNavBarProps, setHideBottomNavBar } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
    setHideBottomNavBar(true)

    return () => {
      setHideBottomNavBar(false)
    }
  }, [setHideBottomNavBar, setTopNavBarProps])

  return (
    <>
      <SEO
        title="Favorite Genres | SoundChain"
        canonicalUrl="/settings/cover-picture"
        description="SoundChain Favorite Genres"
      />
      <div className="flex min-h-full flex-col px-6 py-6 lg:px-8">
        <div className="flex flex-1 flex-col space-y-6">
          <FavoriteGenresForm
            afterSubmit={() => router.push('/settings')}
            initialGenres={me?.profile?.favoriteGenres || []}
            submitText="SAVE"
            submitProps={{ borderColor: 'bg-green-gradient' }}
          />
        </div>
      </div>
    </>
  )
}

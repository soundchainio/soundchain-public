import { ManageRequestTabs } from 'components/ManageRequestsTabs'
import { RequestsList } from 'components/RequestsList'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useLayoutContext } from 'hooks/useLayoutContext'
import { cacheFor } from 'lib/apollo'
import { ProfileVerificationStatusType, Role } from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { useEffect, useState } from 'react'

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  try {
    if (!context.user?.roles.includes(Role.Admin)) return { notFound: true }
    return await cacheFor(ManageRequests, {}, context, apolloClient)
  } catch (error) {
    return { notFound: true }
  }
})

const topNavBarProps: TopNavBarProps = {
  title: 'Admin Panel',
}

export default function ManageRequests() {
  const [selectedTab, setSelectedTab] = useState<ProfileVerificationStatusType>(ProfileVerificationStatusType.Pending)
  const { setTopNavBarProps } = useLayoutContext()

  useEffect(() => {
    setTopNavBarProps(topNavBarProps)
  }, [setTopNavBarProps])

  return (
    <>
      <SEO title="Get Verified | Soundchain" canonicalUrl="/manage-requests/" description="Soundchain Get Verified" />
      <div className="bg-black pt-2">
        <ManageRequestTabs selectedTab={selectedTab} setSelectedTab={setSelectedTab} />
        <RequestsList status={selectedTab} />
      </div>
    </>
  )
}

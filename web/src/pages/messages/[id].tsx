import { RefreshButton } from 'components/common/Buttons/RefreshButton'
import { Chat } from 'components/Chat/Chat'
import { ChatLayout } from 'components/Chat/ChatLayout'
import { NewMessageForm } from 'components/NewMessageForm'
import SEO from 'components/SEO'
import { TopNavBarProps } from 'components/TopNavBar'
import { useMountedState } from 'hooks/useMountedState'
import { cacheFor } from 'lib/apollo'
import { delayFocus } from 'lib/delayFocus'
import {
  ChatHistoryQuery,
  Message,
  PageInfo,
  ProfileDisplayNameDocument,
  ProfileDisplayNameQuery,
  SendMessageMutation,
  useChatHistoryQuery,
} from 'lib/graphql'
import { protectPage } from 'lib/protectPage'
import { MutableRefObject, useEffect, useRef } from 'react'

export interface PostPageProps {
  recipientName: string
  profileId: string
}

export const getServerSideProps = protectPage(async (context, apolloClient) => {
  const profileId = context.params?.id as string

  try {
    const { data } = await apolloClient.query<ProfileDisplayNameQuery>({
      query: ProfileDisplayNameDocument,
      variables: { id: profileId },
      context,
    })
    return cacheFor(ChatPage, { recipientName: data.profile.displayName, profileId }, context, apolloClient)
  } catch (error) {
    return { notFound: true }
  }
})

export default function ChatPage({ recipientName, profileId }: PostPageProps) {
  const [messages, setMessages] = useMountedState<Message[]>([])
  const [loading, setLoading] = useMountedState(false)
  const [pageInfo, setPageInfo] = useMountedState<PageInfo>({
    startCursor: '',
    hasNextPage: false,
    endCursor: '',
    hasPreviousPage: false,
    totalCount: 0,
  })
  const bottomRef = useRef<HTMLDivElement>()

  useEffect(() => {
    delayFocus('#newMessageInput')
  }, [])

  const setNewMessages = (data: ChatHistoryQuery, refetch: boolean) => {
    if (refetch) {
      setMessages([...data.chatHistory.nodes] as Message[])
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 1200)
    } else setMessages([...data.chatHistory.nodes, ...messages] as Message[])
    setPageInfo(data.chatHistory.pageInfo as PageInfo)
    setTimeout(() => setLoading(false), 1000)
  }
  const { fetchMore } = useChatHistoryQuery({
    variables: { profileId },
    onCompleted: data => setNewMessages(data, true),
    refetchWritePolicy: 'overwrite',
  })

  const onRefresh = async () => {
    setLoading(true)
    setMessages([])
    const { data } = await fetchMore({ variables: { profileId } })
    setNewMessages(data, true)
  }

  const onFetchMore = async () => {
    setLoading(true)
    const { data } = await fetchMore({ variables: { profileId, page: { after: pageInfo.startCursor } } })
    setNewMessages(data, false)
  }

  const onNewMessage = ({ sendMessage: { message } }: SendMessageMutation) => {
    setMessages([...messages, message] as Message[])
  }

  const topNavBarProps: TopNavBarProps = {
    title: recipientName,
    rightButton: <RefreshButton onClick={onRefresh} refreshing={loading} />,
  }

  return (
    <>
      <SEO title="Message | SoundChain" canonicalUrl={`/messages/${profileId}`} description="SoundChain Message" />
      <ChatLayout topNavBarProps={topNavBarProps}>
        <Chat
          messages={messages}
          pageInfo={pageInfo}
          onFetchMore={onFetchMore}
          loading={loading}
          bottomRef={bottomRef as MutableRefObject<HTMLDivElement>}
        />
        <NewMessageForm
          profileId={profileId}
          onNewMessage={onNewMessage}
          bottomRef={bottomRef as MutableRefObject<HTMLDivElement>}
        />
      </ChatLayout>
    </>
  )
}

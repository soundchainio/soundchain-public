import { ApolloCache, FetchResult } from '@apollo/client'
import { MeDocument, MeQuery, UpdateOtpMutation, User } from 'lib/graphql'

export const updateOTPCache = (client: ApolloCache<User>, { data }: FetchResult<UpdateOtpMutation>) => {
  const user = data?.updateOTP?.user as any
  const { otpSecret, otpRecoveryPhrase } = user || {}
  const cache = client.readQuery<MeQuery>({ query: MeDocument })

  if (!cache) {
    return
  }

  client.writeQuery({
    query: MeDocument,
    data: {
      me: {
        ...cache.me,
        otpSecret,
        otpRecoveryPhrase,
      },
    },
  })
}

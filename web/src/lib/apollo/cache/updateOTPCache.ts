import { ApolloCache, FetchResult } from '@apollo/client'
import { MeDocument, MeQuery, UpdateOtpMutation, User } from 'lib/graphql'

export const updateOTPCache = (client: ApolloCache<User>, { data }: FetchResult<UpdateOtpMutation>) => {
  const { otpSecret, otpRecoveryPhrase } = data?.updateOTP?.user as User
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

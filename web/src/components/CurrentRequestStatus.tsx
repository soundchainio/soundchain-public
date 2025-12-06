import { ProfileVerificationStatusType } from 'lib/graphql'

interface CurrentRequestStatusProps {
  status: ProfileVerificationStatusType
  reason?: string
}

export const CurrentRequestStatus = ({ status, reason }: CurrentRequestStatusProps) => {
  let classes = ''

  switch (status) {
    case ProfileVerificationStatusType.Pending:
      classes = 'text-blue-500 pl-2 uppercase font-bold'
      break
    case ProfileVerificationStatusType.Approved:
      classes = 'text-green-500 pl-2 uppercase font-bold'
      break
    case ProfileVerificationStatusType.Denied:
      classes = 'text-red-500 pl-2 uppercase font-bold'
      break
  }

  return (
    <div className="flex flex-col space-y-2 bg-gray-20 px-4 py-2 text-white">
      <div>
        Current status: <span className={classes}>{status}</span>
      </div>
      {reason && status === ProfileVerificationStatusType.Denied && <div>Reason: {reason} </div>}
    </div>
  )
}

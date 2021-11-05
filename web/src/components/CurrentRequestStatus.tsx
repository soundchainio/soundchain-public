import { ManageRequestTab } from 'types/ManageRequestTabType';

interface CurrentRequestStatusProps {
  status: ManageRequestTab;
  reason?: string
}

export const CurrentRequestStatus = ({ status, reason }: CurrentRequestStatusProps) => {
  let classes = '';

  switch (status) {
    case ManageRequestTab.PENDING:
      classes = 'text-blue-500 pl-2 uppercase font-bold';
      break;
    case ManageRequestTab.APPROVED:
      classes = 'text-green-500 pl-2 uppercase font-bold';
      break;
    case ManageRequestTab.DENIED:
      classes = 'text-red-500 pl-2 uppercase font-bold';
      break;
  }

  return (
    <div className="flex flex-col space-y-2 px-4 cursor-pointer py-2 bg-gray-20 text-white">
      <div>
        Current status: <span className={classes}>{status}</span>
      </div>
      {reason && status === ManageRequestTab.DENIED && <div>Reason: {reason} </div>}
    </div>
  );
};

import { ManageRequestTab } from 'types/ManageRequestTabType';

interface CurrentRequestStatusProps {
  status: ManageRequestTab;
}

export const CurrentRequestStatus = ({ status }: CurrentRequestStatusProps) => {
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
    <div className="flex flex-row space-x-2 px-4 items-center cursor-pointer py-2 bg-gray-20 text-white">
      Current status: <span className={classes}>{status}</span>
    </div>
  );
};

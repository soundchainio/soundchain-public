interface DeleteModalProps {
  id: string;
  type: string;
}

export const DeleteModal = ({ id, type }: DeleteModalProps) => {
  // const { data } = useDeleteCommentMutation({ variables: { id } });
  // const comment = data?.comment;

  const onEllipsisClick = () => {
    console.log('showDelete');
  };

  // if (!comment) return <CommentSkeleton />;

  return (
    <div className="flex flex-row space-x-3">
      {/* <Avatar src={comment.profile.profilePicture} className="mt-4" />
      <div className="flex-1 py-4 px-4 bg-gray-20 rounded-xl">
        <div className="flex items-center">
          <NextLink href={`/profiles/${comment.profile.id}`}>
            <a className="text-white font-semibold">{comment.profile.displayName}</a>
          </NextLink>
          <Timestamp className="ml-2  flex-1" datetime={comment.createdAt} />
          <Ellipsis className="pr-2 pl-2 w-10 h-3" onClick={onEllipsisClick} />
        </div>
        <pre className="text-white font-thin tracking-wide text-sm whitespace-pre-wrap mt-4">{comment.body}</pre>
      </div> */}
    </div>
  );
};

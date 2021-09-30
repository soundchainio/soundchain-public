import classNames from 'classnames';
import { InfiniteLoader } from 'components/InfiniteLoader';
import { Track } from 'components/Track';
import { TrackSkeleton } from 'components/TrackSkeleton';
import { SortOrder, SortTrackField, useTracksQuery } from 'lib/graphql';
import React from 'react';

interface TracksProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string;
  pageSize?: number;
}

export const Tracks = ({ className, profileId, pageSize = 10 }: TracksProps) => {
  const { data, fetchMore } = useTracksQuery({
    variables: {
      filter: { profileId: profileId as string },
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
      page: { first: pageSize },
    },
  });

  if (!data) {
    return (
      <div className="space-y-3">
        <TrackSkeleton />
        <TrackSkeleton />
        <TrackSkeleton />
      </div>
    );
  }

  const { nodes, pageInfo } = data.tracks;

  const loadMore = () => {
    fetchMore({
      variables: {
        page: {
          first: pageSize,
          after: pageInfo.endCursor,
        },
      },
    });
  };

  return (
    <div className={classNames('space-y-3', className)}>
      {nodes.map(({ id }) => (
        <Track key={id} trackId={id} />
      ))}
      {pageInfo.hasNextPage && <InfiniteLoader loadMore={loadMore} loadingMessage="Loading Tracks" />}
    </div>
  );
};

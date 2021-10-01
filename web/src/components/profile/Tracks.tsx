import classNames from 'classnames';
import { Track } from 'components/Track';
import { TrackSkeleton } from 'components/TrackSkeleton';
import { SortOrder, SortTrackField, useTracksQuery } from 'lib/graphql';
import React from 'react';

interface TracksProps extends React.ComponentPropsWithoutRef<'div'> {
  profileId?: string;
}

export const Tracks = ({ className, profileId }: TracksProps) => {
  const { data } = useTracksQuery({
    variables: {
      filter: profileId ? { profileId } : undefined,
      sort: { field: SortTrackField.CreatedAt, order: SortOrder.Desc },
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

  return (
    <div className={classNames('space-y-3', className)}>
      {data.tracks.nodes.map(({ id }) => (
        <div key={id} className="p-4 bg-gray-20 break-words">
          <Track trackId={id} />
        </div>
      ))}
    </div>
  );
};

import classNames from 'classnames';
import { Track } from 'components/Track';
import { SortOrder, SortTrackField, useTracksQuery } from 'lib/graphql';
import React from 'react';
import { TrackSkeleton } from './TrackSkeleton';

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
        <Track key={id} trackId={id} />
      ))}
    </div>
  );
};

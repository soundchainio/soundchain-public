import { useExploreQuery } from 'lib/graphql';
import React, { useEffect } from 'react';

interface ExplorePageProps {
  searchTerm?: string;
}

export const Explore = ({ searchTerm }: ExplorePageProps) => {
  const { data, loading } = useExploreQuery({ variables: { search: searchTerm } });

  useEffect(() => {
    if (data) console.log('data: ', data);
  }, [data]);

  return (
    <div>
      {/* {loading && <div> loading... </div>} */}
      explore component - {searchTerm}
    </div>
  );
};

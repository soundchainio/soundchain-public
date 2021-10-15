import { store } from 'contexts';
import { useHideBottomNavBar } from 'hooks/useHideBottomNavBar';
import React, { useContext } from 'react';
import { BottomNavBar } from './BottomNavBar';

export const BottomNavBarWrapper = () => {
  const { state } = useContext(store);
  const { hideBottomNavBar } = useHideBottomNavBar();

  return (
    <>
      <div id="bottom-sheet"></div>
      <div className="md:hidden">{!state?.modal.anyModalOpened && !hideBottomNavBar && <BottomNavBar />}</div>
    </>
  );
};

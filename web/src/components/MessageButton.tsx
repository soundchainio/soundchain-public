import { Button } from 'components/Button';
import { useMe } from 'hooks/useMe';
import { Mail } from 'icons/Mail';
import { useRouter } from 'next/router';
import React from 'react';

interface MessageButtonProps {
  profileId: string;
}

export const MessageButton = ({ profileId }: MessageButtonProps) => {
  const router = useRouter();
  const me = useMe();

  if (!me || me?.profile.id === profileId) {
    return null;
  }

  const handleClick = () => {
    return router.push(`/messages/${profileId}`);
  };

  return (
    <div className="h-8 ml-2">
      <Button
        variant="outline-rounded"
        icon={Mail}
        className="font-bold"
        borderColor="bg-blue-gradient"
        textColor="blue-gradient-text"
        onClick={handleClick}
      >
        Message
      </Button>
    </div>
  );
};

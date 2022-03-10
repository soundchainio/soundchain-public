import { useRouter } from 'next/router';
import { useMe } from 'hooks/useMe';
import { useEffect } from 'react';

export default function Index() {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    router.push(me ? '/marketplace' : '/marketplace');
  }, [me]);

  return null;
}

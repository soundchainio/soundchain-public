import { useRouter } from 'next/dist/client/router';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import useMe from '../hooks/useMe';
import { setJwt } from '../lib/apollo';
import { useRegisterMutation } from '../lib/graphql';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const handleEmailChange = useCallback(event => setEmail(event.target.value), []);
  const [handle, setHandle] = useState('');
  const handleHandleChange = useCallback(event => setHandle(event.target.value), []);
  const [displayName, setDisplayName] = useState('');
  const handleDisplayNameChange = useCallback(event => setDisplayName(event.target.value), []);
  const [password, setPassword] = useState('');
  const handlePasswordChange = useCallback(event => setPassword(event.target.value), []);
  const [register, { loading, error }] = useRegisterMutation();
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me) {
      router.push(router.query.callbackUrl?.toString() ?? '/');
    }
  }, [me, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const result = await register({ variables: { input: { email, handle, displayName, password } } });
      setJwt(result.data?.register.jwt);
    } catch (error) {
      // handled by error state
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input name="email" type="email" value={email} onChange={handleEmailChange} />
        </label>
        <label>
          Handle
          <input name="username" value={handle} onChange={handleHandleChange} />
        </label>
        <label>
          Display name
          <input name="name" value={displayName} onChange={handleDisplayNameChange} />
        </label>
        <label>
          Password
          <input name="password" type="password" value={password} onChange={handlePasswordChange} />
        </label>
        <button type="submit" disabled={loading}>
          Sign up
        </button>
        <Link href="/signin">
          <a>Sign in</a>
        </Link>
        {error && <p>{error.message}</p>}
      </form>
    </div>
  );
}

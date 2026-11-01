'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

const parse = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: 'The server returned an invalid response. Refresh and try again.' };
  }
};

export default function CustomerAuthPanel() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const url = new URL(window.location.href);
    const googleError = url.searchParams.get('google_error');
    if (googleError === 'account_type') {
      setError('This email is reserved for the admin account. Please use another email for customer sign-in.');
    } else if (googleError === 'configuration') {
      setError('Google sign-in is not configured yet. Use email OTP or contact the site administrator.');
    } else if (googleError) {
      setError('Google sign-in could not be completed. Please try again or use email OTP.');
    }
    if (googleError) {
      url.searchParams.delete('google_error');
      window.history.replaceState(null, '', url);
    }
  }, []);

  const requestCode = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/customer-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await parse(response);
      if (!response.ok) throw new Error(data.error);
      setCodeSent(true);
      setNotice(data.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send a verification code.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!codeSent) {
      await requestCode();
      return;
    }

    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/customer-auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await parse(response);
      if (!response.ok) throw new Error(data.error);
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next?.startsWith('/') && !next.startsWith('//') ? next : '/account');
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Could not verify your code.');
    } finally {
      setBusy(false);
    }
  };

  const startGoogleSignIn = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    const query = next ? `?${new URLSearchParams({ next })}` : '';
    window.location.assign(`/api/customer-auth/google${query}`);
  };

  return (
    <section className="customer-auth-wrap">
      <div className="customer-auth-card">
        <a className="customer-logo" href="/book">
          <img src="/mahakal-travel.jpg" alt="Mahakal Travel" />
        </a>
        <span className="booking-kicker">MAHAKAL TRAVEL ACCOUNT</span>
        <h1>Sign in with email</h1>
        <p>Enter your email and we’ll send you a one-time verification code.</p>
        {error && <div className="booking-error">{error}</div>}
        {notice && <div className="customer-notice" role="status">{notice}</div>}
        <form className="customer-auth-form" onSubmit={submit}>
          <label>
            Email address
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              readOnly={codeSent}
              placeholder="you@example.com"
            />
          </label>
          {codeSent && (
            <label>
              6-digit verification code
              <input
                autoComplete="one-time-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
              />
            </label>
          )}
          <button className="confirm-booking-btn" disabled={busy}>
            {busy ? <LoaderCircle size={16} className="spin" /> : codeSent ? 'Verify code and sign in' : 'Send verification code'}
          </button>
        </form>
        <div className="customer-auth-switch">or</div>
        <button
          type="button"
          className="confirm-booking-btn"
          style={{ background: '#fff', color: '#202124', border: '1px solid #dadce0' }}
          onClick={startGoogleSignIn}
        >
          <span aria-hidden="true" style={{ color: '#4285f4', fontWeight: 700, fontSize: 18 }}>G</span>
          Continue with Google
        </button>
        {codeSent && (
          <div className="customer-auth-switch">
            Didn’t receive it?{' '}
            <button type="button" onClick={requestCode} disabled={busy}>Send another code</button>
            <span> · </span>
            <button
              type="button"
              onClick={() => {
                setCodeSent(false);
                setCode('');
                setError('');
                setNotice('');
              }}
              disabled={busy}
            >
              Change email
            </button>
          </div>
        )}
        <a className="customer-back-link" href="/book">← Back to available trips</a>
      </div>
    </section>
  );
}

import { OAuth2Client } from 'google-auth-library';

export function safeCustomerNextPath(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/account';
  const url = new URL(value, 'https://mahakal.invalid');
  return url.origin === 'https://mahakal.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/account';
}

export function getGoogleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI to enable Google sign-in.');
  }
  return { clientId, client: new OAuth2Client(clientId, clientSecret, redirectUri), redirectUri };
}

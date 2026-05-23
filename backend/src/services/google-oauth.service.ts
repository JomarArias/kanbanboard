import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { GoogleCalendarIntegration } from '../models/GoogleCalendarIntegration.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const STATE_TTL_MS = 10 * 60 * 1000;

type StatePayload = {
  u: string;
  n: string;
  iat: number;
  exp: number;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
};

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const getOAuthConfig = () => ({
  clientId: getRequiredEnv('GOOGLE_OAUTH_CLIENT_ID'),
  clientSecret: getRequiredEnv('GOOGLE_OAUTH_CLIENT_SECRET'),
  redirectUri: getRequiredEnv('GOOGLE_OAUTH_REDIRECT_URI'),
  stateSecret: getRequiredEnv('GOOGLE_OAUTH_STATE_SECRET'),
  tokenEncryptionKey: getRequiredEnv('GOOGLE_TOKEN_ENCRYPTION_KEY'),
});

const toBase64Url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const fromBase64Url = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const signState = (payload: string, stateSecret: string) =>
  createHmac('sha256', stateSecret).update(payload).digest('base64url');

const getAesKey = (tokenEncryptionKey: string): Buffer =>
  createHash('sha256').update(tokenEncryptionKey).digest();

const encryptSecret = (plainText: string, tokenEncryptionKey: string): string => {
  const iv = randomBytes(12);
  const key = getAesKey(tokenEncryptionKey);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
};

const decryptSecret = (encryptedValue: string, tokenEncryptionKey: string): string => {
  const [ivB64, authTagB64, cipherTextB64] = encryptedValue.split('.');
  if (!ivB64 || !authTagB64 || !cipherTextB64) throw new Error('Invalid encrypted token format');

  const key = getAesKey(tokenEncryptionKey);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherTextB64, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

export const createGoogleOAuthState = (userId: string): string => {
  const { stateSecret } = getOAuthConfig();
  const now = Date.now();
  const payload: StatePayload = {
    u: userId,
    n: randomBytes(16).toString('hex'),
    iat: now,
    exp: now + STATE_TTL_MS,
  };

  const payloadB64 = toBase64Url(JSON.stringify(payload));
  const signature = signState(payloadB64, stateSecret);
  return `${payloadB64}.${signature}`;
};

export const parseAndValidateGoogleOAuthState = (state: string): StatePayload => {
  const { stateSecret } = getOAuthConfig();
  const [payloadB64, signature] = state.split('.');
  if (!payloadB64 || !signature) throw new Error('Invalid OAuth state format');

  const expectedSignature = signState(payloadB64, stateSecret);
  if (signature !== expectedSignature) throw new Error('Invalid OAuth state signature');

  const parsed = JSON.parse(fromBase64Url(payloadB64)) as StatePayload;
  if (!parsed?.u || !parsed?.exp || !parsed?.iat || !parsed?.n) {
    throw new Error('Invalid OAuth state payload');
  }
  if (Date.now() > parsed.exp) throw new Error('OAuth state expired');

  return parsed;
};

export const buildGoogleConsentUrl = (userId: string): string => {
  const { clientId, redirectUri } = getOAuthConfig();
  const state = createGoogleOAuthState(userId);

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${query.toString()}`;
};

const exchangeCodeForTokens = async (code: string): Promise<TokenResponse> => {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${JSON.stringify(json)}`);
  }

  return json as TokenResponse;
};

const fetchGoogleUserEmail = async (accessToken: string): Promise<string | undefined> => {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return undefined;
  const json = await response.json() as { email?: string };
  return json.email;
};

export const saveGoogleTokensFromCallback = async (code: string, state: string) => {
  const parsedState = parseAndValidateGoogleOAuthState(state);
  const tokens = await exchangeCodeForTokens(code);

  if (!tokens.refresh_token) {
    throw new Error('Google did not return refresh_token. Ensure access_type=offline and prompt=consent.');
  }

  const { tokenEncryptionKey } = getOAuthConfig();
  const accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const googleEmail = await fetchGoogleUserEmail(tokens.access_token);

  await GoogleCalendarIntegration.findOneAndUpdate(
    { userId: parsedState.u },
    {
      $set: {
        googleEmail: googleEmail || null,
        accessTokenEncrypted: encryptSecret(tokens.access_token, tokenEncryptionKey),
        refreshTokenEncrypted: encryptSecret(tokens.refresh_token, tokenEncryptionKey),
        accessTokenExpiresAt,
        scope: tokens.scope,
        tokenType: tokens.token_type || 'Bearer',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { userId: parsedState.u, googleEmail };
};

export const getGoogleCalendarConnectionStatus = async (userId: string) => {
  const integration = await GoogleCalendarIntegration.findOne({ userId }).lean();
  if (!integration) {
    return { connected: false };
  }

  return {
    connected: true,
    googleEmail: integration.googleEmail || null,
    accessTokenExpiresAt: integration.accessTokenExpiresAt,
    updatedAt: integration.updatedAt,
  };
};

export const disconnectGoogleCalendar = async (userId: string) => {
  const integration = await GoogleCalendarIntegration.findOne({ userId });
  if (!integration) return { disconnected: true, existed: false };

  try {
    const { tokenEncryptionKey } = getOAuthConfig();
    const refreshToken = decryptSecret(integration.refreshTokenEncrypted, tokenEncryptionKey);

    await fetch(GOOGLE_REVOKE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: refreshToken }).toString(),
    });
  } catch (error) {
    console.error('Google token revocation failed', error);
  }

  await GoogleCalendarIntegration.deleteOne({ userId });
  return { disconnected: true, existed: true };
};

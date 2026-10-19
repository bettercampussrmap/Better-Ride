import { toValidUuid } from './uuid-utils';

// Google Identity Services (GIS) & OAuth integration
// Using Google Client ID provided by Better Campus Community

export const DEFAULT_GOOGLE_CLIENT_ID =
  '365198755259-4vs0ickdnhteest5t7p4qno0qlfegd70.apps.googleusercontent.com';

const STORAGE_KEY_GOOGLE_CLIENT_ID = 'travel_buddy_google_client_id';
const STORAGE_KEY_GOOGLE_USER = 'travel_buddy_google_user';

export interface GoogleUserProfile {
  id: string; // Guaranteed RFC4122 UUID
  googleSub?: string; // Original Google numeric sub
  email: string;
  name: string;
  picture?: string;
  idToken?: string;
}

export function getGoogleClientId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY_GOOGLE_CLIENT_ID);
    if (custom && custom.trim()) return custom.trim();
  }
  const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();
  if (envId) return envId;
  return DEFAULT_GOOGLE_CLIENT_ID;
}

export function setGoogleClientId(clientId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_GOOGLE_CLIENT_ID, clientId.trim());
  }
}

export function getSavedGoogleUser(): GoogleUserProfile | null {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_GOOGLE_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          return {
            ...parsed,
            id: toValidUuid(parsed.id),
          };
        }
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function saveGoogleUser(user: GoogleUserProfile): void {
  if (typeof window !== 'undefined') {
    const sanitizedUser: GoogleUserProfile = {
      ...user,
      id: toValidUuid(user.id),
      googleSub: user.googleSub || user.id,
    };
    localStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(sanitizedUser));
  }
}


export function clearGoogleUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
  }
}

/**
 * Decode JWT token payload from Google GIS
 */
export function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode Google JWT token:', e);
    return null;
  }
}

/**
 * Initialize Google Identity Services
 */
export function initGoogleIdentity(
  onSuccess: (user: GoogleUserProfile, rawCredential: string) => void,
  onError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined') return false;

  const clientId = getGoogleClientId();
  const google = (window as any).google;

  if (!google || !google.accounts || !google.accounts.id) {
    return false;
  }

  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => {
        if (response && response.credential) {
          const payload = decodeJwt(response.credential);
          if (payload) {
            const rawSub = String(payload.sub || '');
            const user: GoogleUserProfile = {
              id: toValidUuid(rawSub),
              googleSub: rawSub,
              email: payload.email,
              name: payload.name || payload.email.split('@')[0],
              picture: payload.picture,
              idToken: response.credential,
            };
            saveGoogleUser(user);
            onSuccess(user, response.credential);
          } else {
            onError?.(new Error('Invalid Google credential received.'));
          }
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
    });
    return true;
  } catch (err) {
    console.error('Error initializing Google Accounts ID:', err);
    onError?.(err);
    return false;
  }
}

/**
 * Triggers Google Sign-In prompt or token flow
 */
export function triggerGoogleSignInPrompt(): Promise<GoogleUserProfile> {
  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    const clientId = getGoogleClientId();

    if (!google) {
      return reject(new Error('Google Identity Services SDK is still loading. Please try again in a few seconds.'));
    }

    // Try token client flow for maximum browser/iframe popup compatibility
    if (google.accounts?.oauth2?.initTokenClient) {
      try {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'email profile openid',
          prompt: 'select_account', // Always show Google account picker
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                // Fetch user info from Google userinfo endpoint using the access token
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (res.ok) {
                  const info = await res.json();
                  const rawSub = String(info.sub || '');
                  const user: GoogleUserProfile = {
                    id: toValidUuid(rawSub),
                    googleSub: rawSub,
                    email: info.email,
                    name: info.name || info.email.split('@')[0],
                    picture: info.picture,
                  };
                  saveGoogleUser(user);
                  resolve(user);
                } else {
                  reject(new Error('Failed to retrieve user profile from Google.'));
                }
              } catch (e: any) {
                reject(e);
              }
            } else if (tokenResponse?.error) {
              reject(new Error(tokenResponse.error_description || tokenResponse.error));
            }
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || 'Google Sign-In was cancelled or encountered an error.'));
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.warn('initTokenClient failed, falling back to id prompt:', err);
      }
    }

    // Fallback to accounts.id prompt
    if (google.accounts?.id?.prompt) {
      google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          reject(
            new Error(
              `Google Sign-In prompt skipped or blocked. Cause: ${notification.getNotDisplayedReason() || 'popup blocked'}`
            )
          );
        }
      });
    } else {
      reject(new Error('Google Identity library not ready.'));
    }
  });
}

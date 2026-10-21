import { ApiItem } from '../types/api';
import { RequestAuthMode } from '../components/playground/tabs/AuthTab';

export interface ApiCredentials {
  authType: RequestAuthMode;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyLocation: 'header' | 'query';
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
}

export function getDefaultCredentials(api?: Partial<ApiItem>): ApiCredentials {
  const isKey = api?.auth_type === 'api_key';
  const isOAuth = api?.auth_type === 'oauth';
  return {
    authType: isKey ? 'apiKey' : isOAuth ? 'bearer' : 'none',
    apiKeyName: isKey ? 'X-API-Key' : 'api_key',
    apiKeyValue: '',
    apiKeyLocation: 'header',
    bearerToken: '',
    basicUsername: '',
    basicPassword: ''
  };
}

export function loadApiCredentials(slug: string, api?: Partial<ApiItem>): ApiCredentials {
  try {
    const raw = localStorage.getItem(`fah_auth_${slug}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultCredentials(api),
        ...parsed
      };
    }
  } catch {
    // fallback to defaults on storage error
  }
  return getDefaultCredentials(api);
}

export function saveApiCredentials(slug: string, creds: ApiCredentials): void {
  try {
    localStorage.setItem(`fah_auth_${slug}`, JSON.stringify(creds));
    window.dispatchEvent(new CustomEvent('fah_auth_updated', { detail: { slug, creds } }));
  } catch {
    // ignore
  }
}

export function clearApiCredentials(slug: string, api?: Partial<ApiItem>): ApiCredentials {
  try {
    localStorage.removeItem(`fah_auth_${slug}`);
    const defaultCreds = getDefaultCredentials(api);
    window.dispatchEvent(new CustomEvent('fah_auth_updated', { detail: { slug, creds: defaultCreds } }));
    return defaultCreds;
  } catch {
    return getDefaultCredentials(api);
  }
}

export function hasActiveCredentials(creds: ApiCredentials): boolean {
  if (creds.authType === 'apiKey') return Boolean(creds.apiKeyValue.trim());
  if (creds.authType === 'bearer') return Boolean(creds.bearerToken.trim());
  if (creds.authType === 'basic') return Boolean(creds.basicUsername.trim() || creds.basicPassword.trim());
  return false;
}

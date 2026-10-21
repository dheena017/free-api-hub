import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Trash2,
  Check
} from 'lucide-react';
import { ApiItem } from '../../types/api';
import {
  ApiCredentials,
  loadApiCredentials,
  saveApiCredentials,
  clearApiCredentials,
  hasActiveCredentials
} from '../../utils/authStorage';
import { RequestAuthMode } from '../playground/tabs/AuthTab';

export interface ApiAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  api: ApiItem;
  onCredentialsUpdated?: (creds: ApiCredentials) => void;
}

export const ApiAuthModal: React.FC<ApiAuthModalProps> = ({
  isOpen,
  onClose,
  api,
  onCredentialsUpdated
}) => {
  const [authType, setAuthType] = useState<RequestAuthMode>('none');
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);

  // Load saved credentials when modal opens
  useEffect(() => {
    if (isOpen && api?.slug) {
      const stored = loadApiCredentials(api.slug, api);
      setAuthType(stored.authType);
      setApiKeyName(stored.apiKeyName);
      setApiKeyValue(stored.apiKeyValue);
      setApiKeyLocation(stored.apiKeyLocation);
      setBearerToken(stored.bearerToken);
      setBasicUsername(stored.basicUsername);
      setBasicPassword(stored.basicPassword);
      setShowSecret(false);
    }
  }, [isOpen, api]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ApiCredentials = {
      authType,
      apiKeyName: apiKeyName.trim() || 'X-API-Key',
      apiKeyValue: apiKeyValue.trim(),
      apiKeyLocation,
      bearerToken: bearerToken.trim(),
      basicUsername: basicUsername.trim(),
      basicPassword: basicPassword.trim()
    };
    saveApiCredentials(api.slug, updated);
    if (onCredentialsUpdated) onCredentialsUpdated(updated);
    onClose();
  };

  const handleClear = () => {
    const cleared = clearApiCredentials(api.slug, api);
    setAuthType(cleared.authType);
    setApiKeyName(cleared.apiKeyName);
    setApiKeyValue('');
    setBearerToken('');
    setBasicUsername('');
    setBasicPassword('');
    if (onCredentialsUpdated) onCredentialsUpdated(cleared);
  };

  const isConfigured = hasActiveCredentials({
    authType,
    apiKeyName,
    apiKeyValue,
    apiKeyLocation,
    bearerToken,
    basicUsername,
    basicPassword
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 font-sans"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-base font-bold text-text-base">
                {api.name} Credentials
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Credentials configure authentication globally for all endpoints in this API.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-base hover:bg-surface-elevated transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Auth Mode Tabs */}
          <div>
            <label className="block text-xs font-semibold text-text-base mb-1.5">
              Authentication Method
            </label>
            <div className="grid grid-cols-4 gap-1.5 bg-surface-elevated p-1 rounded-xl border border-border">
              {(['none', 'apiKey', 'bearer', 'basic'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAuthType(t)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer text-center ${
                    authType === t
                      ? 'bg-accent text-background font-bold shadow-sm'
                      : 'text-text-muted hover:text-text-base'
                  }`}
                >
                  {t === 'none'
                    ? 'No Auth'
                    : t === 'apiKey'
                      ? 'API Key'
                      : t === 'bearer'
                        ? 'Bearer'
                        : 'Basic'}
                </button>
              ))}
            </div>
          </div>

          {/* Mode 1: No Auth */}
          {authType === 'none' && (
            <div className="p-3.5 rounded-xl bg-surface-elevated/40 border border-border text-xs text-text-muted space-y-1">
              <div className="flex items-center gap-2 text-text-base font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Public / Zero-Auth Mode</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Requests will be dispatched without authorization headers.
                {api.auth_type && api.auth_type !== 'none' && (
                  <span className="block mt-1 text-amber-400">
                    Note: This catalog lists {api.auth_type}. If live requests require a key, switch to API Key or Bearer Token.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Mode 2: API Key */}
          {authType === 'apiKey' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1">
                    Key Parameter Name
                  </label>
                  <input
                    type="text"
                    placeholder="X-API-Key or api_key"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    spellCheck={false}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1">
                    Pass Key Location
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-surface p-1 rounded-xl border border-border h-[38px]">
                    <button
                      type="button"
                      onClick={() => setApiKeyLocation('header')}
                      className={`rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        apiKeyLocation === 'header'
                          ? 'bg-accent text-background font-bold shadow-sm'
                          : 'text-text-muted hover:text-text-base'
                      }`}
                    >
                      Header
                    </button>
                    <button
                      type="button"
                      onClick={() => setApiKeyLocation('query')}
                      className={`rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                        apiKeyLocation === 'query'
                          ? 'bg-accent text-background font-bold shadow-sm'
                          : 'text-text-muted hover:text-text-base'
                      }`}
                    >
                      Query Param
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  API Key Value
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Paste your developer API key..."
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    spellCheck={false}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 text-text-muted hover:text-text-base cursor-pointer"
                    title={showSecret ? 'Hide secret' : 'Show secret'}
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3: Bearer Token */}
          {authType === 'bearer' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
              <div>
                <label className="block text-[11px] font-mono text-text-muted mb-1">
                  Bearer Token (JWT / OAuth)
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="Paste Bearer token (without 'Bearer ' prefix)..."
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    spellCheck={false}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-2.5 text-text-muted hover:text-text-base cursor-pointer"
                    title={showSecret ? 'Hide token' : 'Show token'}
                  >
                    {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-text-muted font-mono mt-1">
                  Attached automatically as: <code>Authorization: Bearer {'<token>'}</code>
                </p>
              </div>
            </div>
          )}

          {/* Mode 4: Basic Auth */}
          {authType === 'basic' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-surface-elevated/40 border border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1">Username</label>
                  <input
                    type="text"
                    placeholder="Username"
                    value={basicUsername}
                    onChange={(e) => setBasicUsername(e.target.value)}
                    spellCheck={false}
                    className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-text-muted mb-1">Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      placeholder="Password"
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                      spellCheck={false}
                      className="w-full bg-surface border border-border rounded-xl px-3 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 text-text-muted hover:text-text-base cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-text-muted font-mono">
                Attached automatically as Base64 encoded Basic Auth header.
              </p>
            </div>
          )}

          {/* Official Documentation Link */}
          {api.documentation_url && (
            <div className="flex items-center justify-between text-xs text-text-muted pt-1">
              <span>Need an API key or developer token?</span>
              <a
                href={api.documentation_url}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline flex items-center gap-1 font-medium"
              >
                <span>Official Portal</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-border">
            {isConfigured ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Credentials</span>
              </button>
            ) : (
              <span className="text-[11px] text-text-muted font-mono italic">
                Saved in local browser session
              </span>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface text-xs font-medium text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-background text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save & Apply</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

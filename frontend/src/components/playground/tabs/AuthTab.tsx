import React from 'react';
import { KeyRound, Eye, EyeOff } from 'lucide-react';

export type RequestAuthMode = 'none' | 'apiKey' | 'bearer' | 'basic';

export interface AuthTabProps {
  apiAuthType?: string;
  authType: RequestAuthMode;
  onSetAuthType: (type: RequestAuthMode) => void;
  apiKeyName: string;
  onSetApiKeyName: (val: string) => void;
  apiKeyValue: string;
  onSetApiKeyValue: (val: string) => void;
  apiKeyLocation: 'header' | 'query';
  onSetApiKeyLocation: (loc: 'header' | 'query') => void;
  bearerToken: string;
  onSetBearerToken: (val: string) => void;
  basicUsername: string;
  onSetBasicUsername: (val: string) => void;
  basicPassword: string;
  onSetBasicPassword: (val: string) => void;
  showSecret: boolean;
  onToggleShowSecret: () => void;
}

export const AuthTab: React.FC<AuthTabProps> = ({
  apiAuthType,
  authType,
  onSetAuthType,
  apiKeyName,
  onSetApiKeyName,
  apiKeyValue,
  onSetApiKeyValue,
  apiKeyLocation,
  onSetApiKeyLocation,
  bearerToken,
  onSetBearerToken,
  basicUsername,
  onSetBasicUsername,
  basicPassword,
  onSetBasicPassword,
  showSecret,
  onToggleShowSecret,
}) => {
  return (
    <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border space-y-4 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div>
          <span className="text-xs font-bold text-text-base">Authorization Type</span>
          <p className="text-[11px] text-text-muted mt-0.5">
            Configure authentication headers or API keys for remote endpoint authorization.
          </p>
        </div>

        {/* Auth Type Pills */}
        <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border overflow-x-auto scrollbar-none">
          {(['none', 'apiKey', 'bearer', 'basic'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onSetAuthType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer capitalize ${
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
                    ? 'Bearer Token'
                    : 'Basic Auth'}
            </button>
          ))}
        </div>
      </div>

      {/* No Auth State */}
      {authType === 'none' && (
        <div className="flex items-center justify-between text-xs text-text-muted py-2">
          <span>This request does not use any authentication credentials.</span>
          {apiAuthType && apiAuthType !== 'none' && (
            <button
              type="button"
              onClick={() => onSetAuthType('apiKey')}
              className="text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>This API lists {apiAuthType}. Click to configure API Key.</span>
            </button>
          )}
        </div>
      )}

      {/* API Key View */}
      {authType === 'apiKey' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">Key Name</label>
            <input
              type="text"
              placeholder="X-API-Key or api_key"
              value={apiKeyName}
              onChange={(e) => onSetApiKeyName(e.target.value)}
              spellCheck={false}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">Key Value</label>
            <div className="relative flex items-center">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="Paste your developer key..."
                value={apiKeyValue}
                onChange={(e) => onSetApiKeyValue(e.target.value)}
                spellCheck={false}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
              />
              <button
                type="button"
                onClick={onToggleShowSecret}
                className="absolute right-2.5 text-text-muted hover:text-text-base cursor-pointer"
                title={showSecret ? 'Hide key' : 'Show key'}
              >
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">Pass Key In</label>
            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border h-[38px]">
              <button
                type="button"
                onClick={() => onSetApiKeyLocation('header')}
                className={`flex-1 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
                  apiKeyLocation === 'header'
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                Header
              </button>
              <button
                type="button"
                onClick={() => onSetApiKeyLocation('query')}
                className={`flex-1 py-1 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
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
      )}

      {/* Bearer Token View */}
      {authType === 'bearer' && (
        <div className="space-y-2">
          <label className="block text-[11px] font-mono text-text-muted">Bearer Token</label>
          <div className="relative flex items-center">
            <input
              type={showSecret ? 'text' : 'password'}
              placeholder="eyJhbGciOi... or OAuth token"
              value={bearerToken}
              onChange={(e) => onSetBearerToken(e.target.value)}
              spellCheck={false}
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 pr-9 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={onToggleShowSecret}
              className="absolute right-3 text-text-muted hover:text-text-base cursor-pointer"
              title={showSecret ? 'Hide token' : 'Show token'}
            >
              {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-[11px] font-mono text-text-muted">
            Sends header:{' '}
            <span className="text-accent">
              Authorization: Bearer {bearerToken ? '••••••••' : '<token>'}
            </span>
          </p>
        </div>
      )}

      {/* Basic Auth View */}
      {authType === 'basic' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">Username</label>
            <input
              type="text"
              placeholder="Username / Client ID"
              value={basicUsername}
              onChange={(e) => onSetBasicUsername(e.target.value)}
              spellCheck={false}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">Password</label>
            <input
              type="password"
              placeholder="Password / Secret"
              value={basicPassword}
              onChange={(e) => onSetBasicPassword(e.target.value)}
              spellCheck={false}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-mono text-text-base focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
};

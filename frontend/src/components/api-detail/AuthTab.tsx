import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Check,
  Zap,
  Info,
  Lock
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

export interface AuthTabProps {
  api: ApiItem;
  onCredentialsUpdated?: (creds: ApiCredentials) => void;
  onOpenPlayground: () => void;
}

export const AuthTab: React.FC<AuthTabProps> = ({
  api,
  onCredentialsUpdated,
  onOpenPlayground
}) => {
  const [authType, setAuthType] = useState<RequestAuthMode>('none');
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (api?.slug) {
      const stored = loadApiCredentials(api.slug, api);
      setAuthType(stored.authType);
      setApiKeyName(stored.apiKeyName);
      setApiKeyValue(stored.apiKeyValue);
      setApiKeyLocation(stored.apiKeyLocation);
      setBearerToken(stored.bearerToken);
      setBasicUsername(stored.basicUsername);
      setBasicPassword(stored.basicPassword);
    }
  }, [api]);

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
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
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
    <section
      role="tabpanel"
      id="tabpanel-auth"
      aria-labelledby="tab-auth"
      className="space-y-4 animate-in fade-in duration-200"
    >
      {/* Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-xl bg-accent/10 text-accent border border-accent/20 shrink-0">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-text-base">{api.name} Authentication</h2>
              {isConfigured ? (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Credentials Active
                </span>
              ) : api.auth_type && api.auth_type !== 'none' ? (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {api.auth_type.toUpperCase()} Recommended
                </span>
              ) : (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border">
                  No Auth Required (Open Public API)
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-1 max-w-2xl">
              Configure credentials once. They are safely stored in your browser session and automatically injected when making requests or generating code.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPlayground}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-background bg-accent hover:bg-accent-hover transition-all shadow-sm cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Zap className="h-3.5 w-3.5" />
          <span>Test in Playground</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main Configuration Form (2 cols) */}
        <div className="lg:col-span-2 bg-surface border border-border rounded-2xl p-5 sm:p-6 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Auth Mode Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                Authentication Scheme
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'none', label: 'No Auth' },
                    { id: 'apiKey', label: 'API Key' },
                    { id: 'bearer', label: 'Bearer Token' },
                    { id: 'basic', label: 'Basic Auth' }
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAuthType(opt.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer text-center ${
                      authType === opt.id
                        ? 'border-accent bg-accent/15 text-accent font-bold shadow-sm'
                        : 'border-border bg-surface-elevated text-text-muted hover:text-text-base hover:bg-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scheme Fields */}
            {authType === 'none' && (
              <div className="p-4 rounded-xl bg-surface-elevated/40 border border-border text-xs text-text-muted flex items-start gap-3">
                <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-text-base">Public Access Mode</p>
                  <p className="mt-0.5 text-text-muted/80">
                    Requests will be sent without credential headers or query parameters. This is suitable for free public APIs like Open-Meteo.
                  </p>
                </div>
              </div>
            )}

            {authType === 'apiKey' && (
              <div className="space-y-4 p-4 rounded-xl bg-surface-elevated/40 border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-base">Header or Query Param Name</label>
                    <input
                      type="text"
                      value={apiKeyName}
                      onChange={(e) => setApiKeyName(e.target.value)}
                      placeholder="e.g. X-API-Key, apikey"
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs font-mono text-text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-base">Parameter Placement</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setApiKeyLocation('header')}
                        className={`py-2 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                          apiKeyLocation === 'header'
                            ? 'border-accent bg-accent/15 text-accent font-bold'
                            : 'border-border bg-surface text-text-muted hover:text-text-base'
                        }`}
                      >
                        HTTP Header
                      </button>
                      <button
                        type="button"
                        onClick={() => setApiKeyLocation('query')}
                        className={`py-2 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
                          apiKeyLocation === 'query'
                            ? 'border-accent bg-accent/15 text-accent font-bold'
                            : 'border-border bg-surface text-text-muted hover:text-text-base'
                        }`}
                      >
                        URL Query
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-base">API Key Value</label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={apiKeyValue}
                      onChange={(e) => setApiKeyValue(e.target.value)}
                      placeholder="Enter your API key token..."
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base p-1"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {authType === 'bearer' && (
              <div className="space-y-3 p-4 rounded-xl bg-surface-elevated/40 border border-border">
                <label className="text-xs font-bold text-text-base">Bearer Access Token</label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={bearerToken}
                    onChange={(e) => setBearerToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full pl-3 pr-10 py-2.5 rounded-xl bg-surface border border-border text-xs font-mono text-text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-base p-1"
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted">
                  Will be automatically sent as <code>Authorization: Bearer &lt;token&gt;</code>.
                </p>
              </div>
            )}

            {authType === 'basic' && (
              <div className="space-y-4 p-4 rounded-xl bg-surface-elevated/40 border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-base">Username</label>
                    <input
                      type="text"
                      value={basicUsername}
                      onChange={(e) => setBasicUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-text-base">Password</label>
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={basicPassword}
                      onChange={(e) => setBasicPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-text-base focus:border-accent focus:ring-1 focus:ring-accent outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Reset Credentials</span>
              </button>

              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-background bg-accent hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-background" />
                    <span>Saved Successfully!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Save Credentials</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Informational Sidebar (1 col) */}
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-base font-bold text-sm">
              <Lock className="h-4 w-4 text-accent" />
              <span>Security & Storage</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              All credentials you input are stored strictly in your browser&apos;s local storage (<code>localStorage</code>) under this API&apos;s unique slug.
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              They are never logged, persisted in database servers, or shared with third parties.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-text-base font-bold text-sm">
              <Info className="h-4 w-4 text-accent" />
              <span>API Provider Requirements</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Auth Type</span>
                <span className="font-mono font-semibold text-text-base uppercase">
                  {api.auth_type || 'None'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/60">
                <span className="text-text-muted">Pricing</span>
                <span className="font-semibold text-text-base capitalize">
                  {api.pricing_tier ? api.pricing_tier.replace(/_/g, ' ') : 'Free'}
                </span>
              </div>
              {api.documentation_url && (
                <a
                  href={api.documentation_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline pt-2 font-medium"
                >
                  <span>Official Auth Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

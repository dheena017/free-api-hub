import React, { useState } from 'react';
import { ApiItem } from '../../types/api';
import {
  Layers,
  CheckCircle2,
  Sparkles,
  KeyRound,
  Lock,
  ShieldCheck,
  Zap,
  Globe,
  ExternalLink,
  Code2,
  Terminal
} from 'lucide-react';
import { CodeSnippetViewer } from '../CodeSnippetViewer';
import { generateSnippetForLanguage, SnippetLanguage } from '../../utils/codeSnippets';

export interface ArchitectureSdkTabProps {
  api: ApiItem;
}

const getApiUseCases = (api: ApiItem): string[] => {
  if (api.use_cases && api.use_cases.length > 0) {
    return api.use_cases;
  }
  const ep = api.endpoint || api.endpoints?.[0]?.path || 'endpoints';
  return [
    `Direct integration into applications consuming ${api.name} data`,
    `Automated querying of ${ep} for dynamic content feeds`,
    `Client-side widgets and developer tools in the ${api.category.replace('-', ' ')} domain`
  ];
};

export const ArchitectureSdkTab: React.FC<ArchitectureSdkTabProps> = ({ api }) => {
  const [selectedSdkLang, setSelectedSdkLang] = useState<SnippetLanguage>('js');

  const defaultEndpoint = api.endpoints?.[0]?.path || api.endpoint || '';
  const fullTargetUrl = defaultEndpoint.startsWith('http')
    ? defaultEndpoint
    : `${api.base_url.replace(/\/+$/, '')}/${defaultEndpoint.replace(/^\/+/, '')}`;

  const currentSnippet = generateSnippetForLanguage(
    selectedSdkLang,
    fullTargetUrl,
    api.endpoints?.[0]?.method || 'GET',
    {},
    {},
    undefined
  );

  return (
    <div
      role="tabpanel"
      id="tabpanel-overview"
      aria-labelledby="tab-overview"
      className="space-y-6 animate-in fade-in duration-200"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Technical Overview & Production Use Cases */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm transition-colors">
          <div className="space-y-1 pb-3 border-b border-border">
            <h3 className="text-base font-bold text-text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent" />
              <span>Technical Overview & Capabilities</span>
            </h3>
            <p className="text-xs text-text-muted">
              Core architecture, data scope, and features of {api.name}.
            </p>
          </div>

          <div className="space-y-3 text-xs text-text-muted leading-relaxed font-sans">
            {(api.detailed_description || api.description).split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Key Capabilities & Features */}
          {api.features && api.features.length > 0 && (
            <div className="bg-surface-elevated/40 p-4 rounded-xl border border-border space-y-2.5">
              <h4 className="text-xs font-semibold text-text-base uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Key Capabilities & Features</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-text-muted">
                {api.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Production Use Cases */}
          <div className="bg-surface-elevated/40 p-4 rounded-xl border border-border space-y-3 pt-3.5">
            <h4 className="text-xs font-semibold text-text-base uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Recommended Production Use Cases</span>
            </h4>
            <ul className="space-y-2 text-xs text-text-muted">
              {getApiUseCases(api).map((useCase, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-accent font-bold mt-0.5">•</span>
                  <span className="leading-relaxed">{useCase}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Authentication & Access Rules */}
        <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm transition-colors flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  <span>Authentication & Access Credentials</span>
                </h3>
                <p className="text-xs text-text-muted">
                  Client requirements and authorization policies.
                </p>
              </div>

              <div>
                <span
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                    api.auth_type === 'none'
                      ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
                  }`}
                >
                  {api.auth_type === 'none' ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>No Key Required (Public)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      <span>{api.auth_type.replace('_', ' ').toUpperCase()} Required</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-surface-elevated/40 rounded-xl border border-border space-y-2">
                <div className="font-semibold text-text-base flex items-center gap-1.5 font-mono uppercase text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Authorization Flow</span>
                </div>
                {api.auth_type === 'none' ? (
                  <p className="text-text-muted leading-relaxed">
                    This endpoint is 100% public. Zero API keys, client secrets, or user registration needed. Direct HTTP calls from both frontend browser applications and backend servers succeed immediately without credentials.
                  </p>
                ) : (
                  <p className="text-text-muted leading-relaxed">
                    Requests require an active API key. Attach your token via HTTP headers (e.g.{' '}
                    <code className="text-accent font-mono">x-api-key: YOUR_KEY</code>) or as a query parameter. Keys can be acquired from the provider's developer dashboard.
                  </p>
                )}
              </div>

              {/* Rate Limit and Quota info */}
              <div className="p-4 bg-surface-elevated/40 rounded-xl border border-border space-y-2">
                <div className="font-semibold text-text-base flex items-center gap-1.5 font-mono uppercase text-[11px]">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Rate Limit & Quotas</span>
                </div>
                <p className="text-text-muted leading-relaxed">
                  {api.rate_limit ||
                    (api.auth_type === 'none'
                      ? 'Fair usage policy applies. Recommended maximum throughput: 60 requests/minute to respect upstream resources.'
                      : 'Developer tier: Consult official documentation for tier-specific limits.')}
                </p>
              </div>

              <div className="p-4 bg-surface-elevated/40 rounded-xl border border-border space-y-2">
                <div className="font-semibold text-text-base flex items-center gap-1.5 font-mono uppercase text-[11px]">
                  <Globe className="h-4 w-4 text-accent" />
                  <span>CORS & Client Compatibility</span>
                </div>
                <p className="text-text-muted leading-relaxed">
                  {api.cors_supported
                    ? 'Cross-Origin Resource Sharing (CORS) is enabled. You can invoke this service directly from client-side vanilla JavaScript, React, or Vue without requiring an intermediary backend proxy.'
                    : 'CORS is restricted on the upstream server. Browser clients should route calls through a backend server or serverless proxy to avoid cross-origin request blocking.'}
                </p>
              </div>
            </div>
          </div>

          {api.documentation_url && (
            <div className="pt-3 border-t border-border">
              <a
                href={api.documentation_url}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-surface-elevated hover:bg-surface-hover text-xs font-medium text-accent border border-border hover:border-accent/40 transition-colors"
              >
                <span>Visit Upstream Developer Portal & Documentation</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quickstart SDKs & Client Integration Section */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-text-base flex items-center gap-2">
              <Terminal className="h-4 w-4 text-accent" />
              <span>Quickstart SDK & Client Integration</span>
            </h3>
            <p className="text-xs text-text-muted">
              Copy ready-to-run client integration code in your preferred programming language.
            </p>
          </div>

          {/* Language Selector Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { id: 'js', label: 'Fetch (Browser/Node)' },
                { id: 'axios', label: 'Axios' },
                { id: 'python', label: 'Python (requests)' },
                { id: 'curl', label: 'cURL' }
              ] as const
            ).map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedSdkLang(lang.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors border cursor-pointer ${
                  selectedSdkLang === lang.id
                    ? 'bg-accent text-background border-accent font-bold'
                    : 'bg-surface-elevated border-border text-text-muted hover:text-text-base'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden border border-border bg-[#0d1117]">
          <CodeSnippetViewer
            code={currentSnippet}
            language={selectedSdkLang === 'curl' ? 'curl' : selectedSdkLang === 'python' ? 'python' : 'js'}
            showLineNumbers
            showCopyButton
            maxHeight="320px"
          />
        </div>
      </div>
    </div>
  );
};

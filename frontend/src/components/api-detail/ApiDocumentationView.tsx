import React, { useState } from 'react';
import { ApiItem } from '../../types/api';
import { getFullApiDocumentation, ApiEndpointDoc } from '../../utils/apiDocumentationData';
import {
  Globe,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Play,
  ChevronDown,
  ChevronRight,
  Code2,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Terminal
} from 'lucide-react';
import { useToast } from '../../utils/useToast';

interface ApiDocumentationViewProps {
  api: ApiItem;
  onSelectEndpointForPlayground?: (
    endpoint: string,
    method: string,
    params?: Record<string, string>,
    body?: string
  ) => void;
}

export const ApiDocumentationView: React.FC<ApiDocumentationViewProps> = ({
  api,
  onSelectEndpointForPlayground
}) => {
  const { success } = useToast();
  const doc = getFullApiDocumentation(api);

  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(
    doc.endpoints[0]?.id || null
  );
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);
  const [copiedPayloadId, setCopiedPayloadId] = useState<string | null>(null);

  const availableMethods = Array.from(new Set(doc.endpoints.map((e) => e.method)));

  const filteredEndpoints = doc.endpoints.filter((ep) => {
    if (methodFilter === 'ALL') return true;
    return ep.method === methodFilter;
  });

  const handleCopy = (text: string, cb: () => void) => {
    navigator.clipboard.writeText(text);
    cb();
    success('Copied to clipboard');
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'POST':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'PUT':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PATCH':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'DELETE':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Endpoints & Methods Section */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-text-base flex items-center gap-2">
              <Globe className="h-5 w-5 text-accent" />
              <span>Available Endpoints</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border font-mono font-normal">
                {doc.endpoints.length}
              </span>
            </h2>
            <p className="text-xs text-text-muted">
              Target URL paths, parameters, and query options supported by {api.name}.
            </p>
          </div>

          {availableMethods.length > 1 && (
            <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMethodFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  methodFilter === 'ALL'
                    ? 'bg-surface text-text-base shadow-sm font-bold'
                    : 'text-text-muted hover:text-text-base'
                }`}
              >
                ALL
              </button>
              {availableMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                    methodFilter === m
                      ? 'bg-surface text-text-base shadow-sm font-bold'
                      : 'text-text-muted hover:text-text-base'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Endpoints List */}
        <div className="space-y-3">
          {filteredEndpoints.map((ep) => {
            const isExpanded = expandedEndpointId === ep.id;
            return (
              <div
                key={ep.id}
                className={`rounded-xl border transition-all ${
                  isExpanded
                    ? 'bg-surface-elevated/70 border-accent/40 shadow-sm'
                    : 'bg-surface-elevated/30 border-border hover:border-border-light'
                }`}
              >
                {/* Endpoint Header Row */}
                <div
                  onClick={() => setExpandedEndpointId(isExpanded ? null : ep.id)}
                  className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border uppercase flex-shrink-0 ${getMethodBadgeClass(
                        ep.method
                      )}`}
                    >
                      {ep.method}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs font-mono font-semibold text-text-base truncate">
                          {ep.path}
                        </code>
                        {ep.summary && (
                          <span className="text-xs text-text-muted truncate hidden sm:inline">
                            — {ep.summary}
                          </span>
                        )}
                      </div>
                      {ep.summary && (
                        <div className="text-[11px] font-mono text-text-muted truncate sm:hidden">
                          {ep.summary}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onSelectEndpointForPlayground && (
                      <button
                        type="button"
                        onClick={() => {
                          const queryMap: Record<string, string> = {};
                          ep.queryParams.forEach((p) => {
                            if (p.defaultValue) queryMap[p.name] = p.defaultValue;
                          });
                          onSelectEndpointForPlayground(
                            ep.path,
                            ep.method,
                            queryMap,
                            ep.requestBody?.samplePayload
                          );
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-background text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                        title="Load into interactive playground"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Try Endpoint</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(ep.fullUrl, () => {
                          setCopiedUrlId(ep.id);
                          setTimeout(() => setCopiedUrlId(null), 2000);
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated text-xs font-mono text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
                      title="Copy full URL"
                    >
                      {copiedUrlId === ep.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span className="text-[11px]">URL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(`curl -X ${ep.method} "${ep.fullUrl}"`, () => {
                          setCopiedCurlId(ep.id);
                          setTimeout(() => setCopiedCurlId(null), 2000);
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface hover:bg-surface-elevated text-xs font-mono text-text-muted hover:text-text-base border border-border transition-colors cursor-pointer"
                      title="Copy ready cURL"
                    >
                      {copiedCurlId === ep.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Terminal className="h-3 w-3 text-accent" />
                      )}
                      <span className="text-[11px]">cURL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpandedEndpointId(isExpanded ? null : ep.id)}
                      className="p-1 text-text-muted hover:text-text-base cursor-pointer"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Endpoint Details */}
                {isExpanded && (
                  <div className="p-4 pt-2 border-t border-border/70 space-y-4 text-xs">
                    {ep.description && (
                      <p className="text-text-muted leading-relaxed">{ep.description}</p>
                    )}

                    <div className="bg-surface p-3 rounded-xl border border-border space-y-1">
                      <span className="text-[10px] font-mono uppercase text-text-muted font-bold">
                        Full Resolved Endpoint URL:
                      </span>
                      <div className="font-mono text-emerald-500 dark:text-emerald-400 text-xs break-all select-all">
                        {ep.fullUrl}
                      </div>
                    </div>

                    {/* Path Parameters */}
                    {ep.pathParams.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono uppercase font-bold text-text-muted">
                          Path Parameters
                        </span>
                        <div className="bg-surface rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-left font-mono text-xs">
                            <thead className="bg-surface-elevated text-text-muted border-b border-border">
                              <tr>
                                <th className="py-2 px-3 font-semibold">Parameter</th>
                                <th className="py-2 px-3 font-semibold">Type</th>
                                <th className="py-2 px-3 font-semibold">Sample</th>
                                <th className="py-2 px-3 font-semibold">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-text-base">
                              {ep.pathParams.map((param, idx) => (
                                <tr key={idx} className="hover:bg-surface-hover/50">
                                  <td className="py-2 px-3 text-accent font-bold">
                                    {`{${param.name}}`}
                                  </td>
                                  <td className="py-2 px-3 text-text-muted">{param.type}</td>
                                  <td className="py-2 px-3 text-emerald-500 dark:text-emerald-400">{param.example}</td>
                                  <td className="py-2 px-3 text-text-muted font-sans">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Query Parameters */}
                    {ep.queryParams.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono uppercase font-bold text-text-muted">
                          Query Parameters (?key=value)
                        </span>
                        <div className="bg-surface rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-left font-mono text-xs">
                            <thead className="bg-surface-elevated text-text-muted border-b border-border">
                              <tr>
                                <th className="py-2 px-3 font-semibold">Parameter</th>
                                <th className="py-2 px-3 font-semibold">Type</th>
                                <th className="py-2 px-3 font-semibold">Default</th>
                                <th className="py-2 px-3 font-semibold">Required</th>
                                <th className="py-2 px-3 font-semibold">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60 text-text-base">
                              {ep.queryParams.map((param, idx) => (
                                <tr key={idx} className="hover:bg-surface-hover/50">
                                  <td className="py-2 px-3 text-accent font-bold">{param.name}</td>
                                  <td className="py-2 px-3 text-text-muted">{param.type}</td>
                                  <td className="py-2 px-3 text-emerald-500 dark:text-emerald-400 font-mono">
                                    {param.defaultValue || '—'}
                                  </td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                        param.required
                                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 font-bold'
                                          : 'bg-surface-elevated text-text-muted border-border'
                                      }`}
                                    >
                                      {param.required ? 'Required' : 'Optional'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-text-muted font-sans">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Request Body (if POST/PUT) */}
                    {ep.requestBody && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono uppercase font-bold text-text-muted">
                            Request Body ({ep.requestBody.contentType})
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(ep.requestBody?.samplePayload || '', () => {
                                setCopiedPayloadId(ep.id);
                                setTimeout(() => setCopiedPayloadId(null), 2000);
                              })
                            }
                            className="text-[11px] text-accent hover:underline flex items-center gap-1 font-mono cursor-pointer"
                          >
                            {copiedPayloadId === ep.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            <span>Copy JSON</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-xl bg-surface border border-border font-mono text-[11px] text-sky-400 overflow-x-auto leading-relaxed">
                          {ep.requestBody.samplePayload}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Authentication & Access Guide */}
      <div className="bg-surface border border-border rounded-2xl p-6 sm:p-7 space-y-5 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-text-base flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-amber-400" />
              <span>Authentication & Access Credentials</span>
            </h3>
            <p className="text-xs text-text-muted">
              Identity verification and authorization requirements for {api.name}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                doc.auth.type === 'none'
                  ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
                  : doc.auth.type === 'api_key'
                  ? 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/30'
                  : 'bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/30'
              }`}
            >
              {doc.auth.type === 'none' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              <span>{doc.auth.title}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3 p-4 bg-surface-elevated/40 rounded-xl border border-border">
            <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-text-base flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>How It Works</span>
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">{doc.auth.description}</p>
            <ol className="space-y-2 text-xs text-text-base pt-1">
              {doc.auth.instructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-4 h-4 rounded-full bg-accent/15 text-accent font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3 p-4 bg-surface-elevated/40 rounded-xl border border-border flex flex-col justify-between">
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider font-semibold text-text-base flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-accent" />
                <span>Security Guidelines</span>
              </h4>
              <ul className="space-y-2 text-xs text-text-muted">
                {doc.auth.securityBestPractices.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold mt-0.5">•</span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {doc.auth.docUrl && (
              <a
                href={doc.auth.docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-surface hover:bg-surface-elevated text-xs font-medium text-accent border border-border hover:border-accent/40 transition-colors w-full mt-2"
              >
                <span>Upstream Developer Documentation</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

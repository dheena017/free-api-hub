import React, { useState, useMemo } from 'react';
import { ApiItem } from '../types/api';
import {
  getFullApiDocumentation,
  ApiEndpointDoc,
  ErrorCodeDoc,
  STANDARD_ERROR_CODES
} from '../utils/apiDocumentationData';
import {
  SUPPORTED_LANGUAGES,
  SnippetLanguage,
  generateSnippetForLanguage
} from '../utils/codeSnippets';
import {
  Globe,
  KeyRound,
  Sliders,
  FileCode,
  ShieldCheck,
  Terminal,
  Layers,
  Copy,
  Check,
  ExternalLink,
  Play,
  Download,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Gauge,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  ServerCrash
} from 'lucide-react';
import { useToast } from '../utils/useToast';

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
  const doc = useMemo(() => getFullApiDocumentation(api), [api]);

  // Active section scroll / navigation
  const [activeSection, setActiveSection] = useState<string>('endpoints');

  // Pillar 1: Method filter
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [expandedEndpointId, setExpandedEndpointId] = useState<string | null>(
    doc.endpoints[0]?.id || null
  );

  // Pillar 2: Live Credential Key input test
  const [userApiKey, setUserApiKey] = useState<string>('fah_demo_key_99812');
  const [copiedAuthHeader, setCopiedAuthHeader] = useState<boolean>(false);

  // Pillar 3: Param active subtab
  const [paramSubtab, setParamSubtab] = useState<'path' | 'query' | 'body' | 'headers'>('query');

  // Pillar 4: Error codes filter
  const [errorFilter, setErrorFilter] = useState<'ALL' | '2xx' | '4xx' | '5xx'>('ALL');
  const [activeResponseTab, setActiveResponseTab] = useState<'success' | 'errors'>('success');

  // Pillar 5: Snippet language
  const [activeSnippetLang, setActiveSnippetLang] = useState<SnippetLanguage>('curl');
  const [copiedSnippet, setCopiedSnippet] = useState<boolean>(false);

  // Copy tracking states
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);
  const [copiedSuccessJson, setCopiedSuccessJson] = useState<boolean>(false);

  // Filtered endpoints
  const filteredEndpoints = useMemo(() => {
    if (methodFilter === 'ALL') return doc.endpoints;
    return doc.endpoints.filter((ep) => ep.method === methodFilter);
  }, [doc.endpoints, methodFilter]);

  // Filtered error codes
  const filteredErrors = useMemo(() => {
    if (errorFilter === 'ALL') return doc.errorCodes;
    if (errorFilter === '2xx') return doc.errorCodes.filter((c) => c.statusCode >= 200 && c.statusCode < 300);
    if (errorFilter === '4xx') return doc.errorCodes.filter((c) => c.statusCode >= 400 && c.statusCode < 500);
    if (errorFilter === '5xx') return doc.errorCodes.filter((c) => c.statusCode >= 500 && c.statusCode < 600);
    return doc.errorCodes;
  }, [doc.errorCodes, errorFilter]);

  // Active endpoint object for Pillar 3 & 5
  const activeEndpoint = useMemo(() => {
    return (
      doc.endpoints.find((ep) => ep.id === expandedEndpointId) ||
      doc.endpoints[0] ||
      null
    );
  }, [doc.endpoints, expandedEndpointId]);

  // Code snippet for active endpoint
  const activeSnippetCode = useMemo(() => {
    if (!activeEndpoint) return '';
    const queryMap: Record<string, string> = {};
    activeEndpoint.queryParams.forEach((p) => {
      if (p.defaultValue) queryMap[p.name] = p.defaultValue;
    });

    const headerMap: Record<string, string> = {};
    activeEndpoint.headers.forEach((h) => {
      headerMap[h.name] = h.value;
    });

    return generateSnippetForLanguage(
      activeSnippetLang,
      activeEndpoint.fullUrl,
      activeEndpoint.method,
      headerMap,
      queryMap,
      activeEndpoint.requestBody?.samplePayload
    );
  }, [activeEndpoint, activeSnippetLang]);

  const handleCopy = (text: string, cb: () => void) => {
    navigator.clipboard.writeText(text);
    cb();
    success('Copied to clipboard');
  };

  const scrollToPillar = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    <div className="w-full space-y-8">
      {/* 6-Pillar Sticky Navigation Bar */}
      <div className="sticky top-16 z-30 bg-[#28292A]/95 backdrop-blur-md border border-[#3C4043] rounded-2xl p-2.5 shadow-xl">
        <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-none text-xs">
          <div className="flex items-center gap-1.5 flex-nowrap min-w-max">
            <button
              onClick={() => scrollToPillar('pillar-endpoints')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 border ${
                activeSection === 'pillar-endpoints'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:text-white hover:bg-[#303134]'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>1. Endpoints & Methods</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono">
                {doc.endpoints.length}
              </span>
            </button>

            <button
              onClick={() => scrollToPillar('pillar-auth')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 border ${
                activeSection === 'pillar-auth'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:text-white hover:bg-[#303134]'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>2. Authentication</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-mono capitalize">
                {api.auth_type}
              </span>
            </button>

            <button
              onClick={() => scrollToPillar('pillar-params')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 border ${
                activeSection === 'pillar-params'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:text-white hover:bg-[#303134]'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>3. Parameters & Headers</span>
            </button>

            <button
              onClick={() => scrollToPillar('pillar-responses')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 border ${
                activeSection === 'pillar-responses'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:text-white hover:bg-[#303134]'
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>4. Responses & Errors</span>
            </button>

            <button
              onClick={() => scrollToPillar('pillar-snippets')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 border ${
                activeSection === 'pillar-snippets'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:text-white hover:bg-[#303134]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>5. Code & SDKs</span>
            </button>

            <button
              onClick={() => scrollToPillar('pillar-ratelimits')}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 border ${
                activeSection === 'pillar-ratelimits'
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                  : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:text-white hover:bg-[#303134]'
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>6. Rate Limits & SLA</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PILLAR 1: AVAILABLE ENDPOINTS & METHODS */}
      {/* ========================================================================= */}
      <section
        id="pillar-endpoints"
        className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 sm:p-7 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#8AB4F8]/10 text-[#8AB4F8] font-bold flex items-center justify-center text-xs">
                1
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="h-5 w-5 text-[#8AB4F8]" />
                <span>Available Endpoints & Methods</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              The target URL paths and HTTP action methods supported by {api.name}.
            </p>
          </div>

          {/* HTTP Method Filters */}
          <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-1 rounded-xl border border-[#3C4043] self-start sm:self-auto">
            {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
              <button
                key={m}
                onClick={() => setMethodFilter(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                  methodFilter === m
                    ? 'bg-[#303134] text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* HTTP Methods Reference Guide Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#1F1F1F] border border-emerald-500/20 space-y-1">
            <div className="font-mono font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px]">GET</span>
              <span>Retrieve Data</span>
            </div>
            <p className="text-[11px] text-slate-400">Safe, idempotent queries to fetch resource details or lists.</p>
          </div>

          <div className="p-3 rounded-xl bg-[#1F1F1F] border border-sky-500/20 space-y-1">
            <div className="font-mono font-bold text-sky-400 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-[10px]">POST</span>
              <span>Create New Data</span>
            </div>
            <p className="text-[11px] text-slate-400">Submit JSON body payload to create a new entity or trigger actions.</p>
          </div>

          <div className="p-3 rounded-xl bg-[#1F1F1F] border border-amber-500/20 space-y-1">
            <div className="font-mono font-bold text-amber-400 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[10px]">PUT / PATCH</span>
              <span>Update Data</span>
            </div>
            <p className="text-[11px] text-slate-400">Modify or apply partial delta updates to existing records.</p>
          </div>

          <div className="p-3 rounded-xl bg-[#1F1F1F] border border-rose-500/20 space-y-1">
            <div className="font-mono font-bold text-rose-400 flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-[10px]">DELETE</span>
              <span>Remove Data</span>
            </div>
            <p className="text-[11px] text-slate-400">Permanently delete or revoke access to a specific resource by ID.</p>
          </div>
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
                    ? 'bg-[#1F1F1F] border-[#8AB4F8]/60 shadow-md'
                    : 'bg-[#1F1F1F] border-[#3C4043] hover:border-[#5F6368]'
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
                        <code className="text-xs font-mono font-semibold text-white truncate">
                          {ep.path}
                        </code>
                        <span className="text-xs text-slate-400 truncate hidden sm:inline">
                          — {ep.summary}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate sm:hidden">
                        {ep.summary}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {onSelectEndpointForPlayground && (
                      <button
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
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] text-xs font-semibold transition-colors"
                        title="Load this endpoint into interactive playground"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        <span>Try Endpoint</span>
                      </button>
                    )}

                    <button
                      onClick={() =>
                        handleCopy(ep.fullUrl, () => {
                          setCopiedUrlId(ep.id);
                          setTimeout(() => setCopiedUrlId(null), 2000);
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#303134] text-xs font-mono text-slate-300 border border-[#3C4043] transition-colors"
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
                      onClick={() =>
                        handleCopy(`curl -X ${ep.method} "${ep.fullUrl}"`, () => {
                          setCopiedCurlId(ep.id);
                          setTimeout(() => setCopiedCurlId(null), 2000);
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#28292A] hover:bg-[#303134] text-xs font-mono text-slate-300 border border-[#3C4043] transition-colors"
                      title="Copy ready cURL"
                    >
                      {copiedCurlId === ep.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Terminal className="h-3 w-3 text-[#8AB4F8]" />
                      )}
                      <span className="text-[11px]">cURL</span>
                    </button>

                    <button
                      onClick={() => setExpandedEndpointId(isExpanded ? null : ep.id)}
                      className="p-1 text-slate-400 hover:text-white"
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
                  <div className="p-4 pt-1 border-t border-[#3C4043]/60 space-y-4 text-xs">
                    <p className="text-slate-300 leading-relaxed">{ep.description}</p>

                    <div className="bg-[#18191A] p-3 rounded-xl border border-[#3C4043] space-y-1">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">
                        Full Resolved URL:
                      </span>
                      <div className="font-mono text-emerald-400 text-xs break-all select-all">
                        {ep.fullUrl}
                      </div>
                    </div>

                    {/* Path Parameters (if any) */}
                    {ep.pathParams.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                          <span>Path Variables:</span>
                        </span>
                        <div className="bg-[#18191A] rounded-xl border border-[#3C4043] overflow-hidden">
                          <table className="w-full text-left font-mono text-xs">
                            <thead className="bg-[#28292A] text-slate-400 border-b border-[#3C4043]">
                              <tr>
                                <th className="py-2 px-3">Variable</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3">Sample</th>
                                <th className="py-2 px-3">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3C4043]/50 text-slate-300">
                              {ep.pathParams.map((param, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 text-[#8AB4F8] font-bold">
                                    {`{${param.name}}`}
                                  </td>
                                  <td className="py-2 px-3 text-slate-400">{param.type}</td>
                                  <td className="py-2 px-3 text-emerald-400">{param.example}</td>
                                  <td className="py-2 px-3 text-slate-300 font-sans">{param.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Query Parameters (if any) */}
                    {ep.queryParams.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-mono uppercase font-bold text-slate-400">
                          Query Parameters (?key=value):
                        </span>
                        <div className="bg-[#18191A] rounded-xl border border-[#3C4043] overflow-hidden">
                          <table className="w-full text-left font-mono text-xs">
                            <thead className="bg-[#28292A] text-slate-400 border-b border-[#3C4043]">
                              <tr>
                                <th className="py-2 px-3">Parameter</th>
                                <th className="py-2 px-3">Type</th>
                                <th className="py-2 px-3">Default</th>
                                <th className="py-2 px-3">Required</th>
                                <th className="py-2 px-3">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#3C4043]/50 text-slate-300">
                              {ep.queryParams.map((param, idx) => (
                                <tr key={idx}>
                                  <td className="py-2 px-3 text-[#8AB4F8] font-bold">{param.name}</td>
                                  <td className="py-2 px-3 text-slate-400">{param.type}</td>
                                  <td className="py-2 px-3 text-emerald-400">{param.defaultValue || '—'}</td>
                                  <td className="py-2 px-3">
                                    <span
                                      className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                        param.required
                                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold'
                                          : 'bg-slate-800 text-slate-400 border-slate-700'
                                      }`}
                                    >
                                      {param.required ? 'Required' : 'Optional'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 font-sans">{param.description}</td>
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
                          <span className="text-[11px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1.5">
                            <span>Request Body Payload ({ep.requestBody.contentType}):</span>
                          </span>
                          <button
                            onClick={() => handleCopy(ep.requestBody?.samplePayload || '', () => {})}
                            className="text-[10px] text-[#8AB4F8] hover:underline flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy Payload</span>
                          </button>
                        </div>
                        <pre className="p-3 rounded-xl bg-[#18191A] border border-[#3C4043] font-mono text-[11px] text-sky-300 overflow-x-auto">
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
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 2: AUTHENTICATION DETAILS */}
      {/* ========================================================================= */}
      <section
        id="pillar-auth"
        className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 sm:p-7 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-400/10 text-amber-400 font-bold flex items-center justify-center text-xs">
                2
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <span>Authentication Details & Credentials</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Identity verification, authorization protocols, and how to format credential headers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${
                doc.auth.type === 'none'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : doc.auth.type === 'api_key'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              }`}
            >
              {doc.auth.type === 'none' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              <span>{doc.auth.title}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Instructions Box */}
          <div className="bg-[#1F1F1F] p-5 rounded-xl border border-[#3C4043] space-y-4">
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>How to Authenticate</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">{doc.auth.description}</p>
            </div>

            <ol className="space-y-2.5 text-xs text-slate-300">
              {doc.auth.instructions.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-[#28292A] p-2.5 rounded-lg border border-[#3C4043]/60">
                  <span className="w-5 h-5 rounded-full bg-[#8AB4F8]/20 text-[#8AB4F8] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            {doc.auth.docUrl && (
              <a
                href={doc.auth.docUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#8AB4F8] hover:underline font-medium"
              >
                <span>Register for Developer Keys on Official Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Interactive Credential Header Generator */}
          <div className="bg-[#1F1F1F] p-5 rounded-xl border border-[#3C4043] space-y-4">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Code2 className="h-4 w-4 text-[#8AB4F8]" />
              <span>Interactive Request Header Preview</span>
            </h3>

            {doc.auth.type === 'none' ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Zero Authorization Headers Required</span>
                </div>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  This endpoint allows open public requests. You do not need to attach any Authorization,
                  Bearer, or API key header. All calls will succeed immediately without credentials.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">
                    Test your key in header generator:
                  </label>
                  <input
                    type="text"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="Enter your API key or token..."
                    className="w-full bg-[#28292A] border border-[#3C4043] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:border-[#8AB4F8] focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Generated HTTP Header:</span>
                    <button
                      onClick={() => {
                        const headerStr =
                          doc.auth.type === 'api_key'
                            ? `x-api-key: ${userApiKey || 'YOUR_KEY'}`
                            : `Authorization: Bearer ${userApiKey || 'YOUR_TOKEN'}`;
                        handleCopy(headerStr, () => {
                          setCopiedAuthHeader(true);
                          setTimeout(() => setCopiedAuthHeader(false), 2000);
                        });
                      }}
                      className="text-[#8AB4F8] hover:underline flex items-center gap-1"
                    >
                      {copiedAuthHeader ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>Copy Header</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-[#18191A] border border-[#3C4043] font-mono text-xs text-emerald-400 overflow-x-auto">
                    {doc.auth.type === 'api_key'
                      ? `x-api-key: ${userApiKey || 'YOUR_API_KEY'}`
                      : `Authorization: Bearer ${userApiKey || 'YOUR_ACCESS_TOKEN'}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Security Checklist */}
            <div className="space-y-2 pt-2 border-t border-[#3C4043]/60">
              <span className="text-[11px] font-mono uppercase text-slate-400 font-bold flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span>Security Guidelines:</span>
              </span>
              <ul className="space-y-1 text-[11px] text-slate-400">
                {doc.auth.securityBestPractices.map((rec, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 3: REQUEST PARAMETERS & HEADERS */}
      {/* ========================================================================= */}
      <section
        id="pillar-params"
        className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 sm:p-7 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-sky-400/10 text-sky-400 font-bold flex items-center justify-center text-xs">
                3
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-sky-400" />
                <span>Request Parameters & Headers</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Path parameters, query parameters, JSON request bodies, and required HTTP headers.
            </p>
          </div>

          {/* Subtab Switcher */}
          <div className="flex items-center gap-1 bg-[#1F1F1F] p-1 rounded-xl border border-[#3C4043]">
            <button
              onClick={() => setParamSubtab('path')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                paramSubtab === 'path'
                  ? 'bg-[#303134] text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Path Params
            </button>
            <button
              onClick={() => setParamSubtab('query')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                paramSubtab === 'query'
                  ? 'bg-[#303134] text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Query Params
            </button>
            <button
              onClick={() => setParamSubtab('body')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                paramSubtab === 'body'
                  ? 'bg-[#303134] text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Request Body
            </button>
            <button
              onClick={() => setParamSubtab('headers')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                paramSubtab === 'headers'
                  ? 'bg-[#303134] text-white font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Headers
            </button>
          </div>
        </div>

        {/* Selected Endpoint Context Notice */}
        {activeEndpoint && (
          <div className="p-3 bg-[#1F1F1F] rounded-xl border border-[#3C4043] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 truncate">
              <span className="text-slate-400">Specifying for:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getMethodBadgeClass(activeEndpoint.method)}`}>
                {activeEndpoint.method}
              </span>
              <span className="text-white font-semibold truncate">{activeEndpoint.path}</span>
            </div>
            <span className="text-slate-500 text-[11px] hidden sm:inline">{activeEndpoint.summary}</span>
          </div>
        )}

        {/* 1. Path Parameters */}
        {paramSubtab === 'path' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              <p>
                <strong>Path parameters</strong> are variable placeholders built directly into the URI string
                (e.g., <code className="text-[#8AB4F8] font-mono">/users/{'{user_id}'}</code> or{' '}
                <code className="text-[#8AB4F8] font-mono">/products/{'{id}'}</code>). They identify a specific
                resource entity.
              </p>
            </div>

            {activeEndpoint && activeEndpoint.pathParams.length > 0 ? (
              <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#18191A] text-slate-400 border-b border-[#3C4043]">
                    <tr>
                      <th className="py-2.5 px-4">Parameter</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Required</th>
                      <th className="py-2.5 px-4">Example Value</th>
                      <th className="py-2.5 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3C4043]/60 text-slate-300">
                    {activeEndpoint.pathParams.map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#28292A]/50">
                        <td className="py-2.5 px-4 text-[#8AB4F8] font-bold">{`{${p.name}}`}</td>
                        <td className="py-2.5 px-4 text-slate-400">{p.type}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold">
                            Required
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400">{p.example}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-300">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-[#1F1F1F] rounded-xl border border-[#3C4043] text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>
                  This endpoint uses a static collection URI path. No dynamic path variables are required to query this base URL.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 2. Query Parameters */}
        {paramSubtab === 'query' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              <p>
                <strong>Query parameters</strong> are key-value pairs appended after the question mark in a URL
                (e.g., <code className="text-[#8AB4F8] font-mono">?limit=10&status=active</code>) used to filter, sort,
                paginate, or shape the response collection.
              </p>
            </div>

            {activeEndpoint && activeEndpoint.queryParams.length > 0 ? (
              <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#18191A] text-slate-400 border-b border-[#3C4043]">
                    <tr>
                      <th className="py-2.5 px-4">Parameter</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4">Requirement</th>
                      <th className="py-2.5 px-4">Default Value</th>
                      <th className="py-2.5 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3C4043]/60 text-slate-300">
                    {activeEndpoint.queryParams.map((q, idx) => (
                      <tr key={idx} className="hover:bg-[#28292A]/50">
                        <td className="py-2.5 px-4 text-[#8AB4F8] font-bold select-all">{q.name}</td>
                        <td className="py-2.5 px-4 text-slate-400">{q.type}</td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] border ${
                              q.required
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {q.required ? 'Required' : 'Optional'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-emerald-400 select-all">{q.defaultValue || 'None'}</td>
                        <td className="py-2.5 px-4 font-sans text-slate-300">{q.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 bg-[#1F1F1F] rounded-xl border border-[#3C4043] text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>
                  Zero mandatory query parameters. This endpoint responds with default data out of the box.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. Request Body */}
        {paramSubtab === 'body' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              <p>
                <strong>Request Body</strong> contains the structured JSON payload transmitted along with HTTP{' '}
                <code className="text-sky-400 font-mono">POST</code>, <code className="text-amber-400 font-mono">PUT</code>, or{' '}
                <code className="text-purple-400 font-mono">PATCH</code> requests to create or update resources.
              </p>
            </div>

            {activeEndpoint?.requestBody ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-slate-400 flex items-center gap-2">
                    <span>MIME Type:</span>
                    <span className="px-2 py-0.5 rounded bg-[#18191A] text-emerald-400 border border-[#3C4043]">
                      {activeEndpoint.requestBody.contentType}
                    </span>
                  </span>
                  <button
                    onClick={() => handleCopy(activeEndpoint.requestBody?.samplePayload || '', () => {})}
                    className="inline-flex items-center gap-1 text-xs text-[#8AB4F8] hover:underline"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy JSON Body</span>
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-[#18191A] border border-[#3C4043] font-mono text-xs text-sky-300 overflow-x-auto leading-relaxed">
                  {activeEndpoint.requestBody.samplePayload}
                </pre>
              </div>
            ) : (
              <div className="p-4 bg-[#1F1F1F] rounded-xl border border-[#3C4043] text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>
                  HTTP GET requests transmit zero body payloads. Query constraints are passed via URL query strings.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 4. Request Headers */}
        {paramSubtab === 'headers' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-300">
              <p>
                <strong>Request Headers</strong> provide essential transport metadata including expected response serialization,
                client user agents, content types, and authorization credentials.
              </p>
            </div>

            <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[#18191A] text-slate-400 border-b border-[#3C4043]">
                  <tr>
                    <th className="py-2.5 px-4">Header Key</th>
                    <th className="py-2.5 px-4">Value</th>
                    <th className="py-2.5 px-4">Requirement</th>
                    <th className="py-2.5 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3C4043]/60 text-slate-300">
                  {activeEndpoint?.headers.map((h, idx) => (
                    <tr key={idx} className="hover:bg-[#28292A]/50">
                      <td className="py-2.5 px-4 text-[#8AB4F8] font-bold select-all">{h.name}</td>
                      <td className="py-2.5 px-4 text-emerald-400 select-all">{h.value}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                          {h.required ? 'Mandatory' : 'Recommended'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-300">{h.description}</td>
                    </tr>
                  ))}
                  <tr className="hover:bg-[#28292A]/50">
                    <td className="py-2.5 px-4 text-[#8AB4F8] font-bold">User-Agent</td>
                    <td className="py-2.5 px-4 text-slate-400 italic">FreeApiHub/1.0 (or standard browser)</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                        Optional
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">Identifies the client software to the upstream host</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 4: RESPONSE DATA & FORMATS */}
      {/* ========================================================================= */}
      <section
        id="pillar-responses"
        className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 sm:p-7 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-400/10 text-emerald-400 font-bold flex items-center justify-center text-xs">
                4
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCode className="h-5 w-5 text-emerald-400" />
                <span>Response Data & Formats</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Expected success data payloads and complete HTTP error status codes and resolution guide.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#1F1F1F] p-1 rounded-xl border border-[#3C4043]">
            <button
              onClick={() => setActiveResponseTab('success')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeResponseTab === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              200 OK Success Schema
            </button>
            <button
              onClick={() => setActiveResponseTab('errors')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeResponseTab === 'errors'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Error Matrix ({STANDARD_ERROR_CODES.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Success Payload Preview */}
        {activeResponseTab === 'success' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                  HTTP 200 OK
                </span>
                <span className="text-slate-300">Structured Response Payload (application/json)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const jsonStr = JSON.stringify(activeEndpoint?.successResponse.samplePayload || {}, null, 2);
                    handleCopy(jsonStr, () => {
                      setCopiedSuccessJson(true);
                      setTimeout(() => setCopiedSuccessJson(false), 2000);
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1F1F1F] hover:bg-[#303134] text-xs font-mono text-slate-300 border border-[#3C4043] transition-colors"
                >
                  {copiedSuccessJson ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>Copy JSON</span>
                </button>
              </div>
            </div>

            <pre className="p-4 rounded-xl bg-[#18191A] border border-[#3C4043] font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed max-h-96">
              {JSON.stringify(activeEndpoint?.successResponse.samplePayload || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* Tab 2: Error Codes & Messages Matrix */}
        {activeResponseTab === 'errors' && (
          <div className="space-y-4">
            {/* Filter by error family */}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-slate-400 font-mono mr-2">Filter Status:</span>
              {(['ALL', '2xx', '4xx', '5xx'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setErrorFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-xs transition-colors border ${
                    errorFilter === filter
                      ? 'bg-[#8AB4F8] text-[#1F1F1F] font-bold border-[#8AB4F8]'
                      : 'bg-[#1F1F1F] text-slate-300 border-[#3C4043] hover:bg-[#303134]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#18191A] text-slate-400 border-b border-[#3C4043]">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Meaning</th>
                      <th className="py-2.5 px-4">Cause & Description</th>
                      <th className="py-2.5 px-4">Troubleshooting & Resolution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#3C4043]/60 text-slate-300">
                    {filteredErrors.map((err) => (
                      <tr key={err.statusCode} className="hover:bg-[#28292A]/50">
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded font-bold border text-[11px] ${
                              err.statusCode < 300
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : err.statusCode === 429
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : err.statusCode < 500
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                : 'bg-red-600/20 text-red-300 border-red-500/40'
                            }`}
                          >
                            {err.statusCode} {err.statusText}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-semibold">{err.statusText}</td>
                        <td className="py-3 px-4 text-slate-300 font-sans leading-relaxed">
                          {err.description}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-emerald-300/90 leading-relaxed">
                          {err.troubleshooting}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 5: CODE EXAMPLES & SDKS */}
      {/* ========================================================================= */}
      <section
        id="pillar-snippets"
        className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 sm:p-7 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-purple-400/10 text-purple-400 font-bold flex items-center justify-center text-xs">
                5
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Terminal className="h-5 w-5 text-purple-400" />
                <span>Code Examples & Official SDKs</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Ready-to-copy code snippets in popular languages and official developer SDK packages.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(activeSnippetCode, () => {
                setCopiedSnippet(true);
                setTimeout(() => setCopiedSnippet(false), 2000);
              })}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8AB4F8] hover:bg-[#A8C7FA] text-[#1F1F1F] text-xs font-semibold transition-colors"
            >
              {copiedSnippet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>Copy Code</span>
            </button>
          </div>
        </div>

        {/* Language Tabs Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => setActiveSnippetLang(lang.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-colors border ${
                activeSnippetLang === lang.id
                  ? 'bg-[#8AB4F8] text-[#1F1F1F] border-[#8AB4F8] font-bold shadow-sm'
                  : 'bg-[#1F1F1F] border-[#3C4043] text-slate-400 hover:text-white hover:bg-[#303134]'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Code Snippet Box */}
        <pre className="p-4 rounded-xl bg-[#18191A] border border-[#3C4043] font-mono text-xs text-slate-100 overflow-x-auto leading-relaxed max-h-96">
          {activeSnippetCode}
        </pre>

        {/* Official SDKs Ecosystem Cards */}
        <div className="space-y-3 pt-2 border-t border-[#3C4043]">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-[#8AB4F8]" />
            <span>Developer SDK Packages & Ecosystem</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {doc.sdks.map((sdk, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                    {sdk.language}
                  </div>
                  <div className="font-mono text-sm font-semibold text-white truncate">{sdk.name}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{sdk.packageManager}:</span>
                    <button
                      onClick={() => handleCopy(sdk.installCommand, () => {})}
                      className="text-[#8AB4F8] hover:underline flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                  <code className="block p-1.5 rounded bg-[#28292A] text-emerald-400 text-[11px] font-mono truncate select-all">
                    {sdk.installCommand}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* PILLAR 6: RATE LIMITS & GUIDELINES */}
      {/* ========================================================================= */}
      <section
        id="pillar-ratelimits"
        className="bg-[#28292A] rounded-2xl border border-[#3C4043] p-6 sm:p-7 space-y-6 shadow-md"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#3C4043]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-400/10 text-rose-400 font-bold flex items-center justify-center text-xs">
                6
              </span>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Gauge className="h-5 w-5 text-rose-400" />
                <span>Rate Limits & Production Guidelines</span>
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              Request quotas, throttling response headers, and high-volume reliability best practices.
            </p>
          </div>

          <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">
            Active Tier: {api.pricing_tier.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* Quota Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Per-Minute Quota:</span>
            <div className="text-sm font-bold text-white">{doc.rateLimits.requestsPerMinute}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Daily Allowance:</span>
            <div className="text-sm font-bold text-white">{doc.rateLimits.requestsPerDay}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Concurrent Calls:</span>
            <div className="text-sm font-bold text-emerald-400">{doc.rateLimits.concurrencyLimit}</div>
          </div>
          <div className="p-3.5 rounded-xl bg-[#1F1F1F] border border-[#3C4043] space-y-1">
            <span className="text-[10px] text-slate-400 uppercase">Burst Tolerance:</span>
            <div className="text-sm font-bold text-[#8AB4F8]">{doc.rateLimits.burstAllowance}</div>
          </div>
        </div>

        {/* Rate Limit HTTP Headers Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#8AB4F8]" />
            <span>Rate Limit Response Headers</span>
          </h3>

          <div className="bg-[#1F1F1F] rounded-xl border border-[#3C4043] overflow-hidden">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#18191A] text-slate-400 border-b border-[#3C4043]">
                <tr>
                  <th className="py-2.5 px-4">Header</th>
                  <th className="py-2.5 px-4">Example Value</th>
                  <th className="py-2.5 px-4">Purpose & Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3C4043]/60 text-slate-300">
                {doc.rateLimits.headers.map((hdr, idx) => (
                  <tr key={idx} className="hover:bg-[#28292A]/50">
                    <td className="py-2.5 px-4 text-[#8AB4F8] font-bold select-all">{hdr.header}</td>
                    <td className="py-2.5 px-4 text-emerald-400 font-bold select-all">{hdr.example}</td>
                    <td className="py-2.5 px-4 font-sans text-slate-300">{hdr.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Production Guidelines */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span>Developer Best Practice Guidelines</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            {doc.rateLimits.guidelines.map((guide, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#1F1F1F] border border-[#3C4043] flex items-start gap-2.5"
              >
                <span className="w-5 h-5 rounded-full bg-[#8AB4F8]/15 text-[#8AB4F8] font-bold flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{guide}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

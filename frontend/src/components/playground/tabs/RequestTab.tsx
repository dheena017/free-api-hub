import React, { useState } from 'react';
import {
  Send,
  Copy,
  Check,
  Play,
  SlidersHorizontal,
  FileText,
  Braces,
  KeyRound,
  Terminal,
  ArrowRight
} from 'lucide-react';
import { RequestAuthMode } from './AuthTab';
import { RequestTab as RequestTabType } from './PlaygroundTabsNav';
import { METHOD_STYLES } from '../Playground';

export interface RequestOverviewTabProps {
  method: string;
  endpointUrl: string;
  params: Array<{ key: string; value: string }>;
  headers: Array<{ key: string; value: string }>;
  requestBody: string;
  authType: RequestAuthMode;
  apiKeyName?: string;
  apiKeyValue?: string;
  apiKeyLocation?: 'header' | 'query';
  bearerToken?: string;
  basicUsername?: string;
  basicPassword?: string;
  curlSnippet: string;
  isLoading: boolean;
  onRunTest: () => void;
  onNavigateTab: (tab: RequestTabType) => void;
  onOpenAuthModal?: () => void;
}

export const RequestOverviewTab: React.FC<RequestOverviewTabProps> = ({
  method,
  endpointUrl,
  params,
  headers,
  requestBody,
  authType,
  apiKeyName,
  apiKeyValue,
  apiKeyLocation,
  bearerToken,
  basicUsername,
  curlSnippet,
  isLoading,
  onRunTest,
  onNavigateTab,
  onOpenAuthModal
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const methodStyle = METHOD_STYLES[method] || METHOD_STYLES.GET;
  const activeParams = params.filter((p) => p.key.trim() || p.value.trim());
  const activeHeaders = headers.filter((h) => h.key.trim() || h.value.trim());

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(endpointUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(curlSnippet);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Primary Request Overview Card */}
      <div className="bg-surface-elevated/40 border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span
              className={`text-xs uppercase font-bold px-2 py-1 rounded-md border shrink-0 ${methodStyle.bg} ${methodStyle.text} ${methodStyle.border}`}
            >
              {method}
            </span>
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <span className="text-text-base font-semibold truncate select-all">{endpointUrl}</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-text-muted hover:text-text-base p-1 rounded-md hover:bg-surface transition-colors cursor-pointer shrink-0"
                title="Copy Full URL"
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onRunTest}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-background font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{isLoading ? 'Executing...' : 'Send Request'}</span>
          </button>
        </div>
      </div>

      {/* Request Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
        {/* Card 1: Query Parameters */}
        <div className="bg-surface-elevated/30 border border-border rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-text-base">Query Parameters</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface text-text-muted">
                {activeParams.length}
              </span>
            </div>

            <div className="mt-2.5">
              {activeParams.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                  {activeParams.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-surface border border-border/50"
                    >
                      <span className="text-accent truncate font-semibold">{p.key}</span>
                      <span className="text-text-muted truncate select-all">{p.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted font-mono italic">No query parameters configured.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('params')}
            className="text-xs text-accent hover:underline flex items-center gap-1 pt-1 self-start font-medium cursor-pointer"
          >
            <span>Edit Parameters</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Card 2: Request Headers */}
        <div className="bg-surface-elevated/30 border border-border rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-text-base">Request Headers</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface text-text-muted">
                {activeHeaders.length}
              </span>
            </div>

            <div className="mt-2.5">
              {activeHeaders.length > 0 ? (
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                  {activeHeaders.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-surface border border-border/50"
                    >
                      <span className="text-accent truncate font-semibold">{h.key}</span>
                      <span className="text-text-muted truncate select-all">{h.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-muted font-mono italic">No custom request headers configured.</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('headers')}
            className="text-xs text-accent hover:underline flex items-center gap-1 pt-1 self-start font-medium cursor-pointer"
          >
            <span>Edit Headers</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Card 3: Authentication */}
        <div className="bg-surface-elevated/30 border border-border rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-text-base">Authentication</span>
              </div>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                  authType === 'none'
                    ? 'bg-surface text-text-muted'
                    : 'bg-emerald-500/10 text-emerald-400'
                }`}
              >
                {authType === 'none' ? 'None' : authType.toUpperCase()}
              </span>
            </div>

            <div className="mt-2.5 font-mono text-[11px] text-text-muted space-y-1">
              {authType === 'apiKey' ? (
                <p>
                  API Key: <span className="text-text-base font-semibold">{apiKeyName || 'X-API-Key'}</span> (
                  {apiKeyLocation === 'query' ? 'Query Param' : 'Header'})
                  {apiKeyValue ? ' • Configured' : ' • Key missing'}
                </p>
              ) : authType === 'bearer' ? (
                <p>
                  Bearer Token: {bearerToken ? '• Configured' : '• Token empty'}
                </p>
              ) : authType === 'basic' ? (
                <p>
                  Basic Auth: {basicUsername ? `${basicUsername}:••••` : '• Credentials empty'}
                </p>
              ) : (
                <p className="italic">No authentication required for this public endpoint.</p>
              )}
            </div>
          </div>

          {onOpenAuthModal && (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="text-xs text-accent hover:underline flex items-center gap-1 pt-1 self-start font-medium cursor-pointer"
            >
              <span>Configure API Credentials</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Card 4: Request Body */}
        <div className="bg-surface-elevated/30 border border-border rounded-xl p-3.5 space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Braces className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-text-base">Request Body</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface text-text-muted border border-border">
                {requestBody.trim() ? `${requestBody.trim().length} chars` : 'Empty'}
              </span>
            </div>

            <div className="mt-2.5 font-mono text-[11px]">
              {requestBody.trim() ? (
                <div className="bg-surface p-2 rounded border border-border/50 max-h-24 overflow-auto text-text-muted select-all">
                  <pre className="whitespace-pre-wrap">{requestBody.slice(0, 300)}{requestBody.length > 300 ? '...' : ''}</pre>
                </div>
              ) : (
                <p className="text-[11px] text-text-muted italic">No request body (common for GET queries).</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('body')}
            className="text-xs text-accent hover:underline flex items-center gap-1 pt-1 self-start font-medium cursor-pointer"
          >
            <span>Edit Request Body</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Outgoing cURL Command */}
      <div className="bg-surface-elevated/40 border border-border rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold text-text-base font-sans">Equivalent cURL Command</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCurl}
              className="text-xs text-text-muted hover:text-text-base flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border transition-colors cursor-pointer"
            >
              {copiedCurl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCurl ? 'Copied' : 'Copy cURL'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('snippets')}
              className="text-xs text-accent hover:underline flex items-center gap-1 font-sans cursor-pointer"
            >
              <span>More SDKs →</span>
            </button>
          </div>
        </div>

        <div className="bg-surface p-3 rounded-lg border border-border/60 overflow-x-auto text-[11px] text-text-base select-all">
          <pre className="font-mono whitespace-pre">{curlSnippet}</pre>
        </div>
      </div>
    </div>
  );
};
